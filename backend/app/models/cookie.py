"""Cookies 模型 — 每个用户对每个平台存储一份 cookies"""
from datetime import datetime
from sqlalchemy import (
    Integer, String, DateTime, ForeignKey, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class Cookie(Base):
    __tablename__ = "cookies"
    __table_args__ = (
        UniqueConstraint("user_id", "platform", name="idx_user_platform"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Cookie(user_id={self.user_id}, platform='{self.platform}')>"

    def to_dict(self) -> dict:
        return {
            "platform": self.platform,
            "exists": True,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
        }
