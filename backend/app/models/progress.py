"""
Progress & Gamification models.

Tracks:
  - Workout completions (did the student finish today's workout?)
  - Drill completions (which specific drills did they complete, with optional video?)
  - Badges (achievements the coach awards)
  - Skill assessments (monthly evaluation scores)
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Enum, DateTime, Text, ForeignKey, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


# ---------- WORKOUT & DRILL COMPLETION ----------

class WorkoutCompletion(Base):
    """
    Records when a student completes an assigned workout.
    """
    __tablename__ = "workout_completions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workout_assignments.id"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # When they started and finished
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Total time spent in minutes
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Post-workout self-assessment (1-5 scale)
    self_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    self_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    student: Mapped["User"] = relationship("User", back_populates="workout_completions")
    assignment: Mapped["WorkoutAssignment"] = relationship("WorkoutAssignment")
    drill_completions: Mapped[list["DrillCompletion"]] = relationship(
        "DrillCompletion", back_populates="workout_completion", cascade="all, delete-orphan"
    )


class DrillCompletion(Base):
    """
    Records completion of a single drill within a workout.
    Optionally includes a video submission for coach review.
    """
    __tablename__ = "drill_completions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workout_completion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workout_completions.id"), nullable=False
    )
    workout_drill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workout_drills.id"), nullable=False
    )

    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Video form check submission (URL to uploaded video in S3)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Coach's feedback on the submitted video
    coach_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    coach_video_feedback_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    feedback_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Has the coach reviewed this submission?
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    workout_completion: Mapped["WorkoutCompletion"] = relationship(
        "WorkoutCompletion", back_populates="drill_completions"
    )
    workout_drill: Mapped["WorkoutDrill"] = relationship("WorkoutDrill")


# ---------- BADGES ----------

class BadgeType(str, enum.Enum):
    STREAK = "streak"             # 7-day, 30-day, etc.
    WORKOUT_COUNT = "workout_count"  # 10, 25, 50, 100 workouts
    SKILL_MILESTONE = "skill_milestone"  # Awarded during monthly evaluation
    PERFECT_WEEK = "perfect_week"
    MONTHLY_CHALLENGE = "monthly_challenge"
    CUSTOM = "custom"             # One-off badges the coach creates


class Badge(Base):
    """
    Badge definitions. The coach can create custom badges or
    the system auto-awards streak/count badges.
    """
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    badge_type: Mapped[BadgeType] = mapped_column(Enum(BadgeType), nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # For auto-award badges: what's the threshold? (e.g., 7 for a 7-day streak)
    threshold_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    users: Mapped[list["UserBadge"]] = relationship("UserBadge", back_populates="badge")


class UserBadge(Base):
    """
    Junction table: which users have earned which badges, and when.
    """
    __tablename__ = "user_badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    badge_id: Mapped[int] = mapped_column(Integer, ForeignKey("badges.id"), nullable=False)
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # Coach can add a personal note when awarding (e.g., "Crushed it this month!")
    award_note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="badges")
    badge: Mapped["Badge"] = relationship("Badge", back_populates="users")


# ---------- SKILL ASSESSMENTS ----------

class SkillAssessment(Base):
    """
    Monthly skill evaluation performed during in-person sessions.
    Each row is a snapshot of the student's skills at a point in time.
    These scores feed the student's radar chart in the app.
    """
    __tablename__ = "skill_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Skill scores (1-10 scale)
    ball_handling: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shooting_form: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shooting_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    footwork: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    finishing: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    court_vision: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    athleticism: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    defense: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Coach notes from the evaluation
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    student: Mapped["User"] = relationship("User", back_populates="skill_assessments")


# Avoid circular imports
from app.models.user import User  # noqa: E402
from app.models.workout import WorkoutAssignment, WorkoutDrill  # noqa: E402
