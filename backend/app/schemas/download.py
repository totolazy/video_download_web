"""Download-related schemas."""
from datetime import datetime
from pydantic import BaseModel


class DownloadCreate(BaseModel):
    url: str
    platform: str
    resolution: str | None = None


class DownloadResponse(BaseModel):
    id: int
    url: str
    platform: str
    resolution: str | None
    status: str
    progress: int
    file_name: str | None
    file_size: int | None
    error_message: str | None
    created_at: str | None
    completed_at: str | None

    class Config:
        from_attributes = True


class DownloadListResponse(BaseModel):
    items: list[DownloadResponse]
    total: int