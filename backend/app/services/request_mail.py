"""Durable delivery for the public service form and procurement profile requests."""
import asyncio
import logging
import time
import uuid
from email import policy
from email.message import EmailMessage
from email.utils import formatdate
from pathlib import Path

import aiosmtplib
from aiosmtplib.errors import SMTPRecipientRefused, SMTPResponseException
from sqlalchemy import select, update

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.bank_request import SERVICE_TITLES, BankRequest, RequestMail

logger = logging.getLogger(__name__)
PROFILE_DIR = Path(__file__).resolve().parents[1] / "private" / "profiles"
LEASE_SECONDS = 120
# After SMTP DATA starts, a lost connection may hide an accepted message.
IN_FLIGHT = "smtp_in_progress"


class MailSetupError(Exception):
    """Contains only a fixed code that may be stored in the manager's delivery log."""


def profile_path(locale: str) -> Path:
    if locale not in {"ru", "kk"}:
        raise ValueError("invalid_profile_locale")
    return PROFILE_DIR / f"profile-{locale}.pdf"


def build_message(request: BankRequest, kind: str) -> EmailMessage:
    if kind != "owner":
        raise MailSetupError("manual_fulfillment")
    if not settings.smtp_host or not settings.smtp_from:
        raise MailSetupError("smtp_not_configured")
    recipient = settings.requests_notify_email
    if not recipient:
        raise MailSetupError("notify_address_not_configured")

    msg = EmailMessage()
    try:
        msg["From"] = settings.smtp_from
        msg["To"] = recipient
        for header in ("From", "To"):
            addresses = msg[header].addresses
            if msg[header].defects or len(addresses) != 1 or not addresses[0].username or not addresses[0].domain:
                raise ValueError
    except (ValueError, TypeError, IndexError) as exc:
        raise MailSetupError("invalid_mail_address") from exc
    msg["Date"] = formatdate(request.created_at, usegmt=True)
    msg["Message-ID"] = f"<aservice.{request.request_id}.{kind}@{msg['From'].addresses[0].domain}>"

    if request.kind == "material":
        msg["Subject"] = "Новый запрос профиля A-SERVICE для закупок"
        language = {"ru": "Русский", "kk": "Қазақша"}[request.locale]
        lines = ["Материал: профиль услуг A-SERVICE для закупок (PDF)", f"Язык: {language}",
                 f"Имя: {request.name}", f"Электронная почта: {request.email}",
                 f"Телефон: {request.phone or 'не указан'}",
                 "Откройте карточку заявки, скачайте PDF и отправьте его заказчику лично."]
    else:
        msg["Subject"] = "Новое обращение с сайта A-SERVICE"
        lines = [f"Услуга: {SERVICE_TITLES.get(request.service, 'Архивная категория')}",
                 f"Контакт: {request.contact}", f"Комментарий: {request.comment or 'не указан'}",
                 f"Язык: {request.locale}"]
    lines.extend([f"Номер обращения: {request.request_id}",
                  f"Карточка: {settings.admin_url.rstrip('/')}/leads/{request.lead_id}"])
    msg.set_content("\n".join(lines), cte="quoted-printable")
    return msg


async def _recover_expired(now: int) -> None:
    async with AsyncSessionLocal.begin() as db:
        # Retire legacy customer jobs in place. Preserve sent history and ambiguous SMTP outcomes.
        legacy = update(RequestMail).where(RequestMail.kind == "customer")
        await db.execute(legacy.where(RequestMail.status == "sending", RequestMail.last_error == IN_FLIGHT).values(
            status="review", last_error="verify_smtp_history", lease_token=None, lease_until=None))
        await db.execute(legacy.where(RequestMail.status.in_(("pending", "sending"))).values(
            status="review", last_error="manual_fulfillment", lease_token=None, lease_until=None))
        expired = update(RequestMail).where(RequestMail.kind == "owner", RequestMail.status == "sending",
                                             RequestMail.lease_until <= now)
        # A worker may have crashed after receiving a positive SMTP response.
        await db.execute(expired.where(RequestMail.last_error == IN_FLIGHT).values(
            status="review", last_error="verify_smtp_history", lease_token=None, lease_until=None))
        await db.execute(expired.where(RequestMail.last_error == "preparing").values(
            status="pending", last_error="interrupted_before_send", next_attempt_at=now, lease_token=None, lease_until=None))


async def process_delivery(request_id: uuid.UUID, kind: str) -> None:
    if kind != "owner":
        return
    now = int(time.time())
    token = uuid.uuid4().hex
    row_filter = (RequestMail.request_id == request_id, RequestMail.kind == kind)
    async with AsyncSessionLocal.begin() as db:
        claim = await db.execute(update(RequestMail).where(*row_filter, RequestMail.status == "pending",
            RequestMail.next_attempt_at <= now).values(status="sending", lease_token=token,
            lease_until=now + LEASE_SECONDS, last_error="preparing", attempts=RequestMail.attempts + 1))
        if claim.rowcount != 1:
            return
        request = await db.get(BankRequest, request_id)
        attempts = await db.scalar(select(RequestMail.attempts).where(*row_filter))
    owner = (*row_filter, RequestMail.status == "sending", RequestMail.lease_token == token)
    status, error = "pending", None
    client = None
    transmitting = False
    try:
        message = build_message(request, kind)
        implicit_tls = settings.smtp_use_tls and settings.smtp_port == 465
        client = aiosmtplib.SMTP(hostname=settings.smtp_host, port=settings.smtp_port,
            username=settings.smtp_user or None, password=settings.smtp_password or None,
            use_tls=implicit_tls, start_tls=settings.smtp_use_tls and not implicit_tls, timeout=10)
        async with asyncio.timeout(35):
            await client.connect()
            sender = message["From"].addresses[0].addr_spec
            recipient = message["To"].addresses[0].addr_spec
            utf8 = not (sender + recipient).isascii()
            if utf8:
                await client.ehlo()
                if not client.supports_extension("smtputf8"):
                    raise MailSetupError("smtputf8_required")
            encoding = "utf-8" if utf8 else "ascii"
            data = message.as_bytes(policy=policy.SMTPUTF8 if utf8 else policy.SMTP)
            await client.mail(sender, options=["SMTPUTF8"] if utf8 else [], encoding=encoding)
            await client.rcpt(recipient, encoding=encoding)
            async with AsyncSessionLocal.begin() as db:
                checkpoint = await db.execute(update(RequestMail).where(*owner,
                    RequestMail.lease_until > int(time.time())).values(last_error=IN_FLIGHT))
                if checkpoint.rowcount != 1:
                    return
            transmitting = True
            await client.data(data)
            status = "sent"
    except MailSetupError as exc:
        error = str(exc)
    except SMTPRecipientRefused as exc:
        status = "review" if 500 <= exc.code < 600 else "pending"
        error = f"smtp_recipient_{exc.code}"
    except SMTPResponseException as exc:
        # An explicit negative reply is definitive. A server may accept SMTP DATA
        # but lose the connection before replying; only the latter needs manual review.
        status = "review" if transmitting and 500 <= exc.code < 600 else "pending"
        error = f"smtp_{exc.code}"
    except Exception:
        status = "review" if transmitting else "pending"
        error = "verify_smtp_history" if transmitting else "smtp_unavailable"
    finally:
        if client is not None:
            client.close()
    finished = int(time.time())
    retry_in = min(3600, 60 * 2 ** min(attempts - 1, 6))
    async with AsyncSessionLocal.begin() as db:
        await db.execute(update(RequestMail).where(*owner).values(
            status=status, last_error=error, lease_token=None, lease_until=None,
            sent_at=finished if status == "sent" else None, next_attempt_at=finished + retry_in))


async def drain_pending() -> None:
    """Process a bounded batch. Any number of service instances can call this."""
    now = int(time.time())
    await _recover_expired(now)
    async with AsyncSessionLocal() as db:
        jobs = (await db.execute(select(RequestMail.request_id, RequestMail.kind).where(
            RequestMail.kind == "owner", RequestMail.status == "pending", RequestMail.next_attempt_at <= now
        ).order_by(RequestMail.next_attempt_at, RequestMail.request_id, RequestMail.kind).limit(12))).all()
    for request_id, kind in jobs:
        try:
            await process_delivery(request_id, kind)
        except Exception:
            logger.exception("Error processing website email job %s/%s", request_id, kind)
