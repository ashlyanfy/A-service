# Backend — A-SERVICE Admin API

FastAPI + SQLAlchemy (async). Обслуживает лендинг a-service.asia
и админку admin.a-service.asia.

## Возможности

- **Заявки**. Короткая анкета использует JSON-метод `POST /api/requests`.
  Штатная форма поддерживает multipart и вложения до 10 МБ. В CRM доступны статусы,
  заметки, ответственные, суммы сделок, экспорт в Excel, уведомления
  (Telegram + web-push).
- **Материалы для банков**. Метод `POST /api/material-requests` сохраняет обращение
  в CRM. Очередь отправляет одно служебное уведомление на `REQUESTS_NOTIFY_EMAIL`.
  Менеджер скачивает PDF на языке обращения через защищённый метод
  `GET /leads/{lead_id}/material` и отправляет его клиенту со своей почты.
  Для внутренних уведомлений настройте `SMTP_*`.
- **Аналитика**: события посетителей (просмотры, WhatsApp, звонки, открытия
  анкеты, отправки заявок), уникальные посетители, разбивка по страницам,
  посещаемость и продажи по дням.
- **Контент**: блоки страниц + SEO (title/description/keywords/og-image)
  страниц витрины и каталога; публичные эндпоинты для сайта.
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

Для новой базы укажите собственные `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD` в
`backend/.env` или переменных окружения. Длина пароля — от 16 символов, до 72 байт UTF-8.
Команда `python -m app.seed` создаёт администратора только при пустой таблице пользователей.
Пустые параметры позволяют запустить витрину без учётной записи. После создания первого
пользователя параметры можно очистить.

## Прод

- PostgreSQL: `DATABASE_URL=postgresql+asyncpg://...`
- `ENV=production` (включает HSTS, выключает /docs, требует надёжный SECRET_KEY)
- `CORS_ORIGINS` — точные адреса лендинга и админки
- Процесс: см. `Procfile` (uvicorn)
