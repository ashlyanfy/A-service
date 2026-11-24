"""Validate the public forms and commit lead, receipt, analytics and outbox atomically."""
import hashlib
import hmac
import re
import time
import unicodedata
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.bank_request import BankRequest, RequestMail, SERVICE_TITLES
from app.models.event import SiteEvent, SiteEventType
from app.models.lead import Lead

UUID_RE = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", re.I)
EMAIL = re.compile(r'[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+')
PHONE = re.compile(r"\+?[0-9 ().-]+")
HOUR = 3600


def clean(data, key, maximum, *, optional=False, multiline=False):
    value = data.get(key, "" if optional else None)
    if not isinstance(value, str):
        raise ValueError(key)
    value = value.strip()
    if len(value) > maximum or (not value and not optional):
        raise ValueError(key)
    if any(unicodedata.category(c) in {"Cc", "Cs"} and not (multiline and c in "\r\n\t") for c in value):
        raise ValueError(key)
    return value


def valid_phone(value):
    return len(value) <= 40 and PHONE.fullmatch(value) and 7 <= len(re.sub(r"\D", "", value)) <= 15


def parse(data, kind):
    if not isinstance(data, dict):
        raise ValueError("object")
    request_id = clean(data, "requestId", 36)
    locale = clean(data, "locale", 2)
    if not UUID_RE.fullmatch(request_id) or locale not in {"ru", "kk"}:
        raise ValueError("requestId/locale")
    fields = {"kind": kind, "locale": locale, "name": "", "email": "", "phone": "",
              "service": "", "contact": "", "comment": ""}
    if kind == "service":
        service, contact = clean(data, "service", 40), clean(data, "contact", 254)
        if (service not in SERVICE_TITLES and service not in {"repair", "buyback"}) or not (EMAIL.fullmatch(contact) or valid_phone(contact)):
            raise ValueError("service/contact")
        fields.update(service=service, contact=contact, comment=clean(data, "comment", 1000, optional=True, multiline=True))
        fields["email" if "@" in contact else "phone"] = contact
    else:
        name, email = clean(data, "name", 100), clean(data, "email", 254).lower()
        phone = clean(data, "phone", 40, optional=True)
        if not EMAIL.fullmatch(email) or (phone and not valid_phone(phone)):
            raise ValueError("email/phone")
        fields.update(name=name, email=email, phone=phone)
    source = clean(data, "sourcePage", 200, optional=True)
    if source and (not source.startswith("/") or source.startswith("//") or any(c in source for c in "?#\\")):
        raise ValueError("sourcePage")
    visitor = clean(data, "visitorId", 64, optional=True)
    return uuid.UUID(request_id), fields, source, visitor


async def serialize_intake(db: AsyncSession, keys):
    """Prevent write races on the same UUID or rate bucket, including across workers."""
    if db.get_bind().dialect.name == "sqlite":
        await db.execute(text("BEGIN IMMEDIATE"))
    else:
        for value in sorted(set(keys)):
            key = int.from_bytes(hashlib.sha256(value.encode()).digest()[:8], "big", signed=True)
            await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})


async def accept(db, request_id, fields, source_page, visitor, peer, user_agent):
    now = int(time.time())
    digest = hmac.new(settings.secret_key.encode(), f"{now // 86400}:{peer}".encode(), "sha256").hexdigest() if peer else ""
    keys = ["request:" + str(request_id)]
    if digest:
        keys.append("peer:" + digest)
    if fields["kind"] == "material":
        keys.append("recipient:" + fields["email"])
    await serialize_intake(db, keys)

    receipt = await db.get(BankRequest, request_id)
    if receipt:
        if any(getattr(receipt, key) != value for key, value in fields.items()):
            raise HTTPException(409, "request_conflict")
        lead_id = receipt.lead_id
        await db.commit()
        return lead_id, False

    # Retries of existing receipts survive a service retirement; new enquiries use the current catalogue.
    if fields["kind"] == "service" and fields["service"] not in SERVICE_TITLES:
        raise HTTPException(422, "invalid_request")

    recent = select(func.count()).select_from(BankRequest).where(
        BankRequest.kind == fields["kind"], BankRequest.created_at > now - HOUR)
    if fields["kind"] == "material" and await db.scalar(recent.where(BankRequest.email == fields["email"])) >= 3:
        raise HTTPException(429, "rate_limited", headers={"Retry-After": str(HOUR)})
    if digest and await db.scalar(recent.where(BankRequest.network_bucket == digest)) >= (12 if fields["kind"] == "material" else 60):
        raise HTTPException(429, "rate_limited", headers={"Retry-After": str(HOUR)})

    lead = Lead(name=fields["name"], phone=fields["phone"], email=fields["email"] or None,
                category=fields["service"] or "bank-profile", message=fields["comment"] or None,
                source="website_" + fields["kind"], source_page=source_page or None,
                locale=fields["locale"], user_agent=user_agent[:500] or None)
    receipt = BankRequest(request_id=request_id, created_at=now, network_bucket=digest, **fields)
    receipt.jobs = [RequestMail(kind="owner", next_attempt_at=now)]
    lead.bank_request = receipt
    db.add(lead)
    db.add(SiteEvent(event_type=SiteEventType.LEAD_SUBMIT, page=source_page or None,
                     visitor_id=visitor or f"request-{request_id}", user_agent=lead.user_agent))
    await db.commit()
    return lead.id, True
