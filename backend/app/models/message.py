"""
Message model for coach-student direct messaging.

A message is always between exactly two users: a coach and a student.
The student initiates from the mobile app; the coach replies from the
admin dashboard. Both sides can send and receive.
"""

from datetime import datetime

from sqlalchemy import Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    sender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    recipient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Flipped to True once the recipient opens the conversation
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships — must disambiguate because both FKs point at users
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id])

    def __repr__(self):
        return f"<Message {self.id}: {self.sender_id} → {self.recipient_id}>"


# Avoid circular import — keep at bottom
from app.models.user import User  # noqa: E402
