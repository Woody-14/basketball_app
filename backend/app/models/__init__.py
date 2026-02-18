"""
Import all models here so that Alembic (migration tool) and SQLAlchemy
can discover them automatically.
"""

from app.models.user import User
from app.models.drill import Drill, DrillTag
from app.models.workout import Workout, WorkoutDrill, WorkoutAssignment
from app.models.progress import WorkoutCompletion, DrillCompletion, Badge, UserBadge, SkillAssessment

__all__ = [
    "User",
    "Drill", "DrillTag",
    "Workout", "WorkoutDrill", "WorkoutAssignment",
    "WorkoutCompletion", "DrillCompletion", "Badge", "UserBadge", "SkillAssessment",
]
