import os
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.deps import require_any
from app.database import get_db
from app.models.audit import AuditLog
from app.models.lead import Lead, LeadNote, LeadStatus
from app.models.user import User
from app.schemas.event import SalesDailyOut, SalesDailyPoint
from app.schemas.lead import (
    LeadDailyOut,
    LeadDailyPoint,
    LeadDetailOut,
    LeadListOut,
    LeadNoteCreate,
    LeadNoteOut,
    LeadOut,
    LeadStatsOut,
    LeadUpdate,
)
from app.services.export import export_lead_to_excel, export_leads_to_excel

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=LeadListOut)
async def list_leads(
    q: str | None = None,
    status_filter: LeadStatus | None = Query(None, alias="status"),
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> LeadListOut:
    stmt = select(Lead).options(selectinload(Lead.assignee))
    count_stmt = select(func.count()).select_from(Lead)

    conditions = []
    if q:
        like = f"%{q}%"
        conditions.append(
            or_(Lead.name.ilike(like), Lead.phone.ilike(like), Lead.email.ilike(like), Lead.company.ilike(like))
        )
    if status_filter:
        conditions.append(Lead.status == status_filter)
    if category:
        conditions.append(Lead.category == category)
    # Границы суток — с tzinfo=UTC: created_at это timestamptz, наивное значение
    # PostgreSQL истолковал бы по часовому поясу сессии.
    if date_from:
        conditions.append(Lead.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
    if date_to:
        conditions.append(Lead.created_at <= datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc))

    for cond in conditions:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    leads = result.scalars().all()

    return LeadListOut(
        items=[LeadOut.model_validate(lead) for lead in leads],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=LeadStatsOut)
async def lead_stats(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> LeadStatsOut:
    result = await db.execute(select(Lead.status, func.count()).group_by(Lead.status))
    counts = {row[0]: row[1] for row in result.all()}

    values = {s: counts.get(s, 0) for s in LeadStatus}
    return LeadStatsOut(
        new=values[LeadStatus.NEW],
        qualified=values[LeadStatus.QUALIFIED],
        proposal=values[LeadStatus.PROPOSAL],
        in_progress=values[LeadStatus.IN_PROGRESS],
        won=values[LeadStatus.WON],
        done=values[LeadStatus.DONE],
        cancelled=values[LeadStatus.CANCELLED],
        declined=values[LeadStatus.DECLINED],
        total=sum(values.values()),
    )


@router.get("/daily", response_model=LeadDailyOut)
async def lead_daily(
    days: int = Query(30, ge=1, le=365),
    status_filter: LeadStatus | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> LeadDailyOut:
    since_date = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date()

    stmt = (
        select(func.date(Lead.created_at).label("day"), func.count())
        .where(func.date(Lead.created_at) >= since_date)
        .group_by("day")
        .order_by("day")
    )
    if status_filter:
        stmt = stmt.where(Lead.status == status_filter)

    result = await db.execute(stmt)
    counts_by_day = {}
    for row in result.all():
        day = row[0] if isinstance(row[0], date) else date.fromisoformat(str(row[0]))
        counts_by_day[day] = row[1]

    points = [
        LeadDailyPoint(date=since_date + timedelta(days=i), count=counts_by_day.get(since_date + timedelta(days=i), 0))
        for i in range(days)
    ]
    return LeadDailyOut(points=points)


@router.get("/sales-daily", response_model=SalesDailyOut)
async def sales_daily(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> SalesDailyOut:
    """Суммы закрытых сделок (WON) по дням за период (по умолчанию — сегодня)."""
    today = datetime.now(timezone.utc).date()
    start = date_from or today
    end = date_to or today

    deal_day = func.date(func.coalesce(Lead.won_at, Lead.created_at))
    stmt = (
        select(deal_day.label("day"), func.coalesce(func.sum(Lead.deal_amount), 0), func.count())
        .where(Lead.status == LeadStatus.WON)
        .where(Lead.deal_amount.is_not(None))
        .where(deal_day >= start)
        .where(deal_day <= end)
        .group_by("day")
        .order_by("day")
    )
    rows = (await db.execute(stmt)).all()

    points = []
    for row in rows:
        day = row[0] if isinstance(row[0], date) else date.fromisoformat(str(row[0]))
        points.append(SalesDailyPoint(date=day, total=float(row[1]), count=row[2]))

    return SalesDailyOut(points=points, total=sum(p.total for p in points))


@router.get("/export")
async def export_all_leads(
    q: str | None = None,
    status_filter: LeadStatus | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> StreamingResponse:
    stmt = select(Lead).options(selectinload(Lead.assignee))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Lead.name.ilike(like), Lead.phone.ilike(like), Lead.email.ilike(like)))
    if status_filter:
        stmt = stmt.where(Lead.status == status_filter)
    stmt = stmt.order_by(Lead.created_at.desc())

    result = await db.execute(stmt)
    leads = result.scalars().all()

    content = export_leads_to_excel(leads)
    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=leads.xlsx"},
    )


async def _get_lead_or_404(lead_id: uuid.UUID, db: AsyncSession) -> Lead:
    stmt = (
        select(Lead)
        .options(selectinload(Lead.assignee), selectinload(Lead.notes).selectinload(LeadNote.author))
        .where(Lead.id == lead_id)
    )
    result = await db.execute(stmt)
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.get("/{lead_id}", response_model=LeadDetailOut)
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> LeadDetailOut:
    lead = await _get_lead_or_404(lead_id, db)
    return LeadDetailOut.model_validate(lead)


@router.get("/{lead_id}/attachment")
async def download_attachment(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> FileResponse:
    lead = await _get_lead_or_404(lead_id, db)
    if not lead.attachment_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No attachment")

    path = os.path.join(settings.upload_dir, lead.attachment_path)
    if not os.path.isfile(path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File is missing on disk")

    return FileResponse(path, filename=lead.attachment_name or lead.attachment_path)


@router.patch("/{lead_id}", response_model=LeadDetailOut)
async def update_lead(
    lead_id: uuid.UUID,
    payload: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_any),
) -> LeadDetailOut:
    lead = await _get_lead_or_404(lead_id, db)

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(lead, field, value)

    # Момент закрытия сделки — для отчёта «сделки по дням».
    if "status" in changes:
        if lead.status == LeadStatus.WON and lead.won_at is None:
            lead.won_at = datetime.now(timezone.utc)
        elif lead.status != LeadStatus.WON:
            lead.won_at = None

    if changes:
        db.add(
            AuditLog(
                user_id=user.id,
                action="update",
                entity="lead",
                entity_id=str(lead.id),
                meta=jsonable_encoder(changes),
            )
        )

    await db.commit()

    # Перечитываем с eager-загрузкой (assignee + notes.author): refresh перезагрузил бы
    # notes без авторов и сериализация упала бы на ленивой загрузке в async-контексте.
    lead = await _get_lead_or_404(lead_id, db)
    return LeadDetailOut.model_validate(lead)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_any),
) -> None:
    lead = await _get_lead_or_404(lead_id, db)
    if lead.attachment_path:
        path = os.path.join(settings.upload_dir, lead.attachment_path)
        if os.path.isfile(path):
            os.remove(path)
    db.add(AuditLog(user_id=user.id, action="delete", entity="lead", entity_id=str(lead.id), meta=None))
    await db.delete(lead)
    await db.commit()


@router.post("/{lead_id}/notes", response_model=LeadNoteOut, status_code=status.HTTP_201_CREATED)
async def add_lead_note(
    lead_id: uuid.UUID,
    payload: LeadNoteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_any),
) -> LeadNoteOut:
    lead = await _get_lead_or_404(lead_id, db)

    note = LeadNote(lead_id=lead.id, author_id=user.id, body=payload.body)
    db.add(note)
    await db.commit()
    await db.refresh(note, attribute_names=["author"])

    return LeadNoteOut.model_validate(note)


@router.get("/{lead_id}/export")
async def export_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any),
) -> StreamingResponse:
    lead = await _get_lead_or_404(lead_id, db)
    content = export_lead_to_excel(lead)
    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=lead-{lead.id}.xlsx"},
    )
