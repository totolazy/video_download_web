"""Admin schemas: user management (root-only)."""
from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    note: str = ""


class UserListItem(BaseModel):
    id: int
    username: str
    note: str
    is_active: bool
    created_at: str | None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: list[UserListItem]
    total: int


class CreateUserResponse(BaseModel):
    id: int
    username: str
    message: str