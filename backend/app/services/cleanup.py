"""Scheduled cleanup: remove completed video files older than 30 minutes."""
import shutil
import time as _time
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.download import Download


async def cleanup_expired_videos() -> None:
    """Delete completed download files that have been idle for 30+ minutes.
    
    Only deletes files whose corresponding Download record has
    status='completed' and completed_at is older than VIDEO_RETENTION_MINUTES.
    In-progress or failed downloads are never touched.
    """
    videos_dir = settings.VIDEOS_DIR
    if not videos_dir.exists():
        return

    cutoff = datetime.now(timezone.utc).timestamp() - (settings.VIDEO_RETENTION_MINUTES * 60)

    async with async_session_factory() as db:
        # Find all completed downloads older than the cutoff
        result = await db.execute(
            select(Download).where(
                Download.status == "completed",
                Download.completed_at.isnot(None),
                Download.file_path.isnot(None),
            )
        )
        completed = result.scalars().all()

        for download in completed:
            # Double-check: completed_at must be older than retention period
            if download.completed_at is None:
                continue
            completed_ts = download.completed_at.timestamp()
            if completed_ts >= cutoff:
                continue  # still within retention window

            # Delete the video directory
            video_dir = videos_dir / str(download.id)
            try:
                if video_dir.exists():
                    shutil.rmtree(video_dir)
            except Exception:
                continue

            # Mark DB record as expired (clear file references)
            download.file_path = None
            download.file_name = None
            download.file_size = None

        await db.commit()
