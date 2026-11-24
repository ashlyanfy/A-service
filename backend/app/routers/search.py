from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_any
from app.bank_archive import ARCHIVED_SLUGS
from app.database import get_db
from app.models.lead import Lead
from app.models.page import Page
from app.models.user import User
from app.schemas.search import LeadSearchResult, PageSearchResult, SearchResults

router = APIRouter(prefix="/search", tags=["search"])


def _iter_strings(data):
    if isinstance(data, str):
        yield data
    elif isinstance(data, dict):
        for value in data.values():
            yield from _iter_strings(value)
    elif isinstance(data, list):
        for item in data:
            yield from _iter_strings(item)


def _search_blocks(page: Page, query: str) -> list[PageSearchResult]:
    matches: list[PageSearchResult] = []
    query_lower = query.lower()

    for block in page.blocks or []:
        data = block.get("data", {})
        for value in _iter_strings(data):
            if query_lower in value.lower():
                snippet = value if len(value) <= 160 else value[:157] + "..."
                matches.append(
                    PageSearchResult(
                        slug=page.slug,
                        title=page.title,
                        block_id=block.get("id", ""),
                        block_type=block.get("type", ""),
                        snippet=snippet,
                    )
                )
                break

    return matches


@router.get("", response_model=SearchResults)
async def search(
    q: str = Query(..., min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> SearchResults:
    like = f"%{q}%"

    leads_result = await db.execute(
        select(Lead)
        .where(or_(Lead.name.ilike(like), Lead.phone.ilike(like), Lead.email.ilike(like), Lead.company.ilike(like)))
        .order_by(Lead.created_at.desc())
        .limit(10)
    )
    leads = leads_result.scalars().all()

    pages_result = await db.execute(select(Page).where(Page.slug.not_in(ARCHIVED_SLUGS)))
    pages = pages_result.scalars().all()

    page_matches: list[PageSearchResult] = []
    for page in pages:
        page_matches.extend(_search_blocks(page, q))

    return SearchResults(
        leads=[
            LeadSearchResult(id=lead.id, name=lead.name, phone=lead.phone, email=lead.email, status=lead.status.value)
            for lead in leads
        ],
        pages=page_matches[:20],
    )
