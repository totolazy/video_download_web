"""Strategy registry: maps platform name to DownloadStrategy subclass."""
from app.services.platforms.base import DownloadStrategy
from app.services.platforms.youtube import YouTubeStrategy
from app.services.platforms.bilibili import BilibiliStrategy
from app.services.platforms.instagram import InstagramStrategy
from app.services.platforms.facebook import FacebookStrategy
from app.services.platforms.douyin import DouyinStrategy
from app.services.platforms.tiktok import TikTokStrategy

_STRATEGIES: dict[str, DownloadStrategy] = {
    "youtube": YouTubeStrategy(),
    "bilibili": BilibiliStrategy(),
    "instagram": InstagramStrategy(),
    "facebook": FacebookStrategy(),
    "douyin": DouyinStrategy(),
    "tiktok": TikTokStrategy(),
}


def get_strategy(platform: str) -> DownloadStrategy:
    """Return the DownloadStrategy instance for *platform*.

    Raises ValueError if the platform is not supported.
    """
    strategy = _STRATEGIES.get(platform)
    if strategy is None:
        raise ValueError(f"Unsupported platform: {platform}")
    return strategy