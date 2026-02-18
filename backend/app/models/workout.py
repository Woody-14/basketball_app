"""
Workout models.

A Workout is a reusable template: an ordered list of drills with custom
reps/sets/durations. The coach builds these, then assigns them to
students on specific dates via WorkoutAssignment.

Workflow:
  1. Coach builds a Workout from drills in the library
  2. Coach assigns that Workout to a student for specific days
  3. Student opens the app, sees today's assigned workout, does the drills
"""

import enum
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    String, Integer, Enum, DateTime, Date, Text,
    ForeignKey, Boolean, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Workout(Base):
    """
    A workout template. Think of this like a recipe — it defines WHAT drills
    to do, in what order, with what reps. It can be assigned to many students.
    """
    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Estimated total time in minutes (auto-calculated or manually set)
    estimated_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # If True, this workout appears in the coach's reusable template library
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    drills: Mapped[list["WorkoutDrill"]] = relationship(
        "WorkoutDrill",
        back_populates="workout",
        order_by="WorkoutDrill.order_index",  # Always return drills in order
        cascade="all, delete-orphan",
    )
    assignments: Mapped[list["WorkoutAssignment"]] = relationship(
        "WorkoutAssignment", back_populates="workout"
    )


class WorkoutDrill(Base):
    """
    A single drill within a workout. This is the junction table that lets
    the coach customize reps/sets/duration per drill per workout (overriding
    the drill's defaults).
    """
    __tablename__ = "workout_drills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workout_id: Mapped[int] = mapped_column(Integer, ForeignKey("workouts.id"), nullable=False)
    drill_id: Mapped[int] = mapped_column(Integer, ForeignKey("drills.id"), nullable=False)

    # Position in the workout (0-indexed)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # Override the drill defaults for this specific workout
    custom_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    custom_sets: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    custom_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Coach can add workout-specific notes for this drill
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    workout: Mapped["Workout"] = relationship("Workout", back_populates="drills")
    drill: Mapped["Drill"] = relationship("Drill", back_populates="workout_drills")


class AssignmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"   # Assigned but not yet due
    AVAILABLE = "available"   # Due today or past due
    COMPLETED = "completed"   # Student finished it
    SKIPPED = "skipped"       # Student didn't do it (past the date)


class WorkoutAssignment(Base):
    """
    Assigns a workout to a specific student on a specific date.
    This is what shows up on the student's calendar / home screen.
    """
    __tablename__ = "workout_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workout_id: Mapped[int] = mapped_column(Integer, ForeignKey("workouts.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # When is this workout scheduled for?
    assigned_date: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus), default=AssignmentStatus.SCHEDULED
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    workout: Mapped["Workout"] = relationship("Workout", back_populates="assignments")
    student: Mapped["User"] = relationship("User", back_populates="workout_assignments")

    def __repr__(self):
        return f"<Assignment: Workout {self.workout_id} -> Student {self.student_id} on {self.assigned_date}>"


# Needed for type hints in other files
from app.models.drill import Drill  # noqa: E402
from app.models.user import User  # noqa: E402
