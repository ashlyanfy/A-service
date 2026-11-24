import os
import re
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.limiter import limiter
from app.bank_archive import ARCHIVED_SLUGS
from app.database import get_db
from app.models.event import SiteEvent, SiteEventType
from app.models.lead import Lead
from app.models.page import Page, Seo
from app.models.setting import Setting
from app.schemas.event import SiteEventCreate
from app.schemas.lead import LeadCreate, LeadPublicOut
from app.schemas.page import PublicPageOut, SeoOut
from app.services.notify import notify_new_lead

router = APIRouter(prefix="/public", tags=["public"])

ALLOWED_UPLOAD_EXT = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".jpg", ".jpeg", ".png", ".webp"}

# Наружу отдаются только контактные ключи — никаких секретов из settings.
PUBLIC_SETTING_KEYS = ("contact_phone", "contact_whatsapp", "contact_email", "contact_person")


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("240/minute")
async def track_event(
    request: Request, payload: SiteEventCreate, db: AsyncSession = Depends(get_db)
) -> dict:
    """Приём события посетителя (просмотр страницы, клики по CTA) с лендинга."""
    event = SiteEvent(
        event_type=payload.event_type,
        page=payload.page,
        visitor_id=payload.visitor_id,
        ip=request.client.host if request.client else None,
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.add(event)
    await db.commit()
    return {"detail": "accepted"}


async def _save_attachment(attachment: UploadFile | None) -> tuple[str | None, str | None]:
    """Сохраняет вложение заявки на диск. Возвращает (path, original_name)."""
    if attachment is None or not attachment.filename:
        return None, None

    ext = os.path.splitext(attachment.filename)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Недопустимый тип файла. Разрешены: PDF, Word, Excel, CSV, изображения.",
        )

    content = await attachment.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Файл слишком большой (максимум 10 МБ).",
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.upload_dir, stored_name)
    with open(path, "wb") as f:
        f.write(content)

    # Оригинальное имя нормализуем, чтобы не хранить управляющие символы.
    safe_name = re.sub(r"[\r\n\t\"\\/]+", "_", attachment.filename)[:255]
    return stored_name, safe_name


@router.post("/leads", response_model=LeadPublicOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_lead(
    request: Request,
    db: AsyncSession = Depends(get_db),
    name: str = Form(...),
    phone: str = Form(...),
    company: str | None = Form(None),
    email: str | None = Form(None),
    category: str | None = Form(None),
    subtask: str | None = Form(None),
    city: str | None = Form(None),
    quantity: str | None = Form(None),
    preferred_date: str | None = Form(None, alias="targetDate"),
    message: str | None = Form(None, alias="task"),
    source_page: str | None = Form(None, alias="sourceService"),
    locale: str | None = Form(None),
    visitor_id: str | None = Form(None, alias="visitorId"),
    attachment: UploadFile | None = File(None),
) -> LeadPublicOut:
    """Заявка с формы «Получить расчёт» (multipart, поля совпадают с анкетой сайта)."""
    parsed_date: date | None = None
    if preferred_date:
        try:
            parsed_date = date.fromisoformat(preferred_date)
        except ValueError:
            parsed_date = None

    try:
        payload = LeadCreate(
            name=name.strip(),
            phone=phone,
            company=(company or "").strip() or None,
            email=(email or "").strip() or None,
            category=category or None,
            subtask=subtask or None,
            city=(city or "").strip() or None,
            quantity=(quantity or "").strip() or None,
            preferred_date=parsed_date,
            message=(message or "").strip() or None,
            source_page=(source_page or "").strip() or None,
            locale=locale if locale in ("ru", "kk") else None,
            source="website",
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Проверьте правильность заполнения формы.",
        ) from exc

    stored_path, original_name = await _save_attachment(attachment)

    lead = Lead(
        **payload.model_dump(exclude={"source"}),
        source=payload.source,
        attachment_path=stored_path,
        attachment_name=original_name,
        ip=request.client.host if request.client else None,
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.add(lead)

    # Отправка заявки фиксируется и как событие аналитики (server-side, надёжнее клиента).
    if visitor_id:
        db.add(
            SiteEvent(
                event_type=SiteEventType.LEAD_SUBMIT,
                page=payload.source_page,
                visitor_id=visitor_id[:64],
                ip=lead.ip,
                user_agent=lead.user_agent,
            )
        )

    await db.commit()
    await db.refresh(lead)

    await notify_new_lead(db, lead)

    # Наружу уходит только id — никаких внутренних полей.
    return LeadPublicOut(id=lead.id)


@router.get("/contacts")
async def get_public_contacts(db: AsyncSession = Depends(get_db)) -> dict:
    """Контакты, показываемые на лендинге (редактируются в админке)."""
    result = await db.execute(select(Setting).where(Setting.key.in_(PUBLIC_SETTING_KEYS)))
    return {row.key: row.value for row in result.scalars().all()}


@router.get("/pages/{slug:path}", response_model=PublicPageOut)
async def get_public_page(slug: str, db: AsyncSession = Depends(get_db)) -> PublicPageOut:
    slug = "/" + slug.strip("/") + "/"
    result = await db.execute(select(Page).where(Page.slug == slug, Page.slug.not_in(ARCHIVED_SLUGS)))
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    blocks = sorted((b for b in page.blocks if b.get("enabled", True)), key=lambda b: b.get("order", 0))
    return PublicPageOut(slug=page.slug, title=page.title, blocks=blocks)


@router.get("/seo/{slug:path}", response_model=SeoOut)
async def get_public_seo(slug: str, db: AsyncSession = Depends(get_db)) -> SeoOut:
    slug = "/" + slug.strip("/") + "/"
    result = await db.execute(select(Page).where(Page.slug == slug, Page.slug.not_in(ARCHIVED_SLUGS)))
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    seo_result = await db.execute(select(Seo).where(Seo.page_id == page.id))
    seo = seo_result.scalar_one_or_none()
    if seo is None:
        return SeoOut()

    return SeoOut.model_validate(seo)
