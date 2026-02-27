"""
Push notification service — Expo Push Notifications.

Uses Expo's free push API so we don't need Firebase or APNs accounts directly.
Expo handles the FCM/APNs delivery under the hood.

All functions are fire-and-forget: errors are logged but never raised,
so a failed push notification never breaks the API response.
"""

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(token: str | None, title: str, body: str) -> None:
    """
    Send a push notification to a single Expo push token.
    Silently skips if the token is missing or invalid.
    """
    if not token or not token.startswith("ExponentPushToken"):
        return
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                EXPO_PUSH_URL,
                json={
                    "to": token,
                    "title": title,
                    "body": body,
                    "sound": "default",
                },
            )
    except Exception as exc:
        logger.warning("Push notification failed (token=%s...): %s", token[:20], exc)


async def notify_user(user_id: int, title: str, body: str, db: AsyncSession) -> None:
    """Look up a user's push token and send them a notification."""
    result = await db.execute(
        select(User.push_token).where(User.id == user_id)
    )
    token = result.scalar_one_or_none()
    await send_push(token, title, body)
