"""Abstract base class for platform-specific yt-dlp download strategies."""
import json
import re
from abc import ABC, abstractmethod
from typing import Any


class DownloadStrategy(ABC):
    """Defines how to build yt-dlp args and parse progress for a platform."""

    @abstractmethod
    def build_args(
        self, url: str, cookies_path: str, resolution: str | None, output_dir: str
    ) -> list[str]:
        """Build yt-dlp command-line arguments."""

    def parse_progress(self, line: str) -> float | None:
        """Parse a single yt-dlp stdout line for download progress (0.0-100.0).

        Default implementation matches the "[download]  xx.x%" pattern.
        Returns None if the line is not a progress line.
        """
        match = re.search(r"\[download\]\s+(\d+\.?\d*)%", line)
        if match:
            return float(match.group(1))
        return None

    def needs_merge(self, info: dict[str, Any]) -> bool:
        """Return True if separate audio/video streams need ffmpeg merging."""
        return False

    def get_format_string(self, resolution: str | None) -> str:
        """Build the yt-dlp -f format selector from a resolution like '1080p'."""
        if not resolution or resolution in ("best", "default"):
            return "bestvideo+bestaudio/best"
        return resolution

    def parse_extracted_info(self, stdout: str) -> dict[str, Any] | None:
        """Parse yt-dlp --print JSON info from the last printed line."""
        for line in reversed(stdout.strip().splitlines()):
            line = line.strip()
            if line.startswith("{"):
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue
        return None

    @staticmethod
    def _common_args(
        url: str, cookies_path: str, output_dir: str, format_str: str
    ) -> list[str]:
        """Return a standard set of yt-dlp arguments used by most strategies."""
        return [
            url,
            "--cookies", cookies_path,
            "-f", format_str,
            "-o", f"{output_dir}/%(title)s.%(ext)s",
            "--merge-output-format", "mp4",
            "--no-playlist",
            "--extractor-retries", "3",
            "--retries", "3",
            "--no-warnings",
            "--progress",
            "--newline",
        ]