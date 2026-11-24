"""Метаданные банковской витрины для штатной CMS, без перезаписи ручных правок."""
import json
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path

from sqlalchemy import select
from app.models.audit import AuditLog
from app.models.page import Page, Seo


class BankMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = self.description = self.heading = self.subtitle = ""
        self.target = None
        self.end_tag = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content", "")
        if tag == "title":
            self.target, self.end_tag = "title", tag
        elif tag == "h1" and attrs.get("id") == "hero-title":
            self.target, self.end_tag = "heading", tag
        elif tag == "p" and "hero-intro" in attrs.get("class", "").split():
            self.target, self.end_tag = "subtitle", tag
        elif tag == "br" and self.target:
            self.handle_data(" ")

    def handle_endtag(self, tag):
        if self.end_tag == tag:
            self.target = self.end_tag = None

    def handle_data(self, data):
        if self.target:
            setattr(self, self.target, getattr(self, self.target) + data)


def metadata_from_pages(directory):
    directory = Path(directory)
    records = {}
    for page in sorted(directory.glob("*/**/index.html")):
        if page.relative_to(directory).parts[0] not in ("ru", "kk"):
            continue
        parser = BankMetadata()
        parser.feed(page.read_text(encoding="utf-8"))
        slug = "/" + page.parent.relative_to(directory).as_posix() + "/"
        info = {"slug": slug, "title": parser.title.strip()[:255], "description": parser.description}
        if parser.heading and parser.subtitle:
            info["hero"] = {"title": " ".join(parser.heading.split()), "subtitle": parser.subtitle.strip()}
        records[slug] = info
    return records


def bank_pages():
    source = Path(__file__).resolve().parents[2] / "src" / "bank_site" / "pages"
    if source.is_dir():
        return metadata_from_pages(source)
    snapshot = Path(__file__).parent / "data" / "bank-pages.json"
    return json.loads(snapshot.read_text(encoding="utf-8"))


# These hashes identify only factory values changed by this release. Both monorepo
# and backend-only deployments can migrate them without storing the old wording.
PREVIOUS_DEFAULTS = json.loads(
    (Path(__file__).parent / "data" / "bank-previous-defaults.json").read_text(encoding="utf-8")
)


async def upgrade_seeded_values(db, page: Page, old, new, old_hero, edited):
    previous = PREVIOUS_DEFAULTS.get(page.slug, {})
    if not old and not previous:
        return
    old = old or {}

    def is_factory(value, key, initial, entity):
        if not isinstance(value, str):
            return False
        if (entity, page.slug) not in edited and value == initial:
            return True
        return key in previous and sha256(value.encode()).hexdigest() == previous[key]

    if is_factory(page.title, "title", old.get("title"), "page"):
        page.title = new["title"]
    if "hero" in new:
        blocks = []
        for block in page.blocks or []:
            if block.get("id") == "hero":
                data = dict(block.get("data") or {})
                for field, value in new["hero"].items():
                    if is_factory(data.get(field), "hero."+field, old_hero.get(field), "page"):
                        data[field] = value
                block = {**block, "data": data}
            blocks.append(block)
        if page.blocks != blocks:
            page.blocks = blocks
    seo = await db.scalar(select(Seo).where(Seo.page_id == page.id))
    if seo:
        for key in ("title", "description"):
            if is_factory(getattr(seo, key), key, old.get(key), "seo"):
                setattr(seo, key, new[key])


async def edited_pages(db, paths):
    return set((await db.execute(select(AuditLog.entity, AuditLog.entity_id).where(
        AuditLog.entity.in_(("page", "seo")), AuditLog.entity_id.in_(list(paths))
    ).distinct())).all())
