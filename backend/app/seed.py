"""Первичное наполнение: админ, страницы лендинга с SEO, базовые настройки.

Страницы и их SEO читаются из реального контента лендинга (src/content),
при первом запуске записи появляются в админке с заголовками и описаниями из поставки.

Запуск из папки backend:  python -m app.seed
"""
import asyncio
import glob
import json
import os
import re
import sys

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select, update

from app.bank_archive import ARCHIVED_SLUGS
from app.bank_seed import bank_pages, edited_pages, upgrade_seeded_values

from app.config import settings
from app.core.security import hash_password
from app.database import AsyncSessionLocal, Base, engine
from app.models.audit import AuditLog
from app.models.page import Page, Seo
from app.models.setting import Setting
from app.models.user import User, UserRole

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


async def update_previous_descriptions(db, landing):
    """Меняем только отмеченные заводские описания. Собственные правки редактора сохраняем."""
    if not os.path.isfile(PAGES_JSON):
        return
    with open(PAGES_JSON, encoding="utf-8") as snapshot:
        records = json.load(snapshot)
    for row in records:
        previous = row.get("previous_description")
        slug = row["slug"]
        if not previous or slug not in landing:
            continue
        edited = select(AuditLog.id).where(AuditLog.entity == "seo", AuditLog.entity_id == slug).exists()
        page_id = select(Page.id).where(Page.slug == slug).scalar_subquery()
        await db.execute(update(Seo).where(
            Seo.page_id == page_id, Seo.description == previous, ~edited
        ).values(description=landing[slug]["description"]))


async def seed_initial_admin(db):
    if await db.scalar(select(User.id).limit(1)) is not None:
        return
    password = settings.seed_admin_password.get_secret_value()
    if len(password) < 16 or len(password.encode("utf-8")) > 72:
        print("Первичный администратор не создан. Задайте SEED_ADMIN_EMAIL и собственный "
              "SEED_ADMIN_PASSWORD (от 16 символов, до 72 байт UTF-8).", file=sys.stderr)
        return
    try:
        email = TypeAdapter(EmailStr).validate_python(settings.seed_admin_email)
    except ValidationError:
        print("Первичный администратор не создан. Проверьте SEED_ADMIN_EMAIL.", file=sys.stderr)
        return
    db.add(User(email=email, name="Администратор", role=UserRole.ADMIN, password_hash=hash_password(password)))
    print("+ первичный администратор")


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await seed_initial_admin(db)

        # --- страницы лендинга + SEO ---
        created = 0
        legacy = {row["slug"]: row for row in read_landing_pages() if row["slug"] not in ARCHIVED_SLUGS}
        await update_previous_descriptions(db, legacy)
        catalog = bank_pages()
        changed_by_staff = await edited_pages(db, catalog)
        for info in {**legacy, **catalog}.values():
            result = await db.execute(select(Page).where(Page.slug == info["slug"]))
            existing = result.scalar_one_or_none()
            previous = HOME_BLOCKS_KK if info["slug"] == "/kk/" else HOME_BLOCKS_RU
            if existing is not None:
                if info["slug"] in catalog:
                    await upgrade_seeded_values(db, existing, legacy.get(info["slug"]), info,
                                                previous[0]["data"], changed_by_staff)
                continue
            blocks = []
            if info["slug"] == "/ru/":
                blocks = HOME_BLOCKS_RU
            elif info["slug"] == "/kk/":
                blocks = HOME_BLOCKS_KK
            if blocks and "hero" in info:
                blocks = [{**blocks[0], "data": info["hero"]}]
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
