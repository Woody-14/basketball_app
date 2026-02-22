"""
Pydantic schemas for the messaging system.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.user import UserRole


class MessageSender(BaseModel):
    """Minimal sender info embedded in every MessageResponse."""
    id: int
    first_name: str
    role: UserRole

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    """
    Body for sending a message.

    Students: only `content` is needed — the recipient (the coach) is
    automatically determined server-side.

    Coaches: must also supply `recipient_id` (the student's user ID).
    """
    content: str
    recipient_id: Optional[int] = None


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    sender: MessageSender
    content: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
