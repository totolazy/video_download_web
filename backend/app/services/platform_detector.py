"""URL-to-platform detection: match a video URL to its platform name."""
from urllib.parse import urlparse

PLATFORM_RULES: list[tuple[list[str], str]] = [
    (["youtube.com", "youtu.be"], "youtube"),
    (["bilibili.com", "b23.tv"], "bilibili"),
    (["instagram.com"], "instagram"),
    (["facebook.com", "fb.watch", "fb.com"], "facebook"),
    (["douyin.com", "iesdouyin.com"], "douyin"),
    (["tiktok.com"], "tiktok"),
]

ALL_PLATFORMS: list[str] = [platform for _, platform in PLATFORM_RULES]


def detect_platform(url: str) -> str | None:
    """Extract the hostname from *url* and match against PLATFORM_RULES.

    Returns the platform name (e.g. "youtube") or None.
    """
    try:
        hostname = urlparse(url).hostname or ""
    except Exception:
        return None

    hostname = hostname.removeprefix("www.").lower()

    for domains, platform in PLATFORM_RULES:
        for domain in domains:
            if hostname == domain or hostname.endswith("." + domain):
                return platform

    return None