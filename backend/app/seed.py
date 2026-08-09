"""Первичное наполнение: админ, страницы лендинга с SEO, базовые настройки.

Страницы и их SEO читаются из реального контента лендинга (src/content),
поэтому в админке сразу видны все 170 страниц с их текущими title/description.

Запуск из папки backend:  python -m app.seed
"""
import asyncio
import glob
import json
import os
import re
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.database import AsyncSessionLocal, Base, engine
from app.models.page import Page, Seo
from app.models.setting import Setting
from app.models.user import User, UserRole

ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@a-service.asia")
ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "ChangeMe123!")

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONTENT_DIR = os.path.join(REPO, "src", "content")
# Слепок страниц лендинга, лежащий рядом с бэкендом: в контейнере (Railway)
# папки src/content нет, поэтому сид читает этот файл.
PAGES_JSON = os.path.join(os.path.dirname(__file__), "data", "pages.json")

# Редактируемые блоки главной страницы (тексты hero и контакты показываются
# на лендинге через content.js — см. frontend/assets/js/cms.js).
HOME_BLOCKS_RU = [
    {
        "id": "hero",
        "type": "hero",
        "order": 0,
        "enabled": True,
        "data": {
            "title": "Один подрядчик. Весь цикл. Результат под контролем.",
            "subtitle": (
                "Полный цикл работ с банкоматами по Казахстану: обследование, демонтаж, упаковка, "
                "такелаж, перевозка, восстановление, покраска, брендирование и монтаж."
            ),
        },
    },
]
HOME_BLOCKS_KK = [
    {
        "id": "hero",
        "type": "hero",
        "order": 0,
        "enabled": True,
        "data": {
            "title": "Бір мердігер. Толық цикл. Нәтиже бақылауда.",
            "subtitle": (
                "Қазақстан бойынша банкоматтармен толық жұмыс циклі: тексеру, демонтаж, қаптау, "
                "такелаж, тасымалдау, қалпына келтіру, бояу, брендтеу және монтаж."
            ),
        },
    },
]

DEFAULT_SETTINGS = [
    {"key": "contact_phone", "value": "+7 777 729 49 64"},
    {"key": "contact_whatsapp", "value": "77777294964"},
    {"key": "contact_email", "value": "haba-87@mail.ru"},
    {"key": "contact_person", "value": "Асылжанов Азиз"},
]


def read_landing_pages() -> list[dict]:
    """slug/title/description всех страниц лендинга: из src/content, иначе из data/pages.json."""
    pages: list[dict] = []
    if not os.path.isdir(CONTENT_DIR):
        if os.path.isfile(PAGES_JSON):
            return json.load(open(PAGES_JSON, encoding="utf-8"))
        print(f"! ни {CONTENT_DIR}, ни {PAGES_JSON} не найдены — страницы не загружены", file=sys.stderr)
        return pages

    for lang in ("ru", "kk"):
        for path in sorted(glob.glob(os.path.join(CONTENT_DIR, lang, "*.html"))):
            name = os.path.splitext(os.path.basename(path))[0]
            slug = f"/{lang}/" if name == "index" else "/%s/%s/" % (lang, name.replace("__", "/"))
            text = open(path, encoding="utf-8").read()
            t = re.search(r"<title>(.*?)</title>", text)
            d = re.search(r'<meta name="description" content="([^"]*)"', text)
            pages.append(
                {
                    "slug": slug,
                    "title": (t.group(1) if t else slug)[:255],
                    "description": d.group(1) if d else None,
                }
            )
    return pages


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # --- админ ---
        result = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        if result.scalar_one_or_none() is None:
            db.add(
                User(
                    email=ADMIN_EMAIL,
                    name="Администратор",
                    role=UserRole.ADMIN,
                    password_hash=hash_password(ADMIN_PASSWORD),
                )
            )
            print(f"+ admin user {ADMIN_EMAIL} (пароль из SEED_ADMIN_PASSWORD — смените после входа)")

        # --- страницы лендинга + SEO ---
        created = 0
        for info in read_landing_pages():
            result = await db.execute(select(Page).where(Page.slug == info["slug"]))
            if result.scalar_one_or_none() is not None:
                continue
            blocks = []
            if info["slug"] == "/ru/":
                blocks = HOME_BLOCKS_RU
            elif info["slug"] == "/kk/":
                blocks = HOME_BLOCKS_KK
            page = Page(slug=info["slug"], title=info["title"], blocks=blocks)
            db.add(page)
            await db.flush()
            db.add(Seo(page_id=page.id, title=info["title"], description=info["description"]))
            created += 1
        if created:
            print(f"+ {created} pages with SEO")

        # --- настройки ---
        for item in DEFAULT_SETTINGS:
            if await db.get(Setting, item["key"]) is None:
                db.add(Setting(key=item["key"], value=item["value"]))

        await db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
