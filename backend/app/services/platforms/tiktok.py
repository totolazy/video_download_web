"""TikTok download strategy."""
from app.services.platforms.base import DownloadStrategy


class TikTokStrategy(DownloadStrategy):
    def build_args(
        self, url: str, cookies_path: str, resolution: str | None, output_dir: str
    ) -> list[str]:
        return self._common_args(url, cookies_path, output_dir, "best")