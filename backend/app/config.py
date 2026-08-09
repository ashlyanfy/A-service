import re
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRET_KEY = "change-me-to-a-long-random-string"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database (SQLite по умолчанию для разработки; в проде — PostgreSQL)
    database_url: str = "sqlite+aiosqlite:///./aservice.db"

    # JWT
    secret_key: str = INSECURE_SECRET_KEY
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    # CORS: админка (admin.a-service.asia) + лендинг + локальная разработка
    cors_origins: str = (
        "http://localhost:3000,http://localhost:8734,"
        "https://admin.a-service.asia,https://a-service.asia,https://www.a-service.asia,"
        "https://majestic-salmiakki-b87621.netlify.app"
    )

    # Админка (ссылки в письмах восстановления пароля)
    admin_url: str = "https://admin.a-service.asia"

    # Загрузка вложений заявок
    upload_dir: str = "uploads"
    max_upload_bytes: int = 10 * 1024 * 1024  # 10 MB

    # VAPID / Web Push
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_claims_sub: str = "mailto:haba-87@mail.ru"

    # SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "A-SERVICE <no-reply@a-service.asia>"
    smtp_use_tls: bool = True

    # Telegram-уведомления о новых заявках
    telegram_bot_token: str = ""
    telegram_chat_ids: str = ""

    env: str = "development"

    @model_validator(mode="after")
    def _normalize_database_url(self) -> "Settings":
        """Railway отдаёт DATABASE_URL как postgres:// или postgresql:// — оба варианта
        уводят SQLAlchemy на синхронный драйвер psycopg2, которого в проекте нет.
        Приводим к asyncpg, чтобы приложение поднималось с любым значением."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        # asyncpg не понимает параметр sslmode из строки подключения (это опция libpq)
        if "+asyncpg" in url and "sslmode=" in url:
            url = re.sub(r"[?&]sslmode=[^&]*", "", url)
        object.__setattr__(self, "database_url", url)
        return self

    @model_validator(mode="after")
    def _validate_secret_key(self) -> "Settings":
        if self.env != "development" and (self.secret_key == INSECURE_SECRET_KEY or len(self.secret_key) < 32):
            raise ValueError(
                "SECRET_KEY must be set to a unique random string of at least 32 characters "
                "when ENV is not 'development'. Generate one with: python -c "
                "\"import secrets; print(secrets.token_urlsafe(48))\""
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def telegram_chat_ids_list(self) -> list[str]:
        return [c.strip() for c in self.telegram_chat_ids.split(",") if c.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
