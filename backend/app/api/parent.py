"""
Parent portal endpoints (read-only views of a child's progress).

GET /api/parent/child                  — child's profile + stats
GET /api/parent/child/assignments      — last 60 days of assignments
GET /api/parent/child/skill-assessment — latest skill assessment
GET /api/parent/child/form-checks      — form checks with coach feedback
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.workout import WorkoutAssignment, WorkoutDrill, AssignmentStatus
from app.models.progress import WorkoutCompletion, DrillCompletion, SkillAssessment, UserBadge, Badge
from app.schemas.user import UserProfile, BadgeResponse
from app.services.auth import require_parent
from app.services.storage import get_presigned_url

router = APIRouter(prefix="/api/parent", tags=["Parent Portal"])


async def _get_child(parent: User, db: AsyncSession) -> User:
    """Find the student whose parent_id matches the logged-in parent."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.badges).selectinload(UserBadge.badge))
        .where(User.parent_id == parent.id, User.role == UserRole.STUDENT)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(
            status_code=404,
            detail="No student account is linked to your parent account yet. Contact your coach."
        )
    return child


@router.get("/child")
async def get_child_profile(
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent: get their child's profile, stats, and badges."""
    child = await _get_child(parent, db)

    # Build compliance rate from assignments
    total_result = await db.execute(
        select(WorkoutAssignment).where(WorkoutAssignment.student_id == child.id)
    )
    assignments = total_result.scalars().all()
    total = len(assignments)
    completed = sum(1 for a in assignments if a.status == AssignmentStatus.COMPLETED)
    compliance = round((completed / total * 100), 1) if total > 0 else 0.0

    badges = []
    for ub in child.badges:
        b = ub.badge
        if b:
            badges.append({
                "id": b.id,
                "name": b.name,
                "description": b.description,
                "earned_at": ub.awarded_at,
            })

    return {
        "id": child.id,
        "first_name": child.first_name,
        "last_name": child.last_name,
        "age": child.age,
        "position": child.position,
        "school": child.school,
        "subscription_tier": child.subscription_tier,
        "current_streak": child.current_streak,
        "longest_streak": child.longest_streak,
        "compliance_rate": compliance,
        "total_completed": completed,
        "total_assigned": total,
        "badges": badges,
    }


@router.get("/child/assignments")
async def get_child_assignments(
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent: get child's last 60 days of workout assignments."""
    child = await _get_child(parent, db)

    cutoff = datetime.now(timezone.utc) - timedelta(days=60)
    result = await db.execute(
        select(WorkoutAssignment)
        .options(selectinload(WorkoutAssignment.workout))
        .where(
            WorkoutAssignment.student_id == child.id,
            WorkoutAssignment.assigned_date >= cutoff.date(),
        )
        .order_by(WorkoutAssignment.assigned_date.desc())
    )
    assignments = result.scalars().all()

    return [
        {
            "id": a.id,
            "assigned_date": str(a.assigned_date),
            "status": a.status.value if a.status else "scheduled",
            "workout_name": a.workout.name if a.workout else "Workout",
            "drill_count": a.workout.drill_count if a.workout else 0,
        }
        for a in assignments
    ]


@router.get("/child/skill-assessment")
async def get_child_skill_assessment(
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent: get child's most recent skill assessment."""
    child = await _get_child(parent, db)

    result = await db.execute(
        select(SkillAssessment)
        .where(SkillAssessment.student_id == child.id)
        .order_by(SkillAssessment.assessed_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/child/form-checks")
async def get_child_form_checks(
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent: get child's form check submissions with coach feedback."""
    child = await _get_child(parent, db)

    result = await db.execute(
        select(DrillCompletion)
        .options(
            selectinload(DrillCompletion.workout_drill).selectinload(WorkoutDrill.drill),
            selectinload(DrillCompletion.workout_completion)
                .selectinload(WorkoutCompletion.assignment),
        )
        .join(WorkoutCompletion, DrillCompletion.workout_completion_id == WorkoutCompletion.id)
        .where(
            WorkoutCompletion.student_id == child.id,
            DrillCompletion.video_url.isnot(None),
        )
        .order_by(DrillCompletion.completed_at.desc())
        .limit(10)
    )
    drill_completions = result.scalars().unique().all()

    items = []
    for dc in drill_completions:
        video_url = None
        if dc.video_url:
            try:
                video_url = get_presigned_url(dc.video_url)
            except Exception:
                pass

        drill_name = None
        if dc.workout_drill and dc.workout_drill.drill:
            drill_name = dc.workout_drill.drill.name

        assigned_date = None
        if dc.workout_completion and dc.workout_completion.assignment:
            assigned_date = str(dc.workout_completion.assignment.assigned_date)

        items.append({
            "id": dc.id,
            "drill_name": drill_name,
            "completed_at": dc.completed_at,
            "assigned_date": assigned_date,
            "video_url": video_url,
            "coach_feedback": dc.coach_feedback,
            "is_reviewed": dc.is_reviewed,
            "feedback_at": dc.feedback_at,
        })

    return items
