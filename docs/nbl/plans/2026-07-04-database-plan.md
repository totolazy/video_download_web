<!--
  ============================================================================
  实施计划：数据库层（SQLite + SQLAlchemy）
  关联设计文档：docs/nbl/specs/2026-07-04-video-downloader-design.md
  创建时间：2026-07-04
  ============================================================================
-->

# 数据库层实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use nbl.subagent-driven-development (recommended) or nbl.executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 SQLite 数据库的全部 SQLAlchemy 模型、初始化脚本、以及与后端模型的接口约定

**Architecture:** 三张核心表（users / cookies / downloads），通过 SQLAlchemy ORM 定义模型，database.py 提供 engine + session 工厂，config.py 统一管理路径。所有模型通过 `backend/app/models/__init__.py` 统一导出，供后端路由和服务层引用

**Tech Stack:** Python 3.11+, SQLAlchemy 2.0 (async), aiosqlite, Pydantic v2

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `backend/app/config.py` | 全局配置：路径、JWT、清理周期 |
| `backend/app/database.py` | SQLAlchemy async engine + session + 建表 |
| `backend/app/models/__init__.py` | 统一导出所有模型 |
| `backend/app/models/user.py` | User 模型 |
| `backend/app/models/cookie.py` | Cookie 模型 |
| `backend/app/models/download.py` | Download 模型 |

---

### Task 1: 配置文件 `backend/app/config.py`

**Dependencies:** None
**Parallelizable:** Yes

**Files:**
- Create: `backend/app/config.py`

- [ ] **Step 1: 写入 config.py**

```python
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
```

- [ ] **Step 2: 创建运行时目录结构**

```python
# 在 database.py 中使用，这里先写好路径逻辑
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
settings.COOKIES_DIR.mkdir(parents=True, exist_ok=True)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py
git commit -m "feat: add global settings config"
```

---

### Task 2: 数据库引擎与会话 `backend/app/database.py`

**Dependencies:** Task 1
**Parallelizable:** No (needs config)

**Files:**
- Create: `backend/app/database.py`

- [ ] **Step 1: 写入 database.py**

```python
"""SQLAlchemy async engine + session 工厂"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# 确保数据目录存在
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
settings.COOKIES_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite+aiosqlite:///{settings.DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：每次请求获取一个数据库 session"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """启动时调用：建表 + 初始化 root 用户（如不存在）"""
    from app.models import Base
    from app.models.user import User
    from app.core.auth import hash_password

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 创建默认 root 用户（部署脚本会覆盖密码）
    async with async_session_factory() as session:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.is_root == True).limit(1))
        if not result.scalar_one_or_none():
            root = User(
                username="root",
                password_hash=hash_password("Admin123!"),
                note="超级管理员",
                is_root=True,
            )
            session.add(root)
            await session.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/database.py
git commit -m "feat: add async database engine and session factory"
```

---

### Task 3: User 模型 `backend/app/models/user.py`

**Dependencies:** Task 2
**Parallelizable:** Yes (with Task 4, 5)

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`

- [ ] **Step 1: 写入 models/__init__.py**

```python
"""统一导出所有模型"""
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

from app.models.user import User        # noqa: E402
from app.models.cookie import Cookie    # noqa: E402
from app.models.download import Download # noqa: E402

__all__ = ["Base", "User", "Cookie", "Download"]
```

- [ ] **Step 2: 写入 models/user.py**

```python
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
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/__init__.py backend/app/models/user.py
git commit -m "feat: add User model with admin/self serialization"
```

---

### Task 4: Cookie 模型 `backend/app/models/cookie.py`

**Dependencies:** Task 3
**Parallelizable:** Yes (with Task 5)

**Files:**
- Create: `backend/app/models/cookie.py`

- [ ] **Step 1: 写入 models/cookie.py**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/cookie.py
git commit -m "feat: add Cookie model with user+platform unique constraint"
```

---

### Task 5: Download 模型 `backend/app/models/download.py`

**Dependencies:** Task 3
**Parallelizable:** Yes (with Task 4)

**Files:**
- Create: `backend/app/models/download.py`

- [ ] **Step 1: 写入 models/download.py**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/download.py
git commit -m "feat: add Download model with progress tracking"
```

---

### 数据库层接口约定（供后端层对齐）

**User 模型对外接口：**

| 方法/属性 | 返回 | 用途 |
|----------|------|------|
| `User.to_admin_dict()` | `dict` | root 查看用户列表，不含 password_hash |
| `User.to_self_dict()` | `dict` | 用户查看自己信息 |
| `User.is_root` | `bool` | 判断是否管理员 |
| `User.is_active` | `bool` | 判断是否被禁用 |

**Cookie 模型对外接口：**

| 方法/属性 | 返回 | 用途 |
|----------|------|------|
| `Cookie.to_dict()` | `dict` | 序列化为前端可用的状态信息 |
| `Cookie.file_path` | `str` | 文件系统路径，后端下载时读取 |
| `Cookie.platform` | `str` | 平台标识 |

**Download 模型对外接口：**

| 方法/属性 | 返回 | 用途 |
|----------|------|------|
| `Download.to_dict()` | `dict` | 序列化为前端可用的下载记录 |
| `Download.status` | `str` | pending / processing / completed / failed |
| `Download.progress` | `int` | 0-100，SSE 进度推送的源数据 |
| `Download.file_path` | `str\|None` | 完成后的文件路径 |

**数据库 session 获取方式：**

```python
# 在任何 FastAPI 路由中通过依赖注入获取
from app.database import get_db

@router.get("/example")
async def example(db: AsyncSession = Depends(get_db)):
    ...
```

**启动初始化流程：**

```python
# app/main.py 中的 lifespan
async def lifespan(app: FastAPI):
    await init_db()  # 建表 + 检查 root
    yield
```

---

## 后端生成代码与数据库的对齐清单

- [ ] `backend/app/main.py` 调用 `init_db()` 作为启动事件
- [ ] `backend/app/core/auth.py` 引用 `app.models.user.User` 查询用户
- [ ] `backend/app/routers/auth.py` 使用 `get_db` 依赖注入
- [ ] `backend/app/routers/cookies.py` 引用 `app.models.cookie.Cookie` 进行 CRUD
- [ ] `backend/app/routers/downloads.py` 引用 `app.models.download.Download` 进行状态更新
- [ ] `backend/app/routers/admin.py` 引用 `app.models.user.User` 进行用户管理
- [ ] `backend/app/services/downloader.py` 更新 `Download.progress` 和 `Download.status`

---

**Execution Mode:** serial (Task 1→2→3, then 4+5 in parallel)
