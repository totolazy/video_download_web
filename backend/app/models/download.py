"""下载记录模型"""
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class Download(Base):
    __tablename__ = "downloads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    resolution: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    # status 可选值：pending / processing / completed / failed

    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Download(id={self.id}, platform='{self.platform}', "
            f"status='{self.status}')>"
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "url": self.url,
            "platform": self.platform,
            "resolution": self.resolution,
            "status": self.status,
            "progress": self.progress,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
