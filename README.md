# A-SERVICE — сайт a-service.kz

Корпоративный сайт A-SERVICE (Казахстан): монтаж/демонтаж банкоматов, покраска,
козырьки, корпоративная логистика. Два языка: русский (`/ru/`) и казахский (`/kk/`).

Продакшн: https://majestic-salmiakki-b87621.netlify.app

## Структура репозитория

```
├── frontend/     # лендинг-сайт (статический экспорт Next.js) — публикуется на Netlify
│   ├── ru/           # страницы на русском
│   ├── kk/           # страницы на казахском
│   ├── _next/        # JS/CSS-сборка Next.js
│   ├── images/ icons/ video/ brands/   # медиа
│   ├── _redirects    # правила редиректов Netlify (/ → /ru/ и т.д.)
│   ├── _headers      # HTTP-заголовки Netlify
│   └── sitemap.xml, robots.txt, sw.js, манифесты PWA
├── backend/      # серверная часть (зарезервировано, см. backend/README.md)
├── admin/        # админ-панель (зарезервировано, см. admin/README.md)
└── netlify.toml  # конфиг Netlify: publish = "frontend"
```

## Деплой

Netlify публикует содержимое папки `frontend/` (задано в `netlify.toml`).
Команда сборки не нужна — в репозитории уже готовая статика.

При ручном деплое (drag-and-drop или CLI) загружайте папку `frontend/`.

## Локальный запуск

```bash
python -m http.server 8734 --directory frontend
```

Затем открыть http://localhost:8734/ru/

## Правки стилей

Глобальный CSS: `frontend/_next/static/chunks/0.c7rya17m5lt.css`.
Кастомные правки добавлены в конец файла (блок `custom overrides`).
