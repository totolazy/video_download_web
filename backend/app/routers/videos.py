"""Video routes: URL platform detection and resolution listing."""
import asyncio
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

router = APIRouter(prefix="/api/videos", tags=["videos"])

# yt-dlp -F output: format_id  extension  resolution  ...  description
# We match lines like: "22   mp4   1280x720   ..."
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
    """Fetch available resolutions for a video URL using yt-dlp -F."""
    # Check cookies
    result = await db.execute(
        select(Cookie).where(
            Cookie.user_id == current_user.id,
            Cookie.platform == platform,
        )
    )
    cookie = result.scalar_one_or_none()
    if cookie is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先上传该平台的 Cookies",
        )

    cookies_path = cookie.file_path

    try:
        process = await asyncio.create_subprocess_exec(
            "yt-dlp",
            "-F", url,
            "--cookies", cookies_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=30
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取分辨率超时，请稍后重试",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取分辨率失败，请稍后重试",
        )

    if process.returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取分辨率失败，请稍后重试",
        )

    # Parse yt-dlp -F output
    seen_descriptions: set[str] = set()
    resolutions: list[ResolutionOption] = []

    for line in stdout.decode("utf-8", errors="replace").splitlines():
        match = _FORMAT_LINE_RE.match(line)
        if not match:
            continue

        format_id = match.group("format_id")
        ext = match.group("ext")
        resolution_str = match.group("resolution")

        if _is_audio_only(ext):
            continue

        # Build description from the rest of the line after resolution
        parts = line.split(maxsplit=2)
        if len(parts) >= 3:
            description = parts[2]
        else:
            description = f"{resolution_str} {ext}"

        if description not in seen_descriptions:
            seen_descriptions.add(description)
            resolutions.append(
                ResolutionOption(format_id=format_id, description=description)
            )

    if not resolutions:
        resolutions.append(
            ResolutionOption(format_id="best", description="默认最佳质量")
        )

    return ResolutionsResponse(resolutions=resolutions)