"""
Authentication service.

Handles:
  - Password hashing (bcrypt)
  - JWT token creation & verification
  - FastAPI dependency to get the current logged-in user from a request
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole


# ---------- PASSWORD HASHING ----------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------- JWT TOKENS ----------

def create_access_token(user_id: int, role: UserRole) -> str:
    """
    Creates a JWT token that encodes the user's ID and role.
    The mobile app / admin dashboard stores this token and sends it
    with every API request.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),     # Subject = user ID
        "role": role.value,       # So we can check permissions without a DB query
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token. Raises JWTError if invalid/expired."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# ---------- FASTAPI DEPENDENCIES ----------

# This tells FastAPI where to find the token (Authorization: Bearer <token>)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency that extracts the current user from the JWT token.

    Usage in a route:
        @router.get("/my-stuff")
        async def my_stuff(current_user: User = Depends(get_current_user)):
            ...
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_coach(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that ensures the current user is a coach.
    Use this on admin-only routes.

    Usage:
        @router.post("/drills")
        async def create_drill(coach: User = Depends(require_coach)):
            ...
    """
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires coach privileges",
        )
    return current_user


def require_parent(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the current user is a parent (read-only portal)."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires parent access",
        )
    return current_user
