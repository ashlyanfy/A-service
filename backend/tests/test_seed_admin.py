"""Проверка первичного пользователя при установке и обновлении CRM."""
import unittest
from unittest.mock import patch

from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.core.security import verify_password
from app.database import Base
from app.models.user import User, UserRole
from app.seed import seed_initial_admin


class InitialAdminTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        self.addAsyncCleanup(engine.dispose)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(engine)

    async def run_seed(self, email, password):
        with patch.object(settings, "seed_admin_email", email), patch.object(
            settings, "seed_admin_password", SecretStr(password)
        ):
            async with self.sessions.begin() as db:
                await seed_initial_admin(db)

    async def users(self):
        async with self.sessions() as db:
            return (await db.scalars(select(User))).all()

    async def test_empty_database_requires_explicit_credentials(self):
        await self.run_seed("", "")
        await self.run_seed("owner@example.kz", "short")
        await self.run_seed("invalid", "a-long-test-only-password")
        self.assertEqual(await self.users(), [])

        await self.run_seed("owner@EXAMPLE.KZ", "a-long-test-only-password")
        owner, = await self.users()
        self.assertEqual((owner.email, owner.role), ("owner@example.kz", UserRole.ADMIN))
        self.assertTrue(verify_password("a-long-test-only-password", owner.password_hash))

    async def test_existing_database_ignores_bootstrap_configuration(self):
        async with self.sessions.begin() as db:
            db.add(User(name="Менеджер", role=UserRole.MANAGER, email="user@example.kz", password_hash="original"))
        await self.run_seed("new-owner@example.kz", "a-long-test-only-password")
        await self.run_seed("user@example.kz", "a-long-test-only-password")
        owner, = await self.users()
        self.assertEqual((owner.email, owner.role, owner.password_hash), ("user@example.kz", UserRole.MANAGER, "original"))
