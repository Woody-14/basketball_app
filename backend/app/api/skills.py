"""
Skill assessment endpoints.

GET  /api/skill-assessments/mine                         — Student: get own latest assessment
GET  /api/students/{id}/skill-assessments                — Coach: list all assessments for a student
POST /api/students/{id}/skill-assessments                — Coach: create new assessment
PATCH /api/students/{id}/skill-assessments/{assess_id}  — Coach: update an existing assessment
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.progress import SkillAssessment
from app.schemas.skill import SkillAssessmentCreate, SkillAssessmentUpdate, SkillAssessmentResponse
from app.services.auth import get_current_user, require_coach

router = APIRouter(tags=["Skill Assessments"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ==================== STUDENT ====================

@router.get("/api/skill-assessments/mine", response_model=SkillAssessmentResponse | None)
async def get_my_skill_assessment(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the student's most recent skill assessment, or null if none exists."""
    result = await db.execute(
        select(SkillAssessment)
        .where(SkillAssessment.student_id == current_user.id)
        .order_by(SkillAssessment.assessed_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# ==================== COACH ====================

@router.get(
    "/api/students/{student_id}/skill-assessments",
    response_model=list[SkillAssessmentResponse],
)
async def list_skill_assessments(
    student_id: int,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Coach: list all skill assessments for a student, newest first."""
    # Verify student exists
    result = await db.execute(
        select(User).where(User.id == student_id, User.role == UserRole.STUDENT)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student not found")

    result = await db.execute(
        select(SkillAssessment)
        .where(SkillAssessment.student_id == student_id)
        .order_by(SkillAssessment.assessed_at.desc())
    )
    return result.scalars().all()


@router.post(
    "/api/students/{student_id}/skill-assessments",
    response_model=SkillAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_skill_assessment(
    student_id: int,
    data: SkillAssessmentCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Coach: record a new skill assessment for a student."""
    result = await db.execute(
        select(User).where(User.id == student_id, User.role == UserRole.STUDENT)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student not found")

    assessment = SkillAssessment(
        student_id=student_id,
        assessed_at=data.assessed_at or _now(),
        ball_handling=data.ball_handling,
        shooting_form=data.shooting_form,
        shooting_accuracy=data.shooting_accuracy,
        footwork=data.footwork,
        finishing=data.finishing,
        court_vision=data.court_vision,
        athleticism=data.athleticism,
        defense=data.defense,
        notes=data.notes,
    )
    db.add(assessment)
    await db.flush()
    await db.refresh(assessment)
    return assessment


@router.patch(
    "/api/students/{student_id}/skill-assessments/{assessment_id}",
    response_model=SkillAssessmentResponse,
)
async def update_skill_assessment(
    student_id: int,
    assessment_id: int,
    data: SkillAssessmentUpdate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Coach: update scores or notes on an existing assessment."""
    result = await db.execute(
        select(SkillAssessment).where(
            SkillAssessment.id == assessment_id,
            SkillAssessment.student_id == student_id,
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assessment, field, value)

    await db.flush()
    await db.refresh(assessment)
    return assessment
