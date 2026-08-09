import json
import logging

import anyio
from pywebpush import WebPushException, webpush
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import PushSubscription

logger = logging.getLogger("aservice.push")


def _send_sync(subscription_info: dict, payload: str) -> None:
    webpush(
        subscription_info=subscription_info,
        data=payload,
        vapid_private_key=settings.vapid_private_key,
        vapid_claims={"sub": settings.vapid_claims_sub},
    )


async def send_push_to_subscription(sub: PushSubscription, title: str, body: str, url: str = "/") -> bool:
    """Возвращает False, если подписка недействительна и её нужно удалить."""
    if not settings.vapid_private_key:
        return True

    payload = json.dumps({"title": title, "body": body, "url": url})
    info = {"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}}
    try:
        await anyio.to_thread.run_sync(_send_sync, info, payload)
        return True
    except WebPushException as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        if status_code in (404, 410):
            return False
        logger.warning("Web push failed: %s", exc)
        return True


async def notify_all_subscriptions(db: AsyncSession, title: str, body: str, url: str = "/") -> int:
    result = await db.execute(select(PushSubscription))
    subs = result.scalars().all()

    sent = 0
    stale: list[str] = []
    for sub in subs:
        ok = await send_push_to_subscription(sub, title, body, url)
        if ok:
            sent += 1
        else:
            stale.append(sub.endpoint)

    if stale:
        await db.execute(delete(PushSubscription).where(PushSubscription.endpoint.in_(stale)))
        await db.commit()

    return sent
