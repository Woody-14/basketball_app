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
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserProfile, ParentCreate
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

    return {
        "id": student.id,
        "email": student.email,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "role": student.role,
        "profile_image_url": student.profile_image_url,
        "age": student.age,
        "position": student.position,
        "school": student.school,
        "subscription_tier": student.subscription_tier,
        "is_active": student.is_active,
        "created_at": student.created_at,
        "last_login": student.last_login,
        "current_streak": student.current_streak,
        "longest_streak": student.longest_streak,
        "xp": student.xp or 0,
        "level": student.level or 1,
        "badges": [],
    }


@router.post("/parents", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def create_parent(
    data: ParentCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Coach creates a parent account and links it to an existing student.
    The student's parent_id is updated to point to the new parent user.
    """
    # Check email isn't already taken
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Verify the student exists
    student_result = await db.execute(
        select(User).where(User.id == data.student_id, User.role == UserRole.STUDENT)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    parent = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole.PARENT,
    )
    db.add(parent)
    await db.flush()   # Get parent.id assigned

    # Link student → parent
    student.parent_id = parent.id
    await db.flush()
    await db.refresh(parent)

    # Return a dict to avoid lazy-loading the badges relationship on a fresh object
    return {
        "id": parent.id,
        "email": parent.email,
        "first_name": parent.first_name,
        "last_name": parent.last_name,
        "role": parent.role,
        "profile_image_url": parent.profile_image_url,
        "age": parent.age,
        "position": parent.position,
        "school": parent.school,
        "subscription_tier": parent.subscription_tier,
        "is_active": parent.is_active,
        "created_at": parent.created_at,
        "last_login": parent.last_login,
        "current_streak": parent.current_streak,
        "longest_streak": parent.longest_streak,
        "xp": parent.xp or 0,
        "level": parent.level or 1,
        "badges": [],
    }


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Any logged-in user (coach, student, parent) can change their own password.
    Requires the current password to verify identity.
    """
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        raise HTTPException(status_code=422, detail="current_password and new_password are required")

    if len(new_password) < 8:
        raise HTTPException(status_code=422, detail="New password must be at least 8 characters")

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.hashed_password = hash_password(new_password)
    await db.flush()


@router.put("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def register_push_token(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Store the device's Expo push token so the backend can send notifications.
    Called by the mobile app automatically after login.
    """
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.push_token = data.get("token")
    await db.flush()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Student requests account deletion.
    Deactivates the account immediately and flags it for data removal.
    Apple App Store requires this to be available in-app.
    """
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.is_active = False
    # Clear PII that can be purged immediately
    user.push_token = None
    await db.flush()


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
        "xp": user.xp or 0,
        "level": user.level or 1,
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
