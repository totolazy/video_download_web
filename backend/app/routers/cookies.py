"""Cookie management routes: upload, status, delete."""
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select

from app.config import settings
from app.core.auth import get_current_user
from app.database import get_db
from app.models.cookie import Cookie
from app.models.user import User
from app.schemas.cookie import (
    CookieStatusItem,
    CookieStatusResponse,
    CookieUploadResponse,
)
from app.utils.file_utils import safe_path

router = APIRouter(prefix="/api/cookies", tags=["cookies"])


@router.get("/status", response_model=CookieStatusResponse)
async def cookie_status(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Return cookie status for all supported platforms."""
    result = await db.execute(
        select(Cookie).where(Cookie.user_id == current_user.id)
    )
    cookies = result.scalars().all()
    cookie_map: dict[str, Cookie] = {c.platform: c for c in cookies}

    status_map: dict[str, CookieStatusItem] = {}
    for platform in settings.SUPPORTED_PLATFORMS:
        cookie = cookie_map.get(platform)
        if cookie and Path(cookie.file_path).exists():
            status_map[platform] = CookieStatusItem(
                exists=True,
                uploaded_at=cookie.uploaded_at.isoformat() if cookie.uploaded_at else None,
                last_used_at=cookie.last_used_at.isoformat() if cookie.last_used_at else None,
            )
        else:
            # Check filesystem directly as fallback (defense against stale DB)
            fs_path = settings.COOKIES_DIR / current_user.username / platform / "cookies.txt"
            if fs_path.exists():
                status_map[platform] = CookieStatusItem(exists=True, uploaded_at=str(datetime.fromtimestamp(fs_path.stat().st_mtime, tz=timezone.utc)))
            else:
                status_map[platform] = CookieStatusItem(exists=False)

    return CookieStatusResponse(cookies=status_map)


@router.post("/upload", response_model=CookieUploadResponse)
async def upload_cookie(
    platform: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Upload a Netscape-format cookies.txt file for a platform."""
    if platform not in settings.SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的平台",
        )

    # Build safe path and create directory
    try:
        dir_path = safe_path(settings.COOKIES_DIR, current_user.username, platform)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    dir_path.mkdir(parents=True, exist_ok=True)
    file_path = dir_path / "cookies.txt"

    # Write file
    content = await file.read()
    file_path.write_bytes(content)

    # Upsert Cookie record
    result = await db.execute(
        select(Cookie).where(
            Cookie.user_id == current_user.id,
            Cookie.platform == platform,
        )
    )
    cookie = result.scalar_one_or_none()

    if cookie:
        cookie.file_path = str(file_path)
        cookie.uploaded_at = datetime.now(timezone.utc)
    else:
        cookie = Cookie(
            user_id=current_user.id,
            platform=platform,
            file_path=str(file_path),
        )
        db.add(cookie)

    await db.commit()

    return CookieUploadResponse(
        platform=platform,
        message=f"{platform} 的 Cookies 上传成功",
    )


@router.delete("/{platform}")
async def delete_cookie(
    platform: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a platform's cookies."""
    result = await db.execute(
        select(Cookie).where(
            Cookie.user_id == current_user.id,
            Cookie.platform == platform,
        )
    )
    cookie = result.scalar_one_or_none()
    if cookie is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到该平台的 Cookies",
        )

    # Delete file from disk
    cookie_path = Path(cookie.file_path)
    if cookie_path.exists():
        cookie_path.unlink()

    await db.delete(cookie)
    await db.commit()

    return {"message": f"{platform} 的 Cookies 已删除"}
