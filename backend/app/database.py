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
