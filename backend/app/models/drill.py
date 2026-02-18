"""
Drill model.

This is the coach's master library. Each drill has a demo video of
the coach performing it, written instructions, and metadata like
difficulty, category, and equipment needed.
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Enum, DateTime, Text, Table, ForeignKey, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class DrillCategory(str, enum.Enum):
    BALL_HANDLING = "ball_handling"
    SHOOTING_FORM = "shooting_form"
    SHOOTING_MIDRANGE = "shooting_midrange"
    SHOOTING_THREE = "shooting_three"
    FREE_THROWS = "free_throws"
    FINISHING = "finishing"
    FOOTWORK = "footwork"
    DEFENSE = "defense"
    PASSING = "passing"
    CONDITIONING = "conditioning"
    BASKETBALL_IQ = "basketball_iq"
    WARMUP = "warmup"
    COOLDOWN = "cooldown"


class DrillDifficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# Association table for drill <-> tag (many-to-many)
drill_tag_association = Table(
    "drill_tag_association",
    Base.metadata,
    Column("drill_id", Integer, ForeignKey("drills.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("drill_tags.id"), primary_key=True),
)


class DrillTag(Base):
    """
    Tags for filtering drills. Examples:
    - "needs_hoop", "no_equipment", "needs_partner", "indoor_only",
    - "can_do_at_home", "needs_cones", "needs_wall"
    """
    __tablename__ = "drill_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    drills: Mapped[list["Drill"]] = relationship(
        "Drill", secondary=drill_tag_association, back_populates="tags"
    )


class Drill(Base):
    __tablename__ = "drills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Basic info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    coaching_cues: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Classification
    category: Mapped[DrillCategory] = mapped_column(Enum(DrillCategory), nullable=False)
    difficulty: Mapped[DrillDifficulty] = mapped_column(Enum(DrillDifficulty), nullable=False)

    # Default duration/reps (can be overridden per workout)
    default_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    default_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    default_sets: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Video — URL to the coach's demo video (stored in S3 or similar)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    tags: Mapped[list[DrillTag]] = relationship(
        "DrillTag", secondary=drill_tag_association, back_populates="drills"
    )
    workout_drills: Mapped[list["WorkoutDrill"]] = relationship(
        "WorkoutDrill", back_populates="drill"
    )

    def __repr__(self):
        return f"<Drill '{self.name}' ({self.category.value}, {self.difficulty.value})>"


from app.models.workout import WorkoutDrill  # noqa: E402
