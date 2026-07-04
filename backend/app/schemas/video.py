"""Video-related schemas: URL detection and resolution listing."""
from pydantic import BaseModel


class DetectRequest(BaseModel):
    url: str


class DetectResponse(BaseModel):
    detected: str | None
    platforms: list[str]


class ResolutionOption(BaseModel):
    format_id: str
    description: str


class ResolutionsResponse(BaseModel):
    resolutions: list[ResolutionOption]