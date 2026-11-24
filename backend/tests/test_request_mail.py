import asyncio
import tempfile
import time
import unittest
import uuid
from email import policy
from email.parser import BytesParser
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from aiosmtplib.errors import SMTPRecipientRefused
from sqlalchemy import update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.bank_request import BankRequest, RequestMail
from app.models.lead import Lead
from app.services import request_mail as mail


class RequestMailTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        path = Path(temp_dir.name) / "intake.sqlite"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
        self.addAsyncCleanup(self.engine.dispose)
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        self.enterContext(patch.object(mail, "AsyncSessionLocal", self.sessions))
        self.enterContext(patch.object(mail.settings, "smtp_host", "smtp.example.invalid"))
        self.enterContext(patch.object(mail.settings, "requests_notify_email", "team@example.invalid"))
        self.smtp = MagicMock()
        self.smtp.connect = AsyncMock()
        self.smtp.mail = AsyncMock()
        self.smtp.rcpt = AsyncMock()
        self.smtp.data = AsyncMock()
        self.enterContext(patch.object(mail.aiosmtplib, "SMTP", return_value=self.smtp))

    async def create_job(self, *, request_kind="material", locale="ru", recipient="owner"):
        request_id = uuid.uuid4()
        async with self.sessions.begin() as db:
            lead = Lead(id=uuid.uuid4(), name="Менеджер банка", phone="", email="client@example.invalid")
            db.add(lead)
            await db.flush()
            db.add(BankRequest(request_id=request_id, lead_id=lead.id, kind=request_kind,
                service="install" if request_kind == "service" else "", contact="client@example.invalid",
                comment="Монтаж", name=lead.name, email=lead.email, phone="", locale=locale, network_bucket="",
                created_at=int(time.time())))
            await db.flush()
            db.add(RequestMail(request_id=request_id, kind=recipient, status="pending",
                next_attempt_at=0, attempts=0))
        return request_id

    async def get_job(self, request_id, recipient="owner"):
        async with self.sessions() as db:
            return await db.get(RequestMail, (request_id, recipient))

    async def test_one_manager_notification_per_request_has_contacts_language_and_card(self):
        for locale, language in (("ru", "Русский"), ("kk", "Қазақша")):
            request_id = await self.create_job(locale=locale)
            await asyncio.gather(mail.process_delivery(request_id, "owner"),
                                 mail.process_delivery(request_id, "owner"))
            job = await self.get_job(request_id)
            self.assertEqual((job.status, job.attempts), ("sent", 1))
            message = BytesParser(policy=policy.default).parsebytes(self.smtp.data.await_args.args[0])
            self.assertFalse(list(message.iter_attachments()))
            self.assertEqual(str(message["To"]), "team@example.invalid")
            content = message.get_content()
            for value in ("client@example.invalid", "Менеджер банка", "Телефон:", language, "/leads/", "PDF"):
                self.assertIn(value, content)
        await mail.drain_pending()
        self.assertEqual(self.smtp.data.await_count, 2)
        self.assertTrue(all(call.args[0] == "team@example.invalid" for call in self.smtp.rcpt.await_args_list))

    async def test_legacy_customer_jobs_are_read_only_and_never_sent(self):
        for status, marker in (("pending", None), ("sending", "preparing"), ("sending", mail.IN_FLIGHT),
                               ("review", "verify_smtp_history"), ("sent", None)):
            with self.subTest(status=status, marker=marker):
                job_id = await self.create_job(recipient="customer")
                async with self.sessions.begin() as db:
                    await db.execute(update(RequestMail).where(RequestMail.request_id == job_id).values(
                        status=status, last_error=marker, sent_at=100 if status == "sent" else None,
                        lease_until=int(time.time()) + 100 if status == "sending" else None))
                await mail.process_delivery(job_id, "customer")
                await mail.drain_pending()
                job = await self.get_job(job_id, "customer")
                if status == "sent":
                    self.assertEqual((job.status, job.sent_at, job.last_error), ("sent", 100, None))
                else:
                    expected = "verify_smtp_history" if status == "review" or marker == mail.IN_FLIGHT else "manual_fulfillment"
                    self.assertEqual((job.status, job.last_error), ("review", expected))
                self.assertEqual(job.attempts, 0)
                self.smtp.connect.assert_not_awaited()

    async def test_uncertain_send_goes_to_review_without_replay(self):
        request_id = await self.create_job()
        self.smtp.data.side_effect = ConnectionError("no SMTP acknowledgement")
        await mail.process_delivery(request_id, "owner")
        job = await self.get_job(request_id)
        self.assertEqual((job.status, job.last_error), ("review", "verify_smtp_history"))
        await mail.drain_pending()
        self.assertEqual(self.smtp.data.await_count, 1)

    async def test_safe_recovery_before_any_send_and_conservative_recovery_during_send(self):
        before = await self.create_job(request_kind="service", recipient="owner")
        during = await self.create_job()
        async with self.sessions.begin() as db:
            for request_id, marker in ((before, "preparing"), (during, mail.IN_FLIGHT)):
                await db.execute(update(RequestMail).where(RequestMail.request_id == request_id).values(
                    status="sending", lease_token="dead", lease_until=0, last_error=marker))
        await mail.drain_pending()
        self.assertEqual((await self.get_job(before, "owner")).status, "sent")
        self.assertEqual((await self.get_job(during)).status, "review")
        self.assertEqual(self.smtp.data.await_count, 1)
        message = BytesParser(policy=policy.default).parsebytes(self.smtp.data.await_args.args[0])
        self.assertEqual(str(message["To"]), "team@example.invalid")
        self.assertFalse(list(message.iter_attachments()))
        self.assertIn("Монтаж", message.get_content())
        self.assertIn("client@example.invalid", message.get_content())

    async def test_connection_loss_before_data_retries_and_refused_recipient_goes_to_review(self):
        request_id = await self.create_job()
        self.smtp.rcpt.side_effect = [ConnectionError("connection lost before DATA"),
            SMTPRecipientRefused(550, "No mailbox", "team@example.invalid")]
        await mail.process_delivery(request_id, "owner")
        self.assertEqual((await self.get_job(request_id)).status, "pending")
        self.smtp.data.assert_not_called()
        async with self.sessions.begin() as db:
            await db.execute(update(RequestMail).where(RequestMail.request_id == request_id).values(next_attempt_at=0))
        await mail.drain_pending()
        self.assertEqual((await self.get_job(request_id)).status, "review")
        self.smtp.data.assert_not_called()

    async def test_unconfigured_mail_remains_pending_until_provider_is_ready(self):
        request_id = await self.create_job()
        with patch.object(mail.settings, "smtp_host", ""):
            await mail.process_delivery(request_id, "owner")
        job = await self.get_job(request_id)
        self.assertEqual((job.status, job.last_error), ("pending", "smtp_not_configured"))
        self.smtp.data.assert_not_called()


if __name__ == "__main__":
    unittest.main()
