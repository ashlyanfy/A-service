from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_any
from app.database import get_db
from app.models.event import SiteEvent, SiteEventType
from app.models.user import User
from app.schemas.event import (
    PageBreakdownOut,
    PageBreakdownPoint,
    SiteEventListOut,
    SiteEventOut,
    SiteEventStatsOut,
    VisitsDailyOut,
    VisitsDailyPoint,
)

router = APIRouter(prefix="/events", tags=["events"])


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _range_conditions(date_from: date | None, date_to: date | None) -> list:
    """Инклюзивный период [date_from, date_to]; по умолчанию — сегодня.

    Границы строим с tzinfo=UTC: created_at хранится как timestamptz, и наивное
    значение PostgreSQL истолковал бы по часовому поясу сессии — сутки съезжали бы.
    """
    start = date_from or _today()
    end = date_to or _today()
    return [
        SiteEvent.created_at >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
        SiteEvent.created_at <= datetime.combine(end, datetime.max.time(), tzinfo=timezone.utc),
    ]


@router.get("/stats", response_model=SiteEventStatsOut)
async def event_stats(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> SiteEventStatsOut:
    conditions = _range_conditions(date_from, date_to)

    count_stmt = select(SiteEvent.event_type, func.count()).group_by(SiteEvent.event_type)
    for cond in conditions:
        count_stmt = count_stmt.where(cond)
    counts = {row[0]: row[1] for row in (await db.execute(count_stmt)).all()}

    unique_stmt = select(func.count(func.distinct(SiteEvent.visitor_id)))
    for cond in conditions:
        unique_stmt = unique_stmt.where(cond)
    unique_visitors = (await db.execute(unique_stmt)).scalar_one()

    page_view = counts.get(SiteEventType.PAGE_VIEW, 0)
    whatsapp = counts.get(SiteEventType.WHATSAPP, 0)
    call = counts.get(SiteEventType.CALL, 0)
    quote_open = counts.get(SiteEventType.QUOTE_OPEN, 0)
    lead_submit = counts.get(SiteEventType.LEAD_SUBMIT, 0)

    return SiteEventStatsOut(
        page_view=page_view,
        whatsapp=whatsapp,
        call=call,
        quote_open=quote_open,
        lead_submit=lead_submit,
        unique_visitors=unique_visitors,
        total_actions=whatsapp + call + quote_open + lead_submit,
    )


@router.get("/visits-daily", response_model=VisitsDailyOut)
async def visits_daily(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> VisitsDailyOut:
    """Посещаемость по дням: просмотры страниц и уникальные посетители."""
    since_date = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date()

    stmt = (
        select(
            func.date(SiteEvent.created_at).label("day"),
            func.count(),
            func.count(func.distinct(SiteEvent.visitor_id)),
        )
        .where(SiteEvent.event_type == SiteEventType.PAGE_VIEW)
        .where(func.date(SiteEvent.created_at) >= since_date)
        .group_by("day")
        .order_by("day")
    )
    by_day = {}
    for row in (await db.execute(stmt)).all():
        day = row[0] if isinstance(row[0], date) else date.fromisoformat(str(row[0]))
        by_day[day] = (row[1], row[2])

    points = []
    for i in range(days):
        day = since_date + timedelta(days=i)
        views, visitors = by_day.get(day, (0, 0))
        points.append(VisitsDailyPoint(date=day, views=views, visitors=visitors))

    return VisitsDailyOut(points=points)


@router.get("/by-page", response_model=PageBreakdownOut)
async def event_by_page(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> PageBreakdownOut:
    conditions = _range_conditions(date_from, date_to)

    stmt = select(SiteEvent.page, SiteEvent.event_type, func.count()).group_by(
        SiteEvent.page, SiteEvent.event_type
    )
    for cond in conditions:
        stmt = stmt.where(cond)

    breakdown: dict[str, dict] = {}
    for page, event_type, count in (await db.execute(stmt)).all():
        key = page or "—"
        row = breakdown.setdefault(key, {"views": 0, "whatsapp": 0, "call": 0, "quote_open": 0, "lead_submit": 0})
        if event_type == SiteEventType.PAGE_VIEW:
            row["views"] += count
        elif event_type == SiteEventType.WHATSAPP:
            row["whatsapp"] += count
        elif event_type == SiteEventType.CALL:
            row["call"] += count
        elif event_type == SiteEventType.QUOTE_OPEN:
            row["quote_open"] += count
        elif event_type == SiteEventType.LEAD_SUBMIT:
            row["lead_submit"] += count

    items = [
        PageBreakdownPoint(
            page=page,
            views=row["views"],
            whatsapp=row["whatsapp"],
            call=row["call"],
            quote_open=row["quote_open"],
            lead_submit=row["lead_submit"],
            total=row["whatsapp"] + row["call"] + row["quote_open"] + row["lead_submit"],
        )
        for page, row in breakdown.items()
    ]
    items.sort(key=lambda p: (p.total, p.views), reverse=True)

    return PageBreakdownOut(items=items)


@router.get("", response_model=SiteEventListOut)
async def list_events(
    date_from: date | None = None,
    date_to: date | None = None,
    event_type: SiteEventType | None = Query(None),
    page_filter: str | None = Query(None, alias="page_name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> SiteEventListOut:
    conditions = _range_conditions(date_from, date_to)
    if event_type:
        conditions.append(SiteEvent.event_type == event_type)
    if page_filter:
        conditions.append(SiteEvent.page == page_filter)

    count_stmt = select(func.count()).select_from(SiteEvent)
    stmt = select(SiteEvent)
    for cond in conditions:
        count_stmt = count_stmt.where(cond)
        stmt = stmt.where(cond)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(SiteEvent.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()

    return SiteEventListOut(
        items=[SiteEventOut.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
