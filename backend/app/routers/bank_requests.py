"""Native same-origin endpoints used by the public RU/KK site and the CRM lead card."""
import asyncio
import ipaddress
import json
import logging
import time
from contextlib import asynccontextmanager, suppress
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import require_any
from app.database import AsyncSessionLocal, get_db
from app.models.bank_request import BankRequest, RequestMail
from app.models.lead import Lead
from app.services import bank_intake
from app.services.notify import notify_new_lead
from app.services.request_mail import drain_pending, profile_path

logger = logging.getLogger("aservice.requests")
router = APIRouter(tags=["website requests"])
NO_STORE = {"Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow"}


def result(data, status=200, extra=None):
    return JSONResponse(data, status_code=status, headers={**NO_STORE, **(extra or {})})


@asynccontextmanager
async def mail_lifespan(app):
    wake = asyncio.Event()
    app.state.bank_mail_wake = wake

    async def run():
        while True:
            wake.clear()
            try:
                await drain_pending()
            except Exception:
                logger.exception("Could not process website mail queue")
            try:
                await asyncio.wait_for(wake.wait(), timeout=30)
            except TimeoutError:
                pass

    worker = asyncio.create_task(run())
    try:
        yield
    finally:
        worker.cancel()
        with suppress(asyncio.CancelledError):
            await worker


async def notify_channels(lead_id):
    """The old Telegram/push notification remains available for new site enquiries."""
    try:
        async with AsyncSessionLocal() as db:
            lead = await db.get(Lead, lead_id)
            if lead:
                await notify_new_lead(db, lead)
    except Exception:
        logger.exception("Could not notify existing CRM channels for lead %s", lead_id)


def wake_mail(request):
    wake = getattr(request.app.state, "bank_mail_wake", None)
    if wake is not None:
        wake.set()


def trusted_origin(request):
    origin = request.headers.get("origin")
    if not origin:
        return request.headers.get("sec-fetch-site") != "cross-site"
    parsed = urlsplit(origin)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username is not None or parsed.password is not None:
        return False
    host = parsed.hostname
    local = host == "localhost" or host.endswith(".localhost")
    try:
        local = local or ipaddress.ip_address(host).is_loopback
    except ValueError:
        pass
    if settings.env != "development" and local:
        return False
    return origin == str(request.base_url).rstrip("/") or origin in settings.cors_origins_list


async def read_form(request, limit):
    if not trusted_origin(request):
        raise HTTPException(403, "cross_origin")
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise HTTPException(415, "json_required")
    body = bytearray()
    async for part in request.stream():
        if len(body) + len(part) > limit:
            raise HTTPException(413, "too_large")
        body.extend(part)
    return json.loads(body.decode("utf-8"))


async def submit(kind, request, tasks, db):
    try:
        data = await read_form(request, 4096 if kind == "material" else 16384)
        receipt_id, fields, source_page, visitor = bank_intake.parse(data, kind)
        lead_id, created = await bank_intake.accept(
            db, receipt_id, fields, source_page, visitor,
            request.client.host if request.client else "", request.headers.get("user-agent", ""))
    except (ValueError, UnicodeError, RecursionError):
        return result({"error": "invalid_request"}, 422)
    except HTTPException as exc:
        await db.rollback()
        return result({"error": exc.detail}, exc.status_code, exc.headers)
    if created:
        tasks.add_task(notify_channels, lead_id)
    wake_mail(request)
    if kind == "service":
        return result({"accepted": True}, 201 if created else 200)
    return result({"accepted": True, "delivery": "manual"}, 202 if created else 200)


@router.post("/api/requests", status_code=201)
async def request_service(request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    return await submit("service", request, tasks, db)


@router.post("/api/material-requests", status_code=202)
async def request_material(request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    return await submit("material", request, tasks, db)


@router.get("/leads/{lead_id}/material", dependencies=[Depends(require_any)])
async def lead_material(lead_id: UUID, db: AsyncSession = Depends(get_db)):
    locale = await db.scalar(select(BankRequest.locale).where(
        BankRequest.lead_id == lead_id, BankRequest.kind == "material"))
    if locale not in {"ru", "kk"}:
        raise HTTPException(404, "material_not_found")
    path = profile_path(locale)
    if not path.is_file():
        raise HTTPException(404, "profile_unavailable")
    return FileResponse(path, media_type="application/pdf", filename=f"A-SERVICE-profile-{locale}.pdf", headers=NO_STORE)


async def get_mail_items(lead_id, db):
    if not await db.get(Lead, lead_id):
        raise HTTPException(404, "lead_not_found")
    stmt = select(RequestMail.kind, RequestMail.status, RequestMail.last_error, RequestMail.sent_at).join(
        BankRequest, RequestMail.request_id == BankRequest.request_id).where(BankRequest.lead_id == lead_id).order_by(RequestMail.kind)
    return {"items": [dict(row) for row in (await db.execute(stmt)).mappings()]}


@router.get("/leads/{lead_id}/mail", dependencies=[Depends(require_any)])
async def mail_status(lead_id: UUID, db: AsyncSession = Depends(get_db)):
    return result(await get_mail_items(lead_id, db))


@router.post("/leads/{lead_id}/mail/{kind}/retry", dependencies=[Depends(require_any)])
async def retry_mail(lead_id: UUID, kind: Literal["customer", "owner"], request: Request, db: AsyncSession = Depends(get_db)):
    if kind == "customer":
        return result({"error": "manual_fulfillment"}, 409)
    request_id = await db.scalar(select(BankRequest.request_id).where(BankRequest.lead_id == lead_id))
    job = await db.get(RequestMail, (request_id, kind)) if request_id else None
    if job is None:
        raise HTTPException(404, "mail_not_found")
    if job.status == "review":
        return result({"error": "verify_smtp_history"}, 409)
    if job.status == "pending":
        await db.execute(update(RequestMail).where(RequestMail.request_id == request_id, RequestMail.kind == kind,
            RequestMail.status == "pending").values(next_attempt_at=int(time.time())))
        await db.commit()
        wake_mail(request)
    return result(await get_mail_items(lead_id, db))
