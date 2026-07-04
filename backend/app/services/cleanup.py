"""Scheduled cleanup: remove non-processing video files older than 30 minutes.

Logic:
- Delete: completed, failed, pending (anything sitting > 30 min)
- Keep:  processing/merging (still active, no matter how old)
"""
import shutil
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.download import Download

# These statuses mean the download is still active — never touch them
_ACTIVE_STATUSES = frozenset({"pending", "processing"})


async def cleanup_expired_videos() -> None:
    """Delete all non-active download files that are older than 30 minutes.

    Active downloads (pending / processing) are never touched, even if
    they have been running for longer than 30 minutes.
    """
    videos_dir = settings.VIDEOS_DIR
    if not videos_dir.exists():
        return

    cutoff = datetime.now(timezone.utc).timestamp() - (settings.VIDEO_RETENTION_MINUTES * 60)

    async with async_session_factory() as db:
        # Find ALL downloads with files on disk that are NOT active
        result = await db.execute(
            select(Download).where(
                Download.status.notin_(_ACTIVE_STATUSES),
            )
        )
        downloads = result.scalars().all()

        for download in downloads:
            # Use created_at as the age reference for non-completed downloads
            ref_time = download.completed_at or download.created_at
            if ref_time is None:
                continue
            if ref_time.timestamp() >= cutoff:
                continue  # still within 30-minute window

            # Delete the video directory
            video_dir = videos_dir / str(download.id)
            try:
                if video_dir.exists():
                    shutil.rmtree(video_dir)
            except Exception:
                continue

            # Clear file references in DB (but keep the record for history)
            download.file_path = None
            download.file_name = None
            download.file_size = None

        await db.commit()
