"""Admin routes: user management + password reset (root-only)."""
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.core.auth import hash_password, require_root, verify_password
from app.database import get_db
from app.config import settings
import shutil
from app.models.user import User
from app.schemas.admin import (
    CreateUserResponse,
    UserCreate,
    UserListItem,
    UserListResponse,
)


class AdminChangePasswordSchema(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)
    old_password: str | None = Field(None, min_length=1)


router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=UserListResponse)
async def list_users(
    db=Depends(get_db),
    _root: User = Depends(require_root),
):
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar() or 0
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return UserListResponse(
        users=[UserListItem.model_validate(u.to_admin_dict()) for u in users],
        total=total,
    )


@router.post("/users", response_model=CreateUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db=Depends(get_db),
    _root: User = Depends(require_root),
):
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已存在")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        note=body.note,
        is_root=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create user's personal cookies directory (username-based isolation)
    (settings.COOKIES_DIR / body.username).mkdir(parents=True, exist_ok=True)

    return CreateUserResponse(id=user.id, username=user.username, message=f"用户 {user.username} 创建成功")


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db=Depends(get_db),
    _root: User = Depends(require_root),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if user.is_root:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无法禁用/启用 root 用户")
    user.is_active = not user.is_active
    await db.commit()
    action = "启用" if user.is_active else "禁用"
    return {"message": f"用户 {user.username} 已被{action}", "is_active": user.is_active}



@router.delete("/users/{user_id}/permanent")
async def permanent_delete_user(
    user_id: int,
    db=Depends(get_db),
    _root: User = Depends(require_root),
):
    """Permanently delete a user and all their cookies/files."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if user.is_root:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无法删除 root 用户")

    username = user.username

    # Delete user's cookies directory
    cookie_dir = settings.COOKIES_DIR / username
    if cookie_dir.exists():
        shutil.rmtree(cookie_dir)

    await db.delete(user)
    await db.commit()
    return {"message": f"用户 {username} 已被永久删除"}


@router.post("/users/{user_id}/change-password")
async def admin_change_password(
    user_id: int,
    body: AdminChangePasswordSchema,
    db=Depends(get_db),
    _root: User = Depends(require_root),
):
    """Admin resets any user's password (root only)."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # Changing root's password requires old password verification
    if user.is_root:
        if not body.old_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="修改管理员密码需提供原密码",
            )
        if not verify_password(body.old_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="原密码错误",
            )

    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": f"用户 {user.username} 的密码已重置"}
