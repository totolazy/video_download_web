"""Authentication routes: login, me, change-password."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.core.auth import (
    verify_password, create_access_token,
    get_current_user,
    hash_password,
)
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo, ChangePasswordRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.username == body.username)
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已被禁用")
    token = create_access_token(user.id, user.is_root)
    return LoginResponse(token=token, user=UserInfo(
        id=user.id, username=user.username, is_root=user.is_root,
        note=user.note, created_at=user.created_at.isoformat() if user.created_at else None,
    ))


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserInfo(
        id=current_user.id, username=current_user.username,
        is_root=current_user.is_root, note=current_user.note,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
    )


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Re-fetch inside the active DB session — current_user from get_current_user
    # comes from a separate short-lived session and may be detached.
    user = await db.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="原密码错误")
    if body.old_password == body.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="新密码不能与原密码相同")
    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "密码修改成功"}
