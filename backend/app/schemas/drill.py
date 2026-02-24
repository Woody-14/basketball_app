"""
Pydantic schemas for Drill-related API requests and responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.drill import DrillCategory, DrillDifficulty


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
    created_at: datetime

    model_config = {"from_attributes": True}


class DrillListResponse(BaseModel):
    """Lighter response for listing many drills."""
    id: int
    name: str
    category: DrillCategory
    difficulty: DrillDifficulty
    thumbnail_url: Optional[str] = None
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str
