"""
Workout completion and form check video endpoints.

Completions:
  POST /api/completions               — Student creates a WorkoutCompletion record

Form Checks:
  POST /api/form-checks               — Student submits a drill form check video
  GET  /api/form-checks/mine          — Student gets own form check history + feedback
  GET  /api/form-checks/pending       — Coach gets all pending video reviews
  PATCH /api/form-checks/{id}/feedback — Coach submits text feedback on a video
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.workout import WorkoutAssignment, WorkoutDrill, AssignmentStatus
from app.models.progress import WorkoutCompletion, DrillCompletion
from app.models.drill import Drill
from app.schemas.completion import (
    WorkoutCompletionCreate, WorkoutCompletionResponse,
    FormCheckResponse, CoachFeedbackCreate,
    FormCheckDrillInfo, FormCheckStudentInfo,
)
from app.services.auth import get_current_user, require_coach
from app.services.storage import upload_file, get_presigned_url

router = APIRouter(tags=["Completions & Form Checks"])

MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "video/webm", "video/x-m4v",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_form_check_response(dc: DrillCompletion, student: User | None = None) -> dict:
    """Build a FormCheckResponse dict, generating a fresh presigned URL."""
    video_url = None
    if dc.video_url:
        try:
            video_url = get_presigned_url(dc.video_url)
        except Exception:
            video_url = None

    drill_info = None
    if dc.workout_drill and dc.workout_drill.drill:
        d = dc.workout_drill.drill
        drill_info = {"id": d.id, "name": d.name, "category": d.category}

    student_info = None
    if student:
        student_info = {"id": student.id, "first_name": student.first_name, "last_name": student.last_name}

    assigned_date = None
    if dc.workout_completion and dc.workout_completion.assignment:
        assigned_date = str(dc.workout_completion.assignment.assigned_date)

    return {
        "id": dc.id,
        "workout_completion_id": dc.workout_completion_id,
        "workout_drill_id": dc.workout_drill_id,
        "completed_at": dc.completed_at,
        "video_url": video_url,
        "video_key": dc.video_url,   # raw key stored in video_url field
        "coach_feedback": dc.coach_feedback,
        "coach_video_feedback_url": dc.coach_video_feedback_url,
        "is_reviewed": dc.is_reviewed,
        "feedback_at": dc.feedback_at,
        "drill": drill_info,
        "student": student_info,
        "assigned_date": assigned_date,
    }


# ==================== WORKOUT COMPLETIONS ====================

@router.post("/api/completions", response_model=WorkoutCompletionResponse, status_code=status.HTTP_201_CREATED)
async def create_completion(
    data: WorkoutCompletionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Record a WorkoutCompletion for a finished assignment.
    Called by the mobile app immediately after marking the assignment complete.
    """
    # Verify the assignment exists and belongs to this student
    result = await db.execute(
        select(WorkoutAssignment).where(WorkoutAssignment.id == data.assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assignment")

    # Don't allow duplicate completion records
    existing = await db.execute(
        select(WorkoutCompletion).where(WorkoutCompletion.assignment_id == data.assignment_id)
    )
    if existing.scalar_one_or_none():
        # Return the existing record rather than error — idempotent
        existing_record = existing.scalar_one_or_none()
        # Re-fetch since we already consumed the result
        result2 = await db.execute(
            select(WorkoutCompletion).where(WorkoutCompletion.assignment_id == data.assignment_id)
        )
        return result2.scalar_one()

    now = _now()
    completion = WorkoutCompletion(
        assignment_id=data.assignment_id,
        student_id=current_user.id,
        started_at=now,
        completed_at=now,
        duration_minutes=(data.total_seconds // 60) if data.total_seconds else None,
        self_rating=data.self_rating,
        self_notes=data.self_notes,
    )
    db.add(completion)
    await db.flush()
    await db.refresh(completion)
    return completion


# ==================== FORM CHECKS ====================

@router.post("/api/form-checks", status_code=status.HTTP_201_CREATED)
async def submit_form_check(
    completion_id: int = Form(...),
    workout_drill_id: int = Form(...),
    video: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a form check video for a specific drill in a completed workout.
    Creates a DrillCompletion record and stores the video in R2.
    """
    # Validate video type
    if video.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{video.content_type}'. Must be a video (mp4, mov, avi, webm)."
        )

    # Verify the WorkoutCompletion belongs to this student
    result = await db.execute(
        select(WorkoutCompletion).where(WorkoutCompletion.id == completion_id)
    )
    completion = result.scalar_one_or_none()
    if not completion:
        raise HTTPException(status_code=404, detail="Completion not found")
    if completion.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your completion")

    # Verify the WorkoutDrill exists
    result = await db.execute(
        select(WorkoutDrill)
        .options(selectinload(WorkoutDrill.drill))
        .where(WorkoutDrill.id == workout_drill_id)
    )
    workout_drill = result.scalar_one_or_none()
    if not workout_drill:
        raise HTTPException(status_code=404, detail="Drill not found in this workout")

    # Read and validate file size
    content = await video.read()
    if len(content) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="Video too large (max 500MB)")

    # Upload to R2
    try:
        key = upload_file(
            file_bytes=content,
            original_filename=video.filename or "form-check.mp4",
            content_type=video.content_type,
            folder="form-checks",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # Create DrillCompletion record
    drill_completion = DrillCompletion(
        workout_completion_id=completion_id,
        workout_drill_id=workout_drill_id,
        completed_at=_now(),
        video_url=key,   # Store the R2 key; presigned URL generated at read time
    )
    db.add(drill_completion)
    await db.flush()

    # Reload with relationships for response
    result = await db.execute(
        select(DrillCompletion)
        .options(
            selectinload(DrillCompletion.workout_drill).selectinload(WorkoutDrill.drill),
            selectinload(DrillCompletion.workout_completion)
                .selectinload(WorkoutCompletion.assignment),
        )
        .where(DrillCompletion.id == drill_completion.id)
    )
    dc = result.scalar_one()

    return _to_form_check_response(dc, student=current_user)


@router.get("/api/form-checks/mine")
async def get_my_form_checks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Student: get own form check history, newest first.
    Includes coach feedback when available.
    """
    result = await db.execute(
        select(DrillCompletion)
        .options(
            selectinload(DrillCompletion.workout_drill).selectinload(WorkoutDrill.drill),
            selectinload(DrillCompletion.workout_completion)
                .selectinload(WorkoutCompletion.assignment),
        )
        .join(WorkoutCompletion, DrillCompletion.workout_completion_id == WorkoutCompletion.id)
        .where(
            WorkoutCompletion.student_id == current_user.id,
            DrillCompletion.video_url.isnot(None),
        )
        .order_by(DrillCompletion.completed_at.desc())
    )
    drill_completions = result.scalars().unique().all()
    return [_to_form_check_response(dc, student=current_user) for dc in drill_completions]


@router.get("/api/form-checks/pending")
async def get_pending_reviews(
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Coach: get all student form check videos awaiting review.
    """
    result = await db.execute(
        select(DrillCompletion)
        .options(
            selectinload(DrillCompletion.workout_drill).selectinload(WorkoutDrill.drill),
            selectinload(DrillCompletion.workout_completion)
                .selectinload(WorkoutCompletion.assignment),
            selectinload(DrillCompletion.workout_completion)
                .selectinload(WorkoutCompletion.student),
        )
        .join(WorkoutCompletion, DrillCompletion.workout_completion_id == WorkoutCompletion.id)
        .where(
            DrillCompletion.video_url.isnot(None),
            DrillCompletion.is_reviewed == False,
        )
        .order_by(DrillCompletion.completed_at.asc())
    )
    drill_completions = result.scalars().unique().all()

    responses = []
    for dc in drill_completions:
        student = dc.workout_completion.student if dc.workout_completion else None
        responses.append(_to_form_check_response(dc, student=student))
    return responses


@router.patch("/api/form-checks/{form_check_id}/feedback")
async def submit_feedback(
    form_check_id: int,
    data: CoachFeedbackCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Coach: submit text feedback on a form check video and mark it as reviewed.
    """
    result = await db.execute(
        select(DrillCompletion)
        .options(
            selectinload(DrillCompletion.workout_drill).selectinload(WorkoutDrill.drill),
            selectinload(DrillCompletion.workout_completion)
                .selectinload(WorkoutCompletion.assignment),
            selectinload(DrillCompletion.workout_completion)
                .selectinload(WorkoutCompletion.student),
        )
        .where(DrillCompletion.id == form_check_id)
    )
    dc = result.scalar_one_or_none()
    if not dc:
        raise HTTPException(status_code=404, detail="Form check not found")
    if not dc.video_url:
        raise HTTPException(status_code=400, detail="No video submitted for this drill")

    dc.coach_feedback = data.feedback
    dc.is_reviewed = True
    dc.feedback_at = _now()
    await db.flush()

    student = dc.workout_completion.student if dc.workout_completion else None
    return _to_form_check_response(dc, student=student)
