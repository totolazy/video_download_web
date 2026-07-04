"""ffmpeg merger: combine separate audio+video streams when yt-dlp needs it."""
import asyncio
from pathlib import Path


async def merge_audio_video(
    video_path: Path, audio_path: Path, output_path: Path
) -> bool:
    """Merge audio + video streams with ffmpeg.

    Uses stream copy (-c:v copy -c:a aac) for speed.
    On success deletes the source files and returns True.
    On failure leaves source files intact and returns False.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-y",
            str(output_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await process.communicate()

        if process.returncode == 0:
            video_path.unlink(missing_ok=True)
            audio_path.unlink(missing_ok=True)
            return True
        return False
    except (FileNotFoundError, Exception):
        return False