"""
Pydantic schemas for Drill-related API requests and responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator

from app.models.drill import DrillCategory, DrillDifficulty
from app.models.phase import TrainingPhase


class DrillCreate(BaseModel):
    name: str
    description: str
    coaching_cues: Optional[str] = None
    category: DrillCategory
    difficulty: DrillDifficulty
    default_duration_seconds: Optional[int] = None
    default_reps: Optional[int] = None
    default_sets: Optional[int] = None
    video_key: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tag_ids: list[int] = []  # IDs of existing tags to attach
    phases: list[TrainingPhase] = []  # Training phases this drill belongs to


class DrillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    coaching_cues: Optional[str] = None
    category: Optional[DrillCategory] = None
    difficulty: Optional[DrillDifficulty] = None
    default_duration_seconds: Optional[int] = None
    default_reps: Optional[int] = None
    default_sets: Optional[int] = None
    video_key: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tag_ids: Optional[list[int]] = None
    phases: Optional[list[TrainingPhase]] = None  # None = don't change; [] = remove all


class TagResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class DrillResponse(BaseModel):
    id: int
    name: str
    description: str
    coaching_cues: Optional[str] = None
    category: DrillCategory
    difficulty: DrillDifficulty
    default_duration_seconds: Optional[int] = None
    default_reps: Optional[int] = None
    default_sets: Optional[int] = None
    video_key: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tags: list[TagResponse] = []
    phases: list[TrainingPhase] = []
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator('phases', mode='before')
    @classmethod
    def extract_phases(cls, v):
        # DrillPhase ORM rows → plain TrainingPhase enum values (runs before per-item validation)
        if not v:
            return []
        return [item.phase if hasattr(item, 'phase') else item for item in v]


class DrillListResponse(BaseModel):
    """Lighter response for listing many drills."""
    id: int
    name: str
    category: DrillCategory
    difficulty: DrillDifficulty
    thumbnail_url: Optional[str] = None
    tags: list[TagResponse] = []
    phases: list[TrainingPhase] = []

    model_config = {"from_attributes": True}

    @field_validator('phases', mode='before')
    @classmethod
    def extract_phases(cls, v):
        if not v:
            return []
        return [item.phase if hasattr(item, 'phase') else item for item in v]


class TagCreate(BaseModel):
    name: str
