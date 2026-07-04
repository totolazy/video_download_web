"""用户模型"""
from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    is_root: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', is_root={self.is_root})>"

    def to_admin_dict(self) -> dict:
        """root 查看用户列表时返回的字段（不含密码）"""
        return {
            "id": self.id,
            "username": self.username,
            "note": self.note,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_self_dict(self) -> dict:
        """用户查看自己的信息时返回的字段"""
        return {
            "id": self.id,
            "username": self.username,
            "is_root": self.is_root,
            "note": self.note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
