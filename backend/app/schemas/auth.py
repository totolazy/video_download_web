"""Authentication schemas: login request/response, user info."""
from datetime import datetime
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    username: str
    is_root: bool
    note: str
    created_at: str | None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    user: UserInfo