# Backend

Серверная часть проекта A-SERVICE (API, обработка форм, интеграции).

Пока пусто — зарезервировано под будущий код. Возможные варианты:

- **Netlify Functions** — папка `netlify/functions/` (serverless, бесплатный тариф);
- **Node.js (Express/Fastify)** — отдельный сервер под API;
- обработчики форм «Получить расчёт» / «Запрос КП», отправка в WhatsApp/Telegram/почту.

Структура на будущее:

```
backend/
  src/        # исходный код API
  package.json
```
