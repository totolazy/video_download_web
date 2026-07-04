"""Scheduled cleanup: remove expired video files and cancel stuck downloads.

Logic:
- Delete (non-active): completed / failed / pending files older than 30 min
- Cancel (stuck):     processing files older than 24 hours → status=failed
"""
import shutil
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.download import Download

# Active statuses that should never be cleaned as "expired" (but may be stuck)
_ACTIVE_STATUSES = frozenset({"pending", "processing"})
# Processing downloads stuck longer than this get cancelled
_STUCK_HOURS = 24


async def cleanup_expired_videos() -> None:
    """Cleanup: delete expired files + cancel stuck processing downloads."""
    videos_dir = settings.VIDEOS_DIR
    now = datetime.now(timezone.utc).timestamp()
    retention_seconds = settings.VIDEO_RETENTION_MINUTES * 60
    cutoff_30min = now - retention_seconds
    cutoff_24h = now - (_STUCK_HOURS * 3600)

    async with async_session_factory() as db:
        candidates = await db.execute(
            select(Download).where(
                Download.created_at.isnot(None),
            )
        )
        downloads = candidates.scalars().all()

        for download in downloads:
            # --- Stuck processing: cancel if older than 24h ---
            if download.status == "processing":
                if download.created_at and download.created_at.timestamp() < cutoff_24h:
                    download.status = "failed"
                    download.error_message = "下载超时（已超过24小时），自动取消"
                continue  # processing is never file-deleted here

            # --- Non-active: delete files older than 30min ---
            if download.status in _ACTIVE_STATUSES:
                continue  # safety: skip any remaining active statuses

            ref_time = download.completed_at or download.created_at
            if ref_time is None or ref_time.timestamp() >= cutoff_30min:
                continue

            video_dir = videos_dir / str(download.id)
            try:
                if video_dir.exists():
                    shutil.rmtree(video_dir)
            except Exception:
                continue

            download.file_path = None
            download.file_name = None
            download.file_size = None

        await db.commit()
