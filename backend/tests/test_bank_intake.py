"""Public JSON contract, idempotency, CRM visibility and compatibility with old leads."""
import asyncio
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.deps import require_any
from app.database import Base, get_db
from app.models.bank_request import BankRequest, RequestMail
from app.models.event import SiteEvent
from app.models.lead import Lead
from app.routers import bank_requests
from app.services.request_mail import profile_path


class IntakeTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        path = Path(directory) / "intake.sqlite"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
        self.addAsyncCleanup(self.engine.dispose)
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        self.app = FastAPI()
        self.app.include_router(bank_requests.router)
        async def database():
            async with self.sessions() as db:
                yield db
        self.app.dependency_overrides[get_db] = database
        self.notify = self.enterContext(patch.object(bank_requests, "notify_channels", new_callable=AsyncMock))
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="https://a-service.asia")
        self.addAsyncCleanup(self.client.aclose)
        self.service = {"requestId": str(uuid.uuid4()), "service": "install", "contact": "buyer@example.kz",
                        "comment": "Два банкомата", "locale": "ru", "sourcePage": "/ru/", "visitorId": "visitor-1"}
        self.material = {"requestId": str(uuid.uuid4()), "name": "Асхат", "email": " BUYER@example.kz ",
                         "locale": "kk", "sourcePage": "/kk/"}

    async def test_duplicate_concurrent_service_creates_one_native_lead_and_one_event(self):
        async def submit():
            return await self.client.post("/api/requests", json=self.service, headers={"origin": "https://a-service.asia"})
        responses = await asyncio.gather(submit(), submit(), submit())
        self.assertEqual(sorted(r.status_code for r in responses), [200, 200, 201])
        self.assertTrue(all(r.json() == {"accepted": True} for r in responses))
        self.notify.assert_awaited_once()
        async with self.sessions.begin() as db:
            lead = (await db.scalars(select(Lead))).one()
            event = (await db.scalars(select(SiteEvent))).one()
            self.assertEqual((lead.phone, lead.email, lead.category, lead.source, lead.source_page),
                             ("", "buyer@example.kz", "install", "website_service", "/ru/"))
            self.assertEqual((event.visitor_id, event.page), ("visitor-1", "/ru/"))
            self.assertEqual((await db.scalars(select(RequestMail.kind))).all(), ["owner"])
            lead.message = "Позвонили"
        retry = await submit()
        self.assertEqual(retry.status_code, 200)
        changed = await self.client.post("/api/requests", json={**self.service, "comment": "Изменённая заявка"})
        self.assertEqual(changed.status_code, 409)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(Lead.message)), "Позвонили")

    async def test_material_creates_only_manager_notification_and_known_receipt_survives_limit(self):
        ids = [str(uuid.uuid4()) for _ in range(4)]
        async def request(identifier):
            return await self.client.post("/api/material-requests", json={**self.material, "requestId": identifier})
        answers = await asyncio.gather(*(request(identifier) for identifier in ids))
        self.assertEqual(sorted(a.status_code for a in answers), [202, 202, 202, 429])
        success = next(i for i, response in zip(ids, answers) if response.status_code == 202)
        self.assertEqual((await request(success)).json(), {"accepted": True, "delivery": "manual"})
        async with self.sessions.begin() as db:
            lead = (await db.scalars(select(Lead))).first()
            self.assertEqual((lead.category, lead.source, lead.email, lead.locale), ("bank-profile", "website_material", "buyer@example.kz", "kk"))
            self.assertEqual((await db.scalars(select(RequestMail.kind))).all(), ["owner"] * 3)
            (await db.get(RequestMail, (uuid.UUID(success), "owner"))).status = "sent"
        repeat = await request(success)
        self.assertEqual((repeat.status_code, repeat.json()), (200, {"accepted": True, "delivery": "manual"}))

    async def test_management_access_review_and_existing_leads(self):
        await self.client.post("/api/material-requests", json=self.material)
        async with self.sessions.begin() as db:
            lead_id = await db.scalar(select(BankRequest.lead_id))
            old = Lead(name="Существующий", phone="+77700000000")
            db.add(old)
            await db.flush()
            old_id = old.id
            # An older release already sent this profile. Its delivery history remains readable.
            db.add(RequestMail(request_id=uuid.UUID(self.material["requestId"]), kind="customer",
                               status="sent", next_attempt_at=0, sent_at=100))
        url = f"/leads/{lead_id}/mail"
        self.assertEqual((await self.client.get(url)).status_code, 401)
        self.assertEqual((await self.client.get(f"/leads/{lead_id}/material")).status_code, 401)
        self.app.dependency_overrides[require_any] = lambda: True
        rows = (await self.client.get(url)).json()["items"]
        self.assertEqual({r["kind"]:r["status"] for r in rows}, {"customer":"sent","owner":"pending"})
        self.assertEqual((await self.client.post(url + "/customer/retry")).status_code, 409)
        self.assertEqual((await self.client.post(url + "/owner/retry")).status_code, 200)
        self.assertEqual((await self.client.get(f"/leads/{old_id}/mail")).json(), {"items":[]})
        async with self.sessions.begin() as db:
            await db.delete(await db.get(Lead, lead_id))
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(RequestMail)), 0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(BankRequest)), 0)
            self.assertTrue(await db.get(Lead, old_id))

    async def test_profile_can_be_downloaded_manually_only_for_a_material_lead(self):
        await self.client.post("/api/requests", json=self.service)
        self.app.dependency_overrides[require_any] = lambda: True
        async with self.sessions() as db:
            service_id = await db.scalar(select(BankRequest.lead_id))
        self.assertEqual((await self.client.get(f"/leads/{service_id}/material")).status_code, 404)
        self.assertEqual((await self.client.get(f"/leads/{uuid.uuid4()}/material")).status_code, 404)
        for locale in ("ru", "kk"):
            receipt_id = uuid.uuid4()
            accepted = await self.client.post("/api/material-requests",
                json={**self.material, "locale": locale, "requestId": str(receipt_id)})
            self.assertEqual(accepted.status_code, 202)
            async with self.sessions() as db:
                record = await db.get(BankRequest, receipt_id)
            download = await self.client.get(f"/leads/{record.lead_id}/material")
            self.assertEqual(download.status_code, 200)
            self.assertEqual(download.content, profile_path(locale).read_bytes())
            self.assertEqual(download.headers["Content-Type"], "application/pdf")
            self.assertEqual(download.headers["Cache-Control"], "private, no-store")
            self.assertIn(f"A-SERVICE-profile-{locale}.pdf", download.headers["Content-Disposition"])

    async def test_allowed_separate_frontend_and_production_loopback(self):
        self.enterContext(patch.object(bank_requests.settings, "env", "production"))
        self.enterContext(patch.object(bank_requests.settings, "cors_origins", "https://review.example.kz,http://localhost:3000"))
        allowed = await self.client.post("/api/requests", json=self.service,
            headers={"Origin": "https://review.example.kz", "Sec-Fetch-Site": "cross-site"})
        self.assertEqual(allowed.status_code, 201)
        for origin in ("http://localhost:3000", "https://review.example.kz.attacker.example", "null"):
            blocked = await self.client.post("/api/requests", json=self.service,
                headers={"Origin": origin, "Sec-Fetch-Site": "cross-site"})
            self.assertEqual(blocked.status_code, 403)

    async def test_retired_category_rejects_new_leads_but_preserves_previous_receipts(self):
        historical = {**self.service, "service": "repair"}
        for category in ("repair", "buyback"):
            response = await self.client.post("/api/requests", json={**historical, "service": category})
            self.assertEqual(response.status_code, 422)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Lead)), 0)
        with patch.dict(bank_requests.bank_intake.SERVICE_TITLES, {"repair": "Прежняя категория"}):
            self.assertEqual((await self.client.post("/api/requests", json=historical)).status_code, 201)
        self.assertEqual((await self.client.post("/api/requests", json=historical)).status_code, 200)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Lead)), 1)

    async def test_validation_same_origin_and_body_limits(self):
        cases = [
            ({"json": {**self.service, "contact": "z"}}, 422),
            ({"json": {**self.service, "sourcePage": "//example.kz"}}, 422),
            ({"headers": {"Origin":"https://other.example"}, "json":self.service}, 403),
            ({"content":"not a JSON request"}, 415),
            ({"content":b"x"*17000, "headers":{"Content-Type":"application/json"}}, 413),
        ]
        for params, status in cases:
            with self.subTest(status=status):
                self.assertEqual((await self.client.post("/api/requests", **params)).status_code, status)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(Lead)), 0)
