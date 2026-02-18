"""
Pydantic schemas for User-related API requests and responses.

These define the shape of data going INTO and OUT OF the API.
They're separate from the SQLAlchemy models on purpose — you often
want to expose different fields than what's stored in the database.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models.user import UserRole, SubscriptionTier


# ---------- AUTH ----------

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------- USER CREATION (Coach creates student accounts) ----------

class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.STUDENT

    # Student-specific (optional)
    age: Optional[int] = None
    position: Optional[str] = None
    school: Optional[str] = None
    subscription_tier: Optional[SubscriptionTier] = None
    parent_id: Optional[int] = None


# ---------- USER RESPONSES ----------

class UserBasic(BaseModel):
    """Minimal user info — used in lists and references."""
    id: int
    first_name: str
    last_name: str
    role: UserRole

    model_config = {"from_attributes": True}


class UserProfile(BaseModel):
    """Full user profile — returned when viewing a specific user."""
    id: int
    email: str
    first_name: str
    last_name: str
    role: UserRole
    profile_image_url: Optional[str] = None
    age: Optional[int] = None
    position: Optional[str] = None
    school: Optional[str] = None
    subscription_tier: Optional[SubscriptionTier] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    current_streak: int = 0
    longest_streak: int = 0

    model_config = {"from_attributes": True}


class StudentAdminView(UserProfile):
    """Extended view for the coach's admin dashboard — includes private notes."""
    coach_notes: Optional[str] = None
    # These will be computed fields added by the API
    compliance_rate: Optional[float] = None
    pending_video_reviews: Optional[int] = None


class UserUpdate(BaseModel):
    """Fields the coach can update on a student's profile."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    position: Optional[str] = None
    school: Optional[str] = None
    subscription_tier: Optional[SubscriptionTier] = None
    coach_notes: Optional[str] = None
    is_active: Optional[bool] = None
