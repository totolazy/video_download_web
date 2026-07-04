"""Cookie schemas: status and upload response."""
from datetime import datetime
from pydantic import BaseModel


class CookieStatusItem(BaseModel):
    exists: bool
    uploaded_at: str | None = None
    last_used_at: str | None = None


class CookieStatusResponse(BaseModel):
    cookies: dict[str, CookieStatusItem]


class CookieUploadResponse(BaseModel):
    platform: str
    message: str