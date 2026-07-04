"""Scheduled cleanup: remove video files older than VIDEO_RETENTION_MINUTES."""
import shutil
import time as _time
from pathlib import Path

from app.config import settings


async def cleanup_expired_videos() -> None:
    """Scan the videos directory and delete files older than the retention period."""
    videos_dir = settings.VIDEOS_DIR
    if not videos_dir.exists():
        return

    cutoff = _time.time() - (settings.VIDEO_RETENTION_MINUTES * 60)

    for item in videos_dir.iterdir():
        try:
            if item.is_dir():
                st_mtime = item.stat().st_mtime
                if st_mtime < cutoff:
                    shutil.rmtree(item)
            elif item.is_file():
                st_mtime = item.stat().st_mtime
                if st_mtime < cutoff:
                    item.unlink()
        except Exception:
            pass