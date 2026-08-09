import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.event import SiteEventType


class SiteEventCreate(BaseModel):
    """Событие с публичного лендинга."""

    event_type: SiteEventType
    page: str | None = Field(default=None, max_length=200)
    visitor_id: str = Field(min_length=1, max_length=64)


class SiteEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_type: SiteEventType
    page: str | None
    visitor_id: str
    created_at: datetime


class SiteEventListOut(BaseModel):
    items: list[SiteEventOut]
    total: int
    page: int
    page_size: int


class SiteEventStatsOut(BaseModel):
    page_view: int
    whatsapp: int
    call: int
    quote_open: int
    lead_submit: int
    unique_visitors: int
    total_actions: int


class VisitsDailyPoint(BaseModel):
    date: date
    views: int
    visitors: int


class VisitsDailyOut(BaseModel):
    points: list[VisitsDailyPoint]


class PageBreakdownPoint(BaseModel):
    page: str
    views: int
    whatsapp: int
    call: int
    quote_open: int
    lead_submit: int
    total: int


class PageBreakdownOut(BaseModel):
    items: list[PageBreakdownPoint]


class SalesDailyPoint(BaseModel):
    date: date
    total: float
    count: int


class SalesDailyOut(BaseModel):
    points: list[SalesDailyPoint]
    total: float
