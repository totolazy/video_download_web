"""Authentication Pydantic schemas."""
from pydantic import BaseModel, Field


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    username: str
    is_root: bool
    note: str
    created_at: str | None


class LoginResponse(BaseModel):
    token: str
    user: UserInfo
