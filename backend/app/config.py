"""鍏ㄥ眬閰嶇疆锛屾墍鏈夎矾寰勫拰甯搁噺闆嗕腑绠＄悊"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 椤圭洰鏍圭洰褰曪紙backend/ 鐨勪笂涓€绾э級
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent

    # 鏁版嵁鐩綍
    DATA_DIR: Path = PROJECT_ROOT / "data"
    VIDEOS_DIR: Path = DATA_DIR / "videos"
    COOKIES_DIR: Path = DATA_DIR / "cookies"
    DB_PATH: Path = DATA_DIR / "app.db"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # 瑙嗛淇濈暀鍒嗛挓鏁帮紙瓒呮椂鑷姩娓呯悊锛?
    VIDEO_RETENTION_MINUTES: int = 30

    # 娓呯悊浠诲姟闂撮殧锛堝垎閽燂級
    CLEANUP_INTERVAL_MINUTES: int = 15

    # 鏀寔鐨勬墍鏈夊钩鍙?
    SUPPORTED_PLATFORMS: list[str] = [
        "youtube", "bilibili", "instagram",
        "facebook", "douyin", "tiktok"
    ]

    class Config:
        env_prefix = "VDL_"  # 鐜鍙橀噺鍓嶇紑 VDL_JWT_SECRET 鍙鐩?

settings = Settings()

