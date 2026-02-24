from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.workout import WorkoutAssignment
from app.services.auth import get_current_user

router = APIRouter(tags=["Assignments"])

@router.get("/assignments/me")
async def get_my_assignments(
    start_date: str = None,
    end_date: str = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the logged-in student's own assignments."""
    query = select(WorkoutAssignment).where(
        WorkoutAssignment.student_id == current_user.id
    ).options(
        selectinload(WorkoutAssignment.workout)
    )
    if start_date:
        query = query.where(WorkoutAssignment.scheduled_date >= start_date)
    if end_date:
        query = query.where(WorkoutAssignment.scheduled_date <= end_date)
    query = query.order_by(WorkoutAssignment.scheduled_date)
    result = await db.execute(query)
    return result.scalars().all()