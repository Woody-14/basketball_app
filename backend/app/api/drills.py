"""
Drill library routes.

The coach's drill library is the foundation of everything — workouts
are built from drills. These endpoints let the coach manage that library.

GET    /api/drills           — List all drills (with filters)
POST   /api/drills           — Create a new drill (coach only)
GET    /api/drills/{id}      — Get drill details
PUT    /api/drills/{id}      — Update a drill (coach only)
DELETE /api/drills/{id}      — Delete a drill (coach only)
POST   /api/drills/tags      — Create a new tag (coach only)
GET    /api/drills/tags      — List all tags
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy import select, delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.drill import Drill, DrillTag, DrillCategory, DrillDifficulty
from app.models.phase import TrainingPhase, DrillPhase
from app.models.user import User
from app.schemas.drill import (
    DrillCreate, DrillUpdate, DrillResponse, DrillListResponse,
    TagCreate, TagResponse,
)
from app.services.auth import get_current_user, require_coach
from app.services.storage import get_presigned_url, upload_file, delete_file

router = APIRouter(prefix="/api/drills", tags=["Drills"])


def resolve_video_url(drill: Drill) -> Drill:
    """If drill has an R2 video_key, generate a fresh presigned URL."""
    if drill.video_key:
        drill.video_url = get_presigned_url(drill.video_key)
    return drill


@router.get("", response_model=list[DrillListResponse])
async def list_drills(
    category: Optional[DrillCategory] = Query(None, description="Filter by category"),
    difficulty: Optional[DrillDifficulty] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search by name"),
    tag: Optional[str] = Query(None, description="Filter by tag name"),
    phase: Optional[TrainingPhase] = Query(None, description="Filter by training phase"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all drills with optional filters.
    Both coaches and students can view the drill library.
    """
    query = select(Drill).options(selectinload(Drill.tags), selectinload(Drill.phases))

    if category:
        query = query.where(Drill.category == category)
    if difficulty:
        query = query.where(Drill.difficulty == difficulty)
    if search:
        query = query.where(Drill.name.ilike(f"%{search}%"))
    if tag:
        query = query.join(Drill.tags).where(DrillTag.name == tag)
    if phase:
        query = query.join(DrillPhase, DrillPhase.drill_id == Drill.id).where(
            DrillPhase.phase == phase.value
        )

    query = query.order_by(Drill.category, Drill.name)

    result = await db.execute(query)
    drills = result.scalars().unique().all()
    return drills


@router.post("", response_model=DrillResponse, status_code=status.HTTP_201_CREATED)
async def create_drill(
    data: DrillCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Create a new drill in the library. Coach only."""
    drill = Drill(
        name=data.name,
        description=data.description,
        coaching_cues=data.coaching_cues,
        category=data.category,
        difficulty=data.difficulty,
        default_duration_seconds=data.default_duration_seconds,
        default_reps=data.default_reps,
        default_sets=data.default_sets,
        video_url=data.video_url,
        video_key=data.video_key,
        thumbnail_url=data.thumbnail_url,
    )

    # Attach tags
    if data.tag_ids:
        result = await db.execute(select(DrillTag).where(DrillTag.id.in_(data.tag_ids)))
        tags = result.scalars().all()
        drill.tags = list(tags)

    db.add(drill)
    await db.flush()

    # Attach phases
    for p in data.phases:
        db.add(DrillPhase(drill_id=drill.id, phase=p.value))
    await db.flush()

    result = await db.execute(
        select(Drill)
        .options(selectinload(Drill.tags), selectinload(Drill.phases))
        .where(Drill.id == drill.id)
    )
    return resolve_video_url(result.scalar_one())


@router.get("/tags", response_model=list[TagResponse])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all available drill tags."""
    result = await db.execute(select(DrillTag).order_by(DrillTag.name))
    return result.scalars().all()


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Create a new drill tag. Coach only."""
    tag = DrillTag(name=data.name)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return tag


@router.get("/{drill_id}", response_model=DrillResponse)
async def get_drill(
    drill_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full details for a specific drill."""
    result = await db.execute(
        select(Drill)
        .options(selectinload(Drill.tags), selectinload(Drill.phases))
        .where(Drill.id == drill_id)
    )
    drill = result.scalar_one_or_none()
    if not drill:
        raise HTTPException(status_code=404, detail="Drill not found")
    return resolve_video_url(drill)


@router.put("/{drill_id}", response_model=DrillResponse)
async def update_drill(
    drill_id: int,
    data: DrillUpdate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing drill. Coach only."""
    result = await db.execute(
        select(Drill)
        .options(selectinload(Drill.tags), selectinload(Drill.phases))
        .where(Drill.id == drill_id)
    )
    drill = result.scalar_one_or_none()
    if not drill:
        raise HTTPException(status_code=404, detail="Drill not found")

    # Update only the fields that were provided
    update_data = data.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)
    phases = update_data.pop("phases", None)

    for field, value in update_data.items():
        setattr(drill, field, value)

    if tag_ids is not None:
        tag_result = await db.execute(select(DrillTag).where(DrillTag.id.in_(tag_ids)))
        drill.tags = list(tag_result.scalars().all())

    if phases is not None:
        await db.execute(sql_delete(DrillPhase).where(DrillPhase.drill_id == drill_id))
        for p in phases:
            db.add(DrillPhase(drill_id=drill_id, phase=p.value))

    await db.flush()

    result = await db.execute(
        select(Drill)
        .options(selectinload(Drill.tags), selectinload(Drill.phases))
        .where(Drill.id == drill_id)
    )
    return resolve_video_url(result.scalar_one())


@router.delete("/{drill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_drill(
    drill_id: int,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Delete a drill from the library. Coach only."""
    result = await db.execute(select(Drill).where(Drill.id == drill_id))
    drill = result.scalar_one_or_none()
    if not drill:
        raise HTTPException(status_code=404, detail="Drill not found")

    await db.delete(drill)
