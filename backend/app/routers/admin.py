"""Admin routes: user management (root-only)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.core.auth import hash_password, require_root
from app.database import get_db
from app.models.user import User
from app.schemas.admin import (
    CreateUserResponse,
    UserCreate,
    UserListItem,
    UserListResponse,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=UserListResponse)
async def list_users(
    db=Depends(get_db),
    _root: User = Depends(require_root),
):
    """List all users (root only)."""
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
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
    """Create a new user (root only)."""
    # Check duplicate
    result = await db.execute(
        select(User).where(User.username == body.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已存在",
        )

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        note=body.note,
        is_root=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return CreateUserResponse(
        id=user.id,
        username=user.username,
        message=f"用户 {user.username} 创建成功",
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db=Depends(get_db),
    _root: User = Depends(require_root),
):
    """Soft-delete (disable) a user (root only). Cannot disable root."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    if user.is_root:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法禁用 root 用户",
        )

    user.is_active = False
    await db.commit()

    return {"message": f"用户 {user.username} 已被禁用"}