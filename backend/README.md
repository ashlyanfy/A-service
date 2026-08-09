# Backend — A-SERVICE Admin API

FastAPI + SQLAlchemy (async). Обслуживает лендинг a-service.asia
и админку admin.a-service.asia.

## Возможности

- **Заявки**: приём с формы лендинга (multipart, вложения до 10 МБ), статусы,
  заметки, ответственные, суммы сделок, экспорт в Excel, уведомления
  (Telegram + web-push).
- **Аналитика**: события посетителей (просмотры, WhatsApp, звонки, открытия
  анкеты, отправки заявок), уникальные посетители, разбивка по страницам,
  посещаемость и продажи по дням.
- **Контент**: блоки страниц + SEO (title/description/keywords/og-image)
  каждой из 170 страниц лендинга; публичные эндпоинты для сайта.
- **Безопасность**: JWT access/refresh с token_version (отзыв при logout/смене
  пароля), роли ADMIN/MANAGER, rate-limits (логин 5/мин, заявки 5/мин),
  лимит тела запроса, security-заголовки, CORS-белый список, маскирование
  секретов в настройках, аудит-лог всех изменений.

## Запуск

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
cp .env.example .env                             # заполнить SECRET_KEY и пр.
.venv/Scripts/python -m app.seed                 # админ + страницы + настройки
.venv/Scripts/python -m uvicorn app.main:app --port 8010
```

Первичный админ: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` из .env
(по умолчанию admin@a-service.asia / ChangeMe123! — сменить после входа).

## Прод

- PostgreSQL: `DATABASE_URL=postgresql+asyncpg://...`
- `ENV=production` (включает HSTS, выключает /docs, требует надёжный SECRET_KEY)
- `CORS_ORIGINS` — точные адреса лендинга и админки
- Процесс: см. `Procfile` (uvicorn)
