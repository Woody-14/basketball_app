"""
Content Feed routes.

GET    /api/feed                 — Published posts (any authenticated user)
GET    /api/feed/drill-of-week   — Current active drill of the week (any authenticated user)
GET    /api/feed/scheduled       — Future-scheduled drill posts (coach only)
POST   /api/feed                 — Create a post (coach only)
DELETE /api/feed/{id}            — Delete a post (coach only)

Visibility rules:
  - Announcements: always visible once scheduled_for <= now
  - Drill of the week: visible when scheduled_for <= now AND scheduled_for >= now - 7 days
  - Future posts (scheduled_for > now) are hidden from students;
    only accessible to the coach via /api/feed/scheduled
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.content import ContentPost, PostType
from app.models.drill import Drill
from app.schemas.content import ContentPostCreate, ContentPostResponse
from app.models.user import User
from app.services.auth import get_current_user, require_coach

router = APIRouter(tags=["Content Feed"])

DRILL_EXPIRY_DAYS = 7


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/api/feed", response_model=list[ContentPostResponse])
async def get_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all posts currently visible to students:
    - Announcements where scheduled_for <= now
    - Drill-of-week posts where scheduled_for <= now AND scheduled_for >= now - 7 days

    Ordered newest-scheduled first.
    """
    now = _now()
    expiry_cutoff = now - timedelta(days=DRILL_EXPIRY_DAYS)

    result = await db.execute(
        select(ContentPost)
        .options(selectinload(ContentPost.drill))
        .where(
            or_(
                # Announcements: live (scheduled_for in the past) but no expiry
                and_(
                    ContentPost.post_type == PostType.ANNOUNCEMENT,
                    ContentPost.scheduled_for <= now,
                ),
                # Drill of week: live AND not yet expired
                and_(
                    ContentPost.post_type == PostType.DRILL_OF_WEEK,
                    ContentPost.scheduled_for <= now,
                    ContentPost.scheduled_for >= expiry_cutoff,
                ),
            )
        )
        .order_by(ContentPost.scheduled_for.desc())
    )
    return result.scalars().all()


@router.get("/api/feed/scheduled", response_model=list[ContentPostResponse])
async def get_scheduled_posts(
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all future-scheduled drill_of_week posts (coach only).
    These are posts that haven't gone live yet (scheduled_for > now).
    """
    now = _now()
    result = await db.execute(
        select(ContentPost)
        .options(selectinload(ContentPost.drill))
        .where(
            ContentPost.post_type == PostType.DRILL_OF_WEEK,
            ContentPost.scheduled_for > now,
        )
        .order_by(ContentPost.scheduled_for.asc())
    )
    return result.scalars().all()


@router.get("/api/feed/drill-of-week", response_model=ContentPostResponse)
async def get_drill_of_week(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the current active drill of the week, or 404 if none/expired.
    Active = scheduled_for <= now AND scheduled_for >= now - 7 days.
    """
    now = _now()
    expiry_cutoff = now - timedelta(days=DRILL_EXPIRY_DAYS)

    result = await db.execute(
        select(ContentPost)
        .options(selectinload(ContentPost.drill))
        .where(
            ContentPost.post_type == PostType.DRILL_OF_WEEK,
            ContentPost.scheduled_for <= now,
            ContentPost.scheduled_for >= expiry_cutoff,
        )
        .order_by(ContentPost.scheduled_for.desc())
        .limit(1)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="No active drill of the week")
    return post


@router.post("/api/feed", response_model=ContentPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: ContentPostCreate,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new feed post.
    - announcement: content required; drill_id must be null; always immediate
    - drill_of_week: drill_id required; content is optional coach note;
                     scheduled_for can be a future datetime to schedule ahead
    """
    if data.post_type == PostType.ANNOUNCEMENT:
        if not data.content or not data.content.strip():
            raise HTTPException(status_code=400, detail="Announcement content is required")

    if data.post_type == PostType.DRILL_OF_WEEK:
        if not data.drill_id:
            raise HTTPException(status_code=400, detail="drill_id is required for a drill_of_week post")
        drill_result = await db.execute(select(Drill).where(Drill.id == data.drill_id))
        if not drill_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Drill not found")

    # Use provided scheduled_for or default to now
    scheduled_for = data.scheduled_for or _now()

    post = ContentPost(
        post_type=data.post_type,
        content=data.content,
        drill_id=data.drill_id,
        scheduled_for=scheduled_for,
    )
    db.add(post)
    await db.flush()

    result = await db.execute(
        select(ContentPost)
        .options(selectinload(ContentPost.drill))
        .where(ContentPost.id == post.id)
    )
    return result.scalar_one()


@router.delete("/api/feed/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    coach: User = Depends(require_coach),
    db: AsyncSession = Depends(get_db),
):
    """Delete a content post. Coach only."""
    result = await db.execute(select(ContentPost).where(ContentPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.delete(post)
