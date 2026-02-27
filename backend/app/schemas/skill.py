"""
Pydantic schemas for skill assessments.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


SKILL_FIELDS = [
    "ball_handling",
    "shooting_form",
    "shooting_accuracy",
    "footwork",
    "finishing",
    "court_vision",
    "athleticism",
    "defense",
]


class SkillAssessmentCreate(BaseModel):
    assessed_at: Optional[datetime] = None   # defaults to now() in endpoint
    ball_handling: Optional[float] = None    # 1–10 scale
    shooting_form: Optional[float] = None
    shooting_accuracy: Optional[float] = None
    footwork: Optional[float] = None
    finishing: Optional[float] = None
    court_vision: Optional[float] = None
    athleticism: Optional[float] = None
    defense: Optional[float] = None
    notes: Optional[str] = None


class SkillAssessmentUpdate(BaseModel):
    ball_handling: Optional[float] = None
    shooting_form: Optional[float] = None
    shooting_accuracy: Optional[float] = None
    footwork: Optional[float] = None
    finishing: Optional[float] = None
    court_vision: Optional[float] = None
    athleticism: Optional[float] = None
    defense: Optional[float] = None
    notes: Optional[str] = None


class SkillAssessmentResponse(BaseModel):
    id: int
    student_id: int
    assessed_at: datetime
    ball_handling: Optional[float] = None
    shooting_form: Optional[float] = None
    shooting_accuracy: Optional[float] = None
    footwork: Optional[float] = None
    finishing: Optional[float] = None
    court_vision: Optional[float] = None
    athleticism: Optional[float] = None
    defense: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}
