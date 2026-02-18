"""
Pydantic schemas for Workout-related API requests and responses.
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel

from app.models.workout import AssignmentStatus
from app.schemas.drill import DrillResponse


# ---------- WORKOUT DRILLS (items within a workout) ----------

class WorkoutDrillCreate(BaseModel):
    """Adding a drill to a workout."""
    drill_id: int
    order_index: int
    custom_reps: Optional[int] = None
    custom_sets: Optional[int] = None
    custom_duration_seconds: Optional[int] = None
    notes: Optional[str] = None


class WorkoutDrillResponse(BaseModel):
    id: int
    drill_id: int
    order_index: int
    custom_reps: Optional[int] = None
    custom_sets: Optional[int] = None
    custom_duration_seconds: Optional[int] = None
    notes: Optional[str] = None
    drill: DrillResponse  # Include full drill info so the app has everything it needs

    model_config = {"from_attributes": True}


# ---------- WORKOUTS ----------

class WorkoutCreate(BaseModel):
    """Creating a new workout (with its drills)."""
    name: str
    description: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    is_template: bool = False
    drills: list[WorkoutDrillCreate] = []


class WorkoutUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    is_template: Optional[bool] = None
    # To update drills, send the complete new list — the API replaces them all
    drills: Optional[list[WorkoutDrillCreate]] = None


class WorkoutResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    is_template: bool
    drills: list[WorkoutDrillResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkoutListResponse(BaseModel):
    """Lighter response for listing workouts."""
    id: int
    name: str
    estimated_duration_minutes: Optional[int] = None
    is_template: bool
    drill_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- ASSIGNMENTS ----------

class AssignmentCreate(BaseModel):
    """Assign a workout to a student on a specific date."""
    workout_id: int
    student_id: int
    assigned_date: date


class BulkAssignmentCreate(BaseModel):
    """Assign a workout to a student across multiple dates at once."""
    workout_id: int
    student_id: int
    dates: list[date]


class AssignmentResponse(BaseModel):
    id: int
    workout_id: int
    student_id: int
    assigned_date: date
    status: AssignmentStatus
    workout: Optional[WorkoutResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}
