"""Download orchestrator: create tasks, run yt-dlp, update progress in DB."""
import asyncio
import glob
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.download import Download
from app.services.error_mapper import map_error
from app.services.platforms import get_strategy


async def create_download_task(
    user_id: int,
    url: str,
    platform: str,
    resolution: str | None,
    cookies_path: str,
) -> int:
    """Create a Download record and start the background download task.

    Returns the download_id so the frontend can poll progress.
    """
    async with async_session_factory() as db:
        download = Download(
            user_id=user_id,
            url=url,
            platform=platform,
            resolution=resolution,
            status="pending",
        )
        db.add(download)
        await db.commit()
        await db.refresh(download)
        download_id = download.id

    asyncio.create_task(_run_download(
        download_id=download_id,
        url=url,
        platform=platform,
        resolution=resolution,
        cookies_path=cookies_path,
    ))

    return download_id


async def _run_download(
    download_id: int,
    url: str,
    platform: str,
    resolution: str | None,
    cookies_path: str,
) -> None:
    """Background task: execute yt-dlp, update progress in DB."""
    async with async_session_factory() as db:
        download = await db.get(Download, download_id)
        if download is None:
            return
        download.status = "processing"
        download.progress = 0
        await db.commit()

    output_dir = settings.VIDEOS_DIR / str(download_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        strategy = get_strategy(platform)
        args = ["yt-dlp"] + strategy.build_args(
            url=url,
            cookies_path=cookies_path,
            resolution=resolution,
            output_dir=str(output_dir),
        )
    except ValueError as e:
        async with async_session_factory() as db:
            download = await db.get(Download, download_id)
            if download:
                download.status = "failed"
                download.error_message = str(e)
                await db.commit()
        return

    try:
        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout_lines: list[str] = []
        stderr_lines: list[str] = []

        async def _read_stream(stream, collector):
            while True:
                line = await stream.readline()
                if not line:
                    break
                decoded = line.decode("utf-8", errors="replace").rstrip("\n\r")
                collector.append(decoded)

        read_stdout = asyncio.create_task(_read_stream(process.stdout, stdout_lines))
        read_stderr = asyncio.create_task(_read_stream(process.stderr, stderr_lines))

        last_progress = -1

        while not read_stdout.done():
            if stdout_lines:
                latest = stdout_lines[-1]
                pct = strategy.parse_progress(latest)
                if pct is not None:
                    progress_int = min(int(pct), 99)
                    if progress_int > last_progress:
                        last_progress = progress_int
                        async with async_session_factory() as db:
                            d = await db.get(Download, download_id)
                            if d:
                                d.progress = progress_int
                                await db.commit()
            await asyncio.sleep(0.3)

        await asyncio.gather(read_stdout, read_stderr)
        await process.wait()

        stdout_full = "\n".join(stdout_lines)
        stderr_full = "\n".join(stderr_lines)

        if process.returncode == 0:
            # Find the output video file
            video_files = (
                list(output_dir.glob("*.mp4"))
                + list(output_dir.glob("*.mkv"))
                + list(output_dir.glob("*.webm"))
            )
            if video_files:
                video_path = video_files[0]
                file_size = video_path.stat().st_size
                async with async_session_factory() as db:
                    download = await db.get(Download, download_id)
                    if download:
                        download.status = "completed"
                        download.progress = 100
                        download.file_path = str(video_path)
                        download.file_name = video_path.name
                        download.file_size = file_size
                        download.completed_at = datetime.now(timezone.utc)
                        await db.commit()
            else:
                async with async_session_factory() as db:
                    download = await db.get(Download, download_id)
                    if download:
                        download.status = "failed"
                        download.error_message = "下载完成但未找到生成的文件"
                        await db.commit()
        else:
            error_msg = map_error(stderr_full, process.returncode)
            async with async_session_factory() as db:
                download = await db.get(Download, download_id)
                if download:
                    download.status = "failed"
                    download.error_message = error_msg
                    await db.commit()

    except Exception as e:
        async with async_session_factory() as db:
            download = await db.get(Download, download_id)
            if download:
                download.status = "failed"
                download.error_message = str(e)
                await db.commit()


async def get_download_progress(
    download_id: int, user_id: int
) -> dict | None:
    """Return current progress dict for a download, or None if not found/unauthorized."""
    async with async_session_factory() as db:
        download = await db.get(Download, download_id)
        if download is None or download.user_id != user_id:
            return None
        return {
            "progress": download.progress,
            "status": download.status,
            "file_name": download.file_name,
            "file_size": download.file_size,
            "error_message": download.error_message,
        }