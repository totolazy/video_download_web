"""全局配置，所有路径和常量集中管理"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 项目根目录（backend/ 的上一级）
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent

    # 数据目录
    DATA_DIR: Path = PROJECT_ROOT / "data"
    VIDEOS_DIR: Path = DATA_DIR / "videos"
    COOKIES_DIR: Path = DATA_DIR / "cookies"
    DB_PATH: Path = DATA_DIR / "app.db"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # 视频保留分钟数（超时自动清理）
    VIDEO_RETENTION_MINUTES: int = 60

    # 清理任务间隔（分钟）
    CLEANUP_INTERVAL_MINUTES: int = 60

    # 支持的所有平台
    SUPPORTED_PLATFORMS: list[str] = [
        "youtube", "bilibili", "instagram",
        "facebook", "douyin", "tiktok"
    ]

    class Config:
        env_prefix = "VDL_"  # 环境变量前缀 VDL_JWT_SECRET 可覆盖


settings = Settings()
