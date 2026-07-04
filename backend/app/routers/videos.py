"""Video routes: URL platform detection and resolution listing."""
import asyncio, os, shutil, sys
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.core.auth import get_current_user
from app.database import get_db
from app.models.cookie import Cookie
from app.models.user import User
from app.schemas.video import (
    DetectRequest,
    DetectResponse,
    ResolutionOption,
    ResolutionsResponse,
)
from app.services.platform_detector import ALL_PLATFORMS, detect_platform

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/videos", tags=["videos"])

_FORMAT_LINE_RE = re.compile(
    r"^(?P<format_id>\S+)\s+(?P<ext>\S+)\s+(?P<resolution>\S+)"
)
_AUDIO_EXTS = frozenset({"m4a", "mp3", "aac", "opus", "ogg", "wav", "webm"})


def _is_audio_only(ext: str) -> bool:
    return ext.lower() in _AUDIO_EXTS


@router.post("/detect", response_model=DetectResponse)
async def detect(body: DetectRequest, _current_user: User = Depends(get_current_user)):
    """Detect the platform from a video URL."""
    platform = detect_platform(body.url)
    return DetectResponse(detected=platform, platforms=ALL_PLATFORMS)


@router.get("/resolutions", response_model=ResolutionsResponse)
async def resolutions(
    platform: str = Query(...),
    url: str = Query(...),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Fetch available resolutions for a video URL using yt-dlp -F. Timeout: 120s."""
    # Check cookies (DB first, then filesystem fallback)
    result = await db.execute(
        select(Cookie).where(
            Cookie.user_id == current_user.id,
            Cookie.platform == platform,
        )
    )
    cookie = result.scalar_one_or_none()

    if cookie is None:
        # Fallback: try filesystem
        from app.config import settings
        from pathlib import Path
        cookie_file = settings.COOKIES_DIR / current_user.username / platform / "cookies.txt"
        if cookie_file.exists():
            cookies_path = str(cookie_file)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请先上传该平台的 Cookies",
            )
    else:
        cookies_path = cookie.file_path

    process = None
    try:
        ytdlp = shutil.which("yt-dlp") or os.path.join(os.path.dirname(sys.executable), "yt-dlp.exe")
        process = await asyncio.create_subprocess_exec(
            ytdlp, "-F", url,
            "--cookies", cookies_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr_bytes = await asyncio.wait_for(
            process.communicate(), timeout=120
        )
    except asyncio.TimeoutError:
        if process is not None and process.returncode is None:
            try:
                process.kill()
                await process.wait()
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取分辨率超时（120秒），请检查网络或稍后重试",
        )
    except Exception as e:
        logger.exception("yt-dlp -F failed for platform=%s url=%s: %s", platform, url, e)
        if process is not None and process.returncode is None:
            try:
                process.kill()
                await process.wait()
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取分辨率失败：{str(e)[:200]}",
        )

    if process.returncode != 0:
        stderr_text = stderr_bytes.decode("utf-8", errors="replace")[:500]
        logger.warning("yt-dlp -F returned code=%d stderr=%s", process.returncode, stderr_text)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取分辨率失败：yt-dlp 返回错误，请检查 Cookies 是否有效",
        )

    # Parse yt-dlp -F output
    seen_descriptions: set[str] = set()
    resolution_list: list[ResolutionOption] = []

    for line in stdout.decode("utf-8", errors="replace").splitlines():
        match = _FORMAT_LINE_RE.match(line)
        if not match:
            continue
        format_id = match.group("format_id")
        ext = match.group("ext")
        if _is_audio_only(ext):
            continue
        parts = line.split(maxsplit=2)
        description = parts[2] if len(parts) >= 3 else f"{match.group('resolution')} {ext}"
        if description not in seen_descriptions:
            seen_descriptions.add(description)
            resolution_list.append(
                ResolutionOption(format_id=format_id, description=description)
            )

    if not resolution_list:
        resolution_list.append(
            ResolutionOption(format_id="best", description="默认最佳质量")
        )

    return ResolutionsResponse(resolutions=resolution_list)
