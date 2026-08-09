from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.database import get_db
from app.models.audit import AuditLog
from app.models.page import Page, Seo
from app.models.user import User
from app.schemas.page import SeoOut, SeoUpdate

router = APIRouter(prefix="/seo", tags=["seo"])


async def _get_page_or_404(slug: str, db: AsyncSession) -> Page:
    slug = "/" + slug.strip("/") + "/"
    result = await db.execute(select(Page).where(Page.slug == slug))
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.get("/{slug:path}", response_model=SeoOut)
async def get_seo(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
) -> SeoOut:
    page = await _get_page_or_404(slug, db)

    seo_result = await db.execute(select(Seo).where(Seo.page_id == page.id))
    seo = seo_result.scalar_one_or_none()
    if seo is None:
        return SeoOut()

    return SeoOut.model_validate(seo)


@router.patch("/{slug:path}", response_model=SeoOut)
async def update_seo(
    slug: str,
    payload: SeoUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
) -> SeoOut:
    page = await _get_page_or_404(slug, db)

    seo_result = await db.execute(select(Seo).where(Seo.page_id == page.id))
    seo = seo_result.scalar_one_or_none()

    if seo is None:
        seo = Seo(page_id=page.id)
        db.add(seo)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(seo, field, value)

    db.add(AuditLog(user_id=user.id, action="update", entity="seo", entity_id=page.slug, meta=None))

    await db.commit()
    await db.refresh(seo)

    return SeoOut.model_validate(seo)
