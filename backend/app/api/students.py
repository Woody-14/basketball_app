"""
Student management routes (Coach admin).

GET    /api/students            — List all students with stats
GET    /api/students/{id}       — Get detailed student profile (admin view)
PUT    /api/students/{id}       — Update student info
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.workout import WorkoutAssignment, AssignmentStatus
from app.models.progress import DrillCompletion, UserBadge
from app.schemas.user import StudentAdminView, UserUpdate
from app.services.auth import require_coach
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get("", response_model=list[StudentAdminView])
async def list_students(
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    List all students with computed stats.
    Powers the coach's main student roster/dashboard.
    """
    result = await db.execute(
        select(User)
        .options(selectinload(User.badges).selectinload(UserBadge.badge))
        .where(User.role == UserRole.STUDENT)
        .order_by(User.last_name, User.first_name)
    )
    students = result.scalars().all()

    responses = []
    for student in students:
        # Calculate compliance rate: completed / total assignments
        total_result = await db.execute(
            select(func.count()).where(WorkoutAssignment.student_id == student.id)
        )
        total = total_result.scalar()

        completed_result = await db.execute(
            select(func.count()).where(
                WorkoutAssignment.student_id == student.id,
                WorkoutAssignment.status == AssignmentStatus.COMPLETED,
            )
        )
        completed = completed_result.scalar()

        compliance = (completed / total * 100) if total > 0 else 0.0

        # Count pending video reviews
        pending_result = await db.execute(
            select(func.count()).where(
                DrillCompletion.is_reviewed == False,
                DrillCompletion.video_url.isnot(None),
            )
            # TODO: Join through to filter by student_id properly
            # For MVP this counts all pending — we'll refine this
        )
        pending = pending_result.scalar()

        response = StudentAdminView.model_validate(student)
        response.compliance_rate = round(compliance, 1)
        response.pending_video_reviews = pending
        responses.append(response)

    return responses


@router.get("/{student_id}", response_model=StudentAdminView)
async def get_student(
    student_id: int,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed student profile with stats. Coach only."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.badges).selectinload(UserBadge.badge))
        .where(User.id == student_id, User.role == UserRole.STUDENT)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return StudentAdminView.model_validate(student)


@router.put("/{student_id}", response_model=StudentAdminView)
async def update_student(
    student_id: int,
    data: UserUpdate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Update a student's profile. Coach only."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.badges).selectinload(UserBadge.badge))
        .where(User.id == student_id, User.role == UserRole.STUDENT)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    await db.flush()
    await db.refresh(student)
    return StudentAdminView.model_validate(student)
