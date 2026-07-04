"""Facebook download strategy."""
from app.services.platforms.base import DownloadStrategy


class FacebookStrategy(DownloadStrategy):
    def build_args(
        self, url: str, cookies_path: str, resolution: str | None, output_dir: str
    ) -> list[str]:
        fmt = self.get_format_string(resolution)
        return self._common_args(url, cookies_path, output_dir, fmt)

    def get_format_string(self, resolution: str | None) -> str:
        height = resolution.replace("p", "") if resolution else "1080"
        return (
            f"bestvideo[height<=?{height}]+bestaudio/best[height<=?{height}]/best"
        )