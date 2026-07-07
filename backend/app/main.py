"""FastAPI application entry point.

Registers all routers, CORS middleware, lifespan scheduler, and static fallback.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

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
    # Catch-all route: serves static files directly (js/css/images/etc)
    # and falls back to index.html for SPA client-side routes (/history, /cookies, /admin, etc.)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Not Found")
