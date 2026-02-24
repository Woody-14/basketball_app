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
from app.models.progress import UserBadge, Badge
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserProfile
from sqlalchemy.orm import selectinload
from app.services.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_coach,
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


@router.get("/me", response_model=UserProfile)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the currently logged-in user's full profile, including badges."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.badges).selectinload(UserBadge.badge))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()

    # Schemas map `badges` from the junction table to the badge object if we structure it right.
    # But UserProfile expects `list[BadgeResponse]`. User.badges is `list[UserBadge]`.
    # Let's map it manually before returning, or let Pydantic handle it if they match.
    # Actually, BadgeResponse expects `Badge` fields, plus maybe `earned_at` from `UserBadge`.
    # It's safest to construct a dict if Pydantic struggles to merge them.
    
    # We'll build a dict that matches UserProfile fields:
    profile_data = {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "profile_image_url": user.profile_image_url,
        "age": user.age,
        "position": user.position,
        "school": user.school,
        "subscription_tier": user.subscription_tier,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "last_login": user.last_login,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
        "badges": []
    }
    
    for ub in user.badges:
        b = ub.badge
        profile_data["badges"].append({
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "badge_type": b.badge_type,
            "threshold_value": b.threshold_value,
            "icon_url": b.icon_url,
            "earned_at": ub.awarded_at
        })
        
    return profile_data
