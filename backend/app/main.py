"""FastAPI application entry point.

Registers all routers, CORS middleware, lifespan scheduler, and static fallback.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.middleware import setup_cors
from app.database import init_db
from app.routers import admin, auth, cookies, downloads, videos
from app.services.cleanup import cleanup_expired_videos


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise DB, start scheduler. Shutdown: stop scheduler."""
    await init_db()

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        cleanup_expired_videos,
        "interval",
        minutes=settings.CLEANUP_INTERVAL_MINUTES,
        id="cleanup",
        replace_existing=True,
    )
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(
    title="视频下载网站",
    version="1.0.0",
    lifespan=lifespan,
)

setup_cors(app)

app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(downloads.router)
app.include_router(cookies.router)
app.include_router(admin.router)

# Serve frontend static files in production
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")