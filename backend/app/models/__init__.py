"""统一导出所有模型"""
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

from app.models.user import User        # noqa: E402
from app.models.cookie import Cookie    # noqa: E402
from app.models.download import Download # noqa: E402

__all__ = ["Base", "User", "Cookie", "Download"]
