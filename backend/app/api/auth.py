"""
Authentication routes.

POST /api/auth/login      — Log in, get a JWT token
POST /api/auth/students   — Coach creates a new student account
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserProfile
from app.services.auth import (
    hash_password, verify_password, create_access_token,
    require_coach,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate and receive a JWT token.
    Both coaches and students use this endpoint.
    """
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)


@router.post("/students", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def create_student(
    data: UserCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Coach creates a new student account.
    This is the onboarding flow — the student tells the coach they want
    to sign up, the coach creates their account here, then gives the
    student their login credentials.
    """
    # Check email isn't already taken
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    student = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole.STUDENT,  # Always student, regardless of what was sent
        age=data.age,
        position=data.position,
        school=data.school,
        subscription_tier=data.subscription_tier,
        parent_id=data.parent_id,
    )

    db.add(student)
    await db.flush()        # Assigns the ID without committing
    await db.refresh(student)

    return student
