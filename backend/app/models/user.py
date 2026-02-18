"""
User model.

Roles:
  - coach:   The app owner. Builds drills/workouts, reviews videos, manages students.
  - student: K-12 player. Receives workouts, submits videos, earns badges.
  - parent:  Read-only view of their child's progress (Phase 2, but we model it now).
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Enum, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    COACH = "coach"
    STUDENT = "student"
    PARENT = "parent"


class SubscriptionTier(str, enum.Enum):
    BASE = "base"           # 2-3 workouts/week, 20-30 min
    STANDARD = "standard"   # 3-4 workouts/week, 30-45 min
    ELITE = "elite"         # 5 workouts/week, 45-60 min


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Profile info
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    profile_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Student-specific fields (null for coach/parent)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., "PG", "SG/SF"
    school: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    subscription_tier: Mapped[Optional[SubscriptionTier]] = mapped_column(
        Enum(SubscriptionTier), nullable=True
    )

    # Parent link — if this user is a student, who is their parent?
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Coach private notes about this student (only visible in admin UI)
    coach_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Current streak (updated by the app when workouts are completed)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    parent: Mapped[Optional["User"]] = relationship("User", remote_side="User.id")
    workout_assignments: Mapped[list["WorkoutAssignment"]] = relationship(
        "WorkoutAssignment", back_populates="student"
    )
    workout_completions: Mapped[list["WorkoutCompletion"]] = relationship(
        "WorkoutCompletion", back_populates="student"
    )
    badges: Mapped[list["UserBadge"]] = relationship(
        "UserBadge", back_populates="user"
    )
    skill_assessments: Mapped[list["SkillAssessment"]] = relationship(
        "SkillAssessment", back_populates="student"
    )

    def __repr__(self):
        return f"<User {self.first_name} {self.last_name} ({self.role.value})>"


# Avoid circular import issues — these are imported at module level in __init__.py
from app.models.workout import WorkoutAssignment  # noqa: E402
from app.models.progress import WorkoutCompletion, UserBadge, SkillAssessment  # noqa: E402
