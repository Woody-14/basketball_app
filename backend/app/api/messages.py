"""
Messaging routes.

GET    /api/messages            — Fetch conversation
                                   Student → auto-scoped to their coach
                                   Coach  → requires ?student_id=X
POST   /api/messages            — Send a message
                                   Student → auto-sends to the coach
                                   Coach  → requires body.recipient_id
PATCH  /api/messages/read       — Mark incoming messages as read
                                   Student → marks coach messages as read
                                   Coach  → requires ?student_id=X
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse
from app.services.auth import get_current_user
from app.services.push import notify_user

router = APIRouter(prefix="/api/messages", tags=["Messages"])


async def _find_coach(db: AsyncSession) -> Optional[User]:
    """Return the first active coach in the system."""
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.COACH, User.is_active == True)
        .limit(1)
    )
    return result.scalar_one_or_none()


def _conversation_filter(my_id: int, other_id: int):
    """SQLAlchemy filter for messages between two users in either direction."""
    return or_(
        and_(Message.sender_id == my_id, Message.recipient_id == other_id),
        and_(Message.sender_id == other_id, Message.recipient_id == my_id),
    )


@router.get("", response_model=list[MessageResponse])
async def get_messages(
    student_id: Optional[int] = Query(None, description="Coach only: student to fetch conversation with"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch the conversation between the current user and their counterpart.

    Students automatically get their conversation with the coach.
    Coaches must pass ?student_id=X to specify which student's thread to load.
    """
    if current_user.role == UserRole.STUDENT:
        coach = await _find_coach(db)
        if not coach:
            return []
        other_id = coach.id
    else:
        if not student_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="student_id query parameter is required for coaches",
            )
        other_id = student_id

    result = await db.execute(
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.recipient),
        )
        .where(_conversation_filter(current_user.id, other_id))
        .order_by(Message.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message.

    Students send to their coach automatically — no recipient needed in the body.
    Coaches must supply recipient_id (the student's user ID).
    """
    if current_user.role == UserRole.STUDENT:
        coach = await _find_coach(db)
        if not coach:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active coach found",
            )
        recipient_id = coach.id
    else:
        if not data.recipient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="recipient_id is required when sending as a coach",
            )
        recipient_result = await db.execute(
            select(User).where(User.id == data.recipient_id)
        )
        if not recipient_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")
        recipient_id = data.recipient_id

    message = Message(
        sender_id=current_user.id,
        recipient_id=recipient_id,
        content=data.content.strip(),
    )
    db.add(message)
    await db.flush()

    # Notify the recipient (fire-and-forget — never blocks the response)
    await notify_user(
        recipient_id,
        "New Message",
        f"{current_user.first_name}: {data.content.strip()[:60]}",
        db,
    )

    # Reload with relationships so the response includes sender info
    result = await db.execute(
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.recipient),
        )
        .where(Message.id == message.id)
    )
    return result.scalar_one()


@router.patch("/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_messages_read(
    student_id: Optional[int] = Query(None, description="Coach only: student whose messages to mark read"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark all unread inbound messages in the conversation as read.

    Called automatically when the user opens the Messages screen.
    """
    if current_user.role == UserRole.STUDENT:
        coach = await _find_coach(db)
        if not coach:
            return
        sender_id = coach.id
    else:
        if not student_id:
            return
        sender_id = student_id

    await db.execute(
        update(Message)
        .where(
            Message.recipient_id == current_user.id,
            Message.sender_id == sender_id,
            Message.is_read == False,
        )
        .values(is_read=True)
    )
