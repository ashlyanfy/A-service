from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.database import get_db
from app.models.audit import AuditLog
from app.models.page import Page
from app.models.user import User
from app.schemas.page import PageListItem, PageOut, PageUpdate

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("", response_model=list[PageListItem])
async def list_pages(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
) -> list[PageListItem]:
    result = await db.execute(select(Page).order_by(Page.slug))
    pages = result.scalars().all()
    return [PageListItem.model_validate(p) for p in pages]


async def _get_page_or_404(slug: str, db: AsyncSession) -> Page:
    slug = "/" + slug.strip("/") + "/"
    result = await db.execute(select(Page).where(Page.slug == slug))
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.get("/{slug:path}", response_model=PageOut)
async def get_page(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
) -> PageOut:
    page = await _get_page_or_404(slug, db)
    return PageOut.model_validate(page)


@router.patch("/{slug:path}", response_model=PageOut)
async def update_page(
    slug: str,
    payload: PageUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
) -> PageOut:
    page = await _get_page_or_404(slug, db)

    if payload.title is not None:
        page.title = payload.title

    if payload.blocks is not None:
        blocks = sorted(payload.blocks, key=lambda b: b.order)
        page.blocks = [b.model_dump() for b in blocks]

    db.add(AuditLog(user_id=user.id, action="update", entity="page", entity_id=page.slug, meta=None))

    await db.commit()
    await db.refresh(page)

    return PageOut.model_validate(page)
