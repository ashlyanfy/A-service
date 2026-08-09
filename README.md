# A-SERVICE — сайт a-service.kz

Корпоративный сайт A-SERVICE (Казахстан): монтаж/демонтаж банкоматов, покраска,
козырьки, корпоративная логистика. Два языка: русский (`/ru/`) и казахский (`/kk/`).

Продакшн: https://majestic-salmiakki-b87621.netlify.app

Сайт — чистая статика (HTML/CSS/JS без фреймворков), собирается из `src/` в `frontend/`.

## Структура репозитория

```
├── src/              # ИСХОДНИКИ — править здесь
│   ├── build.py          # сборка: python src/build.py  ->  frontend/
│   ├── content/ru/ kk/   # по файлу на страницу: front-matter (@meta/@head/@jsonld) + <main>
│   ├── templates/        # шапка, подвал+диалог расчёта, общий JSON-LD (по локали)
│   ├── assets/css/       # слои каскада 10..60 — подключаются строго по номерам
│   ├── assets/js/        # main.js (шапка, reveal, видео), form.js (анкета), search.js
│   └── tools/            # одноразовые скрипты миграции (extract, split_css, ...)
├── frontend/         # РЕЗУЛЬТАТ СБОРКИ — публикуется на Netlify, руками не править
│   ├── ru/ kk/           # собранные страницы
│   ├── assets/           # site.css (склейка слоёв), js, search-*.json
│   ├── images/ icons/ video/ brands/   # медиа (копируются как есть)
│   └── _redirects, _headers, sitemap.xml, robots.txt, sw.js, манифесты PWA
├── backend/          # FastAPI CRM API: заявки, аналитика, контент, SEO (см. README внутри)
├── admin/            # Next.js админка crm.a-service.asia (см. README внутри)
└── netlify.toml      # publish = "frontend"
```

## Связка с CRM

Лендинг связан с админкой через backend:
- форма «Получить расчёт» отправляет заявки в CRM (`/public/leads`);
- аналитика посещений и кликов уходит в CRM (`/public/events`);
- SEO и редактируемые блоки страниц подтягиваются из CRM поверх статики
  (`src/assets/js/cms.js`);
- адрес API задаётся при сборке: `ASERVICE_API_URL=https://api.a-service.asia python src/build.py`
  (по умолчанию http://localhost:8010 для разработки).

## Сборка и запуск

```bash
python src/build.py
python -m http.server 8734 --directory frontend
```

Затем открыть http://localhost:8734/ru/

## Как править

- **Текст/разметку страницы** — `src/content/<lang>/<slug>.html`, затем сборка.
  Вложенные страницы: `blog__slug.html` -> `/ru/blog/slug/`.
- **Стили** — `src/assets/css/60-fixes.css` (последний слой перекрывает все).
  Файлы 10–50 — исторические слои старого дизайна, порядок менять нельзя.
- **Шапку/подвал/диалог** — `src/templates/*-{ru,kk}.html` (общие для всех страниц).
- **Поведение** — `src/assets/js/*.js`.
- Ссылки на CSS/JS версионируются хэшем автоматически (`?v=`), кэш сбрасывается сам.

## Формы

Netlify Forms: форма `a-service-project-brief` (диалог на каждой странице + встроенная
на «Контактах» и «Запросе КП»). Трёхшаговый визард — `src/assets/js/form.js`,
справочник категорий/подзадач там же.

## История

До 2026-08 сайт был статическим экспортом Next.js (85 страниц × 2 локали, дубли
контента в RSC-payload). Переведён на чистую статику без изменения дизайна;
исходники старой сборки — в git-истории.
