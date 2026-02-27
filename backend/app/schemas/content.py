"""
Pydantic schemas for the content feed API.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.content import PostType
from app.models.drill import DrillCategory


class DrillBrief(BaseModel):
    """Minimal drill info embedded in a drill_of_week feed card."""
    id: int
    name: str
    category: DrillCategory
    description: str
    coaching_cues: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ContentPostCreate(BaseModel):
    post_type: PostType
    # Required for announcement; optional coach note for drill_of_week
    content: Optional[str] = None
    # Required when post_type == drill_of_week
    drill_id: Optional[int] = None
    # Optional future publish datetime (ISO 8601). Defaults to now if omitted.
    scheduled_for: Optional[datetime] = None


class ContentPostResponse(BaseModel):
    id: int
    post_type: PostType
    content: Optional[str] = None
    drill_id: Optional[int] = None
    scheduled_for: datetime
    created_at: datetime
    drill: Optional[DrillBrief] = None

    model_config = {"from_attributes": True}
