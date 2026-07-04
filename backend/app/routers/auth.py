"""Authentication routes: login and current-user info."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.core.auth import (
    create_access_token,
    get_current_user,
    verify_password,
)
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db=Depends(get_db)):
    """Authenticate a user and return a JWT token."""
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    token = create_access_token(user.id, user.is_root)
    return LoginResponse(
        token=token,
        user=UserInfo(
            id=user.id,
            username=user.username,
            is_root=user.is_root,
            note=user.note,
            created_at=user.created_at.isoformat() if user.created_at else None,
        ),
    )


@router.get("/me", response_model=UserInfo)
async def me(current_user: User = Depends(get_current_user)):
    """Return the currently logged-in user's info."""
    return UserInfo(
        id=current_user.id,
        username=current_user.username,
        is_root=current_user.is_root,
        note=current_user.note,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
    )