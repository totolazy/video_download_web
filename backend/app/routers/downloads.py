"""Download routes: create, list, detail, SSE progress, file download, retry."""
import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import func, select

from app.core.auth import get_current_user
from app.database import async_session_factory, get_db
from app.models.cookie import Cookie
from app.models.download import Download
from app.models.user import User
from app.schemas.download import (
    DownloadCreate,
    DownloadListResponse,
    DownloadResponse,
)
from app.services.downloader import create_download_task

router = APIRouter(prefix="/api/downloads", tags=["downloads"])


@router.post("")
async def submit_download(
    body: DownloadCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Submit a new download task."""
    # Verify cookies exist for the platform
    result = await db.execute(
        select(Cookie).where(
            Cookie.user_id == current_user.id,
            Cookie.platform == body.platform,
        )
    )
    cookie = result.scalar_one_or_none()
    if cookie is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先上传该平台的 Cookies",
        )

    cookies_path = cookie.file_path
    if not Path(cookies_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先上传该平台的 Cookies",
        )

    download_id = await create_download_task(
        user_id=current_user.id,
        url=body.url,
        platform=body.platform,
        resolution=body.resolution,
        cookies_path=cookies_path,
    )

    return {"download_id": download_id}


@router.get("", response_model=DownloadListResponse)
async def list_downloads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """List the current user's downloads, newest first."""
    count_result = await db.execute(
        select(func.count(Download.id)).where(Download.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Download)
        .where(Download.user_id == current_user.id)
        .order_by(Download.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    downloads = result.scalars().all()

    return DownloadListResponse(
        items=[DownloadResponse.model_validate(d.to_dict()) for d in downloads],
        total=total,
    )


@router.get("/{download_id}", response_model=DownloadResponse)
async def get_download_detail(
    download_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single download's details."""
    download = await db.get(Download, download_id)
    if download is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="下载记录不存在"
        )
    if download.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="无权访问此下载记录"
        )
    return DownloadResponse.model_validate(download.to_dict())


@router.get("/{download_id}/progress")
async def download_progress(
    download_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """SSE endpoint that streams download progress updates."""

    async def event_generator():
        while True:
            if await request.is_disconnected():
                break

            async with async_session_factory() as db:
                download = await db.get(Download, download_id)
                if download is None or download.user_id != current_user.id:
                    yield f"data: {json.dumps({'error': '无权访问'})}\n\n"
                    break

                data = {
                    "progress": download.progress,
                    "status": download.status,
                    "file_name": download.file_name,
                    "file_size": download.file_size,
                    "error_message": download.error_message,
                }
                yield f"data: {json.dumps(data)}\n\n"

                if download.status in ("completed", "failed"):
                    break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{download_id}/file")
async def download_file(
    download_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Stream the completed video file to the client."""
    download = await db.get(Download, download_id)
    if download is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="下载记录不存在")
    if download.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问")

    if download.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="视频尚未下载完成")

    file_path = download.file_path
    if not file_path or not Path(file_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="视频文件已过期，请重新下载")

    return FileResponse(
        path=file_path,
        filename=download.file_name or "video.mp4",
        media_type="application/octet-stream",
    )


@router.post("/{download_id}/retry")
async def retry_download(
    download_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Retry a failed download by creating a new task with the same parameters."""
    download = await db.get(Download, download_id)
    if download is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="下载记录不存在")
    if download.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问")
    if download.status != "failed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只能重试失败的下载")

    # Verify cookies still exist
    result = await db.execute(
        select(Cookie).where(
            Cookie.user_id == current_user.id,
            Cookie.platform == download.platform,
        )
    )
    cookie = result.scalar_one_or_none()
    if cookie is None or not Path(cookie.file_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cookies 已过期，请重新上传后再试",
        )

    new_id = await create_download_task(
        user_id=current_user.id,
        url=download.url,
        platform=download.platform,
        resolution=download.resolution,
        cookies_path=cookie.file_path,
    )

    return {"download_id": new_id, "message": "已重新提交下载"}