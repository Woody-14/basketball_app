"""
Pydantic schemas for workout completions and form check videos.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WorkoutCompletionCreate(BaseModel):
    assignment_id: int
    total_seconds: Optional[int] = None
    self_rating: Optional[int] = None   # 1–5 scale
    self_notes: Optional[str] = None


class WorkoutCompletionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    completed_at: datetime
    total_seconds: Optional[int] = None
    self_rating: Optional[int] = None

    model_config = {"from_attributes": True}


# ---------- FORM CHECKS ----------

class FormCheckDrillInfo(BaseModel):
    id: int
    name: str
    category: str

    model_config = {"from_attributes": True}


class FormCheckStudentInfo(BaseModel):
    id: int
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class FormCheckResponse(BaseModel):
    id: int
    workout_completion_id: int
    workout_drill_id: int
    completed_at: datetime
    video_url: Optional[str] = None     # Presigned R2 URL (1-hour expiry)
    video_key: Optional[str] = None     # Raw R2 storage key
    coach_feedback: Optional[str] = None
    coach_video_feedback_url: Optional[str] = None
    is_reviewed: bool
    feedback_at: Optional[datetime] = None

    # Nested info for display
    drill: Optional[FormCheckDrillInfo] = None
    student: Optional[FormCheckStudentInfo] = None
    assigned_date: Optional[str] = None  # From the workout assignment

    model_config = {"from_attributes": True}


class CoachFeedbackCreate(BaseModel):
    feedback: str
