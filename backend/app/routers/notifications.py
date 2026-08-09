from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import get_current_user, require_any
from app.database import get_db
from app.models.user import PushSubscription, User
from app.schemas.notification import (
    PushSubscriptionCreate,
    PushSubscriptionDelete,
    TestNotificationRequest,
    VapidPublicKeyOut,
)
from app.services.push import send_push_to_subscription

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/public-key", response_model=VapidPublicKeyOut)
async def get_public_key(_user: User = Depends(require_any)) -> VapidPublicKeyOut:
    return VapidPublicKeyOut(public_key=settings.vapid_public_key)


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe(
    payload: PushSubscriptionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    existing = result.scalar_one_or_none()

    if existing is not None:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_id = user.id
    else:
        db.add(
            PushSubscription(
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
                user_id=user.id,
            )
        )

    await db.commit()
    return {"detail": "Subscribed"}


@router.delete("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    payload: PushSubscriptionDelete,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    existing = result.scalar_one_or_none()
    if existing is not None:
        await db.delete(existing)
        await db.commit()


@router.post("/test")
async def send_test_notification(
    payload: TestNotificationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user.id))
    subs = result.scalars().all()

    sent = 0
    for sub in subs:
        if await send_push_to_subscription(sub, payload.title, payload.body):
            sent += 1

    return {"detail": f"Sent to {sent} subscription(s)"}
