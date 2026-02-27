"""
Training phase models.

TrainingPhase: Drew Hanlen-inspired periodization phases (Foundation → Post-Season).
DrillPhase: M2M association table — which phases each drill belongs to.
"""

import enum

from sqlalchemy import Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TrainingPhase(str, enum.Enum):
    FOUNDATION        = "foundation"
    SKILL_DEVELOPMENT = "skill_development"
    PRE_SEASON        = "pre_season"
    IN_SEASON         = "in_season"
    POST_SEASON       = "post_season"


class DrillPhase(Base):
    __tablename__ = "drill_phases"

    drill_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("drills.id", ondelete="CASCADE"),
        primary_key=True,
    )
    phase: Mapped[TrainingPhase] = mapped_column(
        Enum(TrainingPhase),
        primary_key=True,
    )
