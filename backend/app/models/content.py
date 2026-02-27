"""
Content feed models.

ContentPost handles both post types:
  - announcement: coach writes a broadcast message to all students
  - drill_of_week: coach pins a drill with an optional note
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Enum, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class PostType(str, enum.Enum):
    ANNOUNCEMENT = "announcement"
    DRILL_OF_WEEK = "drill_of_week"


class ContentPost(Base):
    __tablename__ = "content_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    post_type: Mapped[PostType] = mapped_column(Enum(PostType), nullable=False)

    # Announcement text OR optional coach note for drill_of_week posts
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Only set for drill_of_week posts
    drill_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("drills.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # When the post goes live. Defaults to now for immediate posts.
    # Set to a future datetime to schedule drill_of_week posts in advance.
    scheduled_for: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship — loaded via selectinload in feed queries
    drill: Mapped[Optional["Drill"]] = relationship("Drill")


# Avoid circular imports
from app.models.drill import Drill  # noqa: E402
