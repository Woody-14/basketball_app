"""
Workout & Assignment routes.

Workouts:
  POST   /api/workouts              — Create a workout (coach)
  GET    /api/workouts              — List workouts / templates (coach)
  GET    /api/workouts/{id}         — Get workout details
  PUT    /api/workouts/{id}         — Update a workout (coach)
  DELETE /api/workouts/{id}         — Delete a workout (coach)

Assignments:
  POST   /api/assignments           — Assign workout to student (coach)
  POST   /api/assignments/bulk      — Assign workout to multiple dates (coach)
  GET    /api/assignments/me        — Get my assignments (student)
  GET    /api/assignments/student/{id} — Get a student's assignments (coach)
  PATCH  /api/assignments/{id}/complete — Mark assignment complete (student)
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.workout import Workout, WorkoutDrill, WorkoutAssignment, AssignmentStatus
from app.models.drill import Drill
from app.schemas.workout import (
    WorkoutCreate, WorkoutUpdate, WorkoutResponse, WorkoutListResponse,
    AssignmentCreate, BulkAssignmentCreate, AssignmentResponse,
)
from app.schemas.user import WorkoutCompleteResponse, BadgeResponse
from app.services.auth import get_current_user, require_coach
from app.services.badges import evaluate_badges
from app.services.push import notify_user
from app.services.xp import calculate_xp_earned, calculate_level

router = APIRouter(tags=["Workouts & Assignments"])


# ==================== WORKOUTS ====================

@router.post("/api/workouts", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
async def create_workout(
    data: WorkoutCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new workout from drills in the library.
    The coach selects drills, sets their order, and optionally
    overrides reps/sets/duration for each drill.
    """
    workout = Workout(
        name=data.name,
        description=data.description,
        estimated_duration_minutes=data.estimated_duration_minutes,
        is_template=data.is_template,
    )

    # Add drills to the workout
    for drill_data in data.drills:
        # Verify the drill exists
        result = await db.execute(select(Drill).where(Drill.id == drill_data.drill_id))
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=404,
                detail=f"Drill with id {drill_data.drill_id} not found",
            )

        workout_drill = WorkoutDrill(
            drill_id=drill_data.drill_id,
            order_index=drill_data.order_index,
            custom_reps=drill_data.custom_reps,
            custom_sets=drill_data.custom_sets,
            custom_duration_seconds=drill_data.custom_duration_seconds,
            notes=drill_data.notes,
        )
        workout.drills.append(workout_drill)

    db.add(workout)
    await db.flush()

    # Reload with all relationships for the response
    result = await db.execute(
        select(Workout)
        .options(
            selectinload(Workout.drills).selectinload(WorkoutDrill.drill).selectinload(Drill.tags)
        )
        .where(Workout.id == workout.id)
    )
    return result.scalar_one()


@router.get("/api/workouts", response_model=list[WorkoutListResponse])
async def list_workouts(
    templates_only: bool = Query(False, description="Only show saved templates"),
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """List all workouts. Coach only."""
    query = select(Workout)
    if templates_only:
        query = query.where(Workout.is_template == True)
    query = query.order_by(Workout.created_at.desc())

    result = await db.execute(query)
    workouts = result.scalars().all()

    # Compute drill count for list view
    responses = []
    for w in workouts:
        count_result = await db.execute(
            select(func.count()).where(WorkoutDrill.workout_id == w.id)
        )
        responses.append(WorkoutListResponse(
            id=w.id,
            name=w.name,
            estimated_duration_minutes=w.estimated_duration_minutes,
            is_template=w.is_template,
            drill_count=count_result.scalar(),
            created_at=w.created_at,
        ))

    return responses


@router.get("/api/workouts/{workout_id}", response_model=WorkoutResponse)
async def get_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full workout details including all drills."""
    result = await db.execute(
        select(Workout)
        .options(
            selectinload(Workout.drills).selectinload(WorkoutDrill.drill).selectinload(Drill.tags)
        )
        .where(Workout.id == workout_id)
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.put("/api/workouts/{workout_id}", response_model=WorkoutResponse)
async def update_workout(
    workout_id: int,
    data: WorkoutUpdate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a workout. If drills are provided, the existing drill list
    is completely replaced (simpler than trying to do partial updates
    on an ordered list).
    """
    result = await db.execute(
        select(Workout)
        .options(selectinload(Workout.drills))
        .where(Workout.id == workout_id)
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    update_data = data.model_dump(exclude_unset=True)
    drills_data = update_data.pop("drills", None)

    # Update simple fields
    for field, value in update_data.items():
        setattr(workout, field, value)

    # Replace drills if provided
    if drills_data is not None:
        # Remove old drills
        for old_drill in workout.drills:
            await db.delete(old_drill)

        # Add new drills
        workout.drills = []
        for drill_data in drills_data:
            workout_drill = WorkoutDrill(
                workout_id=workout.id,
                drill_id=drill_data["drill_id"],
                order_index=drill_data["order_index"],
                custom_reps=drill_data.get("custom_reps"),
                custom_sets=drill_data.get("custom_sets"),
                custom_duration_seconds=drill_data.get("custom_duration_seconds"),
                notes=drill_data.get("notes"),
            )
            workout.drills.append(workout_drill)

    await db.flush()

    # Reload for response
    result = await db.execute(
        select(Workout)
        .options(
            selectinload(Workout.drills).selectinload(WorkoutDrill.drill).selectinload(Drill.tags)
        )
        .where(Workout.id == workout.id)
    )
    return result.scalar_one()


@router.delete("/api/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: int,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workout. Coach only."""
    result = await db.execute(select(Workout).where(Workout.id == workout_id))
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    await db.delete(workout)


# ==================== ASSIGNMENTS ====================

@router.post("/api/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    data: AssignmentCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Assign a workout to a student for a specific date. Coach only."""
    # Verify student exists
    student_result = await db.execute(select(User).where(User.id == data.student_id))
    student = student_result.scalar_one_or_none()
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify workout exists
    workout_result = await db.execute(select(Workout).where(Workout.id == data.workout_id))
    if not workout_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workout not found")

    assignment = WorkoutAssignment(
        workout_id=data.workout_id,
        student_id=data.student_id,
        assigned_date=data.assigned_date,
        status=AssignmentStatus.SCHEDULED,
    )
    db.add(assignment)
    await db.flush()

    result = await db.execute(
        select(WorkoutAssignment)
        .options(
            selectinload(WorkoutAssignment.workout)
            .selectinload(Workout.drills)
            .selectinload(WorkoutDrill.drill)
            .selectinload(Drill.tags)
        )
        .where(WorkoutAssignment.id == assignment.id)
    )
    loaded = result.scalar_one()

    await notify_user(
        data.student_id,
        "New Workout",
        f"{loaded.workout.name} assigned for {data.assigned_date}",
        db,
    )

    return loaded


@router.post("/api/assignments/bulk", response_model=list[AssignmentResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_assignments(
    data: BulkAssignmentCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign a workout to a student across multiple dates at once.
    Useful for setting up a full week: "Do this workout Mon, Wed, Fri."
    """
    assignments = []
    for d in data.dates:
        assignment = WorkoutAssignment(
            workout_id=data.workout_id,
            student_id=data.student_id,
            assigned_date=d,
            status=AssignmentStatus.SCHEDULED,
        )
        db.add(assignment)
        await db.flush()

        # Reload with workout relationship
        result = await db.execute(
            select(WorkoutAssignment)
            .options(
                selectinload(WorkoutAssignment.workout)
                .selectinload(Workout.drills)
                .selectinload(WorkoutDrill.drill)
                .selectinload(Drill.tags)
            )
            .where(WorkoutAssignment.id == assignment.id)
        )
        assignments.append(result.scalar_one())

    await notify_user(
        data.student_id,
        "Workouts Assigned",
        f"{len(data.dates)} workouts added to your schedule",
        db,
    )

    return assignments


@router.get("/api/assignments/me", response_model=list[AssignmentResponse])
async def get_my_assignments(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current student's workout assignments.
    This powers the student's home screen and calendar.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students have assignments")

    query = (
        select(WorkoutAssignment)
        .options(
            selectinload(WorkoutAssignment.workout)
            .selectinload(Workout.drills)
            .selectinload(WorkoutDrill.drill)
            .selectinload(Drill.tags)
        )
        .where(WorkoutAssignment.student_id == current_user.id)
    )

    if start_date:
        query = query.where(WorkoutAssignment.assigned_date >= start_date)
    if end_date:
        query = query.where(WorkoutAssignment.assigned_date <= end_date)

    query = query.order_by(WorkoutAssignment.assigned_date)

    result = await db.execute(query)
    return result.scalars().unique().all()


@router.patch("/api/assignments/{assignment_id}/complete", response_model=WorkoutCompleteResponse)
async def complete_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a workout assignment as completed by the student."""
    result = await db.execute(
        select(WorkoutAssignment)
        .where(WorkoutAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assignment")

    assignment.status = AssignmentStatus.COMPLETED

    # Update the student's streak
    student_result = await db.execute(select(User).where(User.id == current_user.id))
    student = student_result.scalar_one_or_none()

    xp_gained = 0
    new_badges: list = []
    leveled_up = False

    if student:
        # Recalculate streak from scratch instead of blindly incrementing.
        # Streak = consecutive completed workouts counting backwards from the
        # most recent. Any missed assignment resets it to 0.
        all_assignments_result = await db.execute(
            select(WorkoutAssignment)
            .where(WorkoutAssignment.student_id == student.id)
            .order_by(WorkoutAssignment.assigned_date.desc())
        )
        all_assignments = all_assignments_result.scalars().all()

        today = date.today()
        # Exclude future assignments; also skip today if it's still pending
        # (we just completed it above, so its status is now COMPLETED)
        past = [a for a in all_assignments if a.assigned_date <= today]

        new_streak = 0
        for a in past:
            if a.status == AssignmentStatus.COMPLETED:
                new_streak += 1
            else:
                break  # First missed workout ends the streak

        student.current_streak = new_streak
        if student.current_streak > (student.longest_streak or 0):
            student.longest_streak = student.current_streak

        await db.flush()

        # Evaluate and award badges; notify for each newly earned one
        new_badges = await evaluate_badges(student, db)
        for badge in new_badges:
            await notify_user(student.id, "Badge Earned!", f"You earned the {badge.name} badge", db)

        # Award XP
        xp_gained = calculate_xp_earned(student.current_streak, len(new_badges))
        old_level = student.level or 1
        student.xp = (student.xp or 0) + xp_gained
        student.level = calculate_level(student.xp)
        leveled_up = student.level > old_level

    await db.flush()

    return WorkoutCompleteResponse(
        xp_earned=xp_gained,
        new_level=student.level if leveled_up else None,
        new_badges=[
            BadgeResponse(
                id=b.id,
                name=b.name,
                description=b.description,
                badge_type=b.badge_type,
                threshold_value=b.threshold_value,
                icon_url=b.icon_url,
                earned_at=None,
            )
            for b in new_badges
        ],
    )


@router.get("/api/assignments/student/{student_id}", response_model=list[AssignmentResponse])
async def get_student_assignments(
    student_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific student's assignments. Coach only."""
    query = (
        select(WorkoutAssignment)
        .where(WorkoutAssignment.student_id == student_id)
    )
    if start_date:
        query = query.where(WorkoutAssignment.assigned_date >= start_date)
    if end_date:
        query = query.where(WorkoutAssignment.assigned_date <= end_date)
    query = query.order_by(WorkoutAssignment.assigned_date)

    result = await db.execute(query)
    return result.scalars().all()
