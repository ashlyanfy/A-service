import re
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.lead import LeadStatus
from app.schemas.user import UserOut

PHONE_RE = re.compile(r"^\+?[\d\s\-()]{6,25}$")

# Категории и подзадачи анкеты лендинга (см. frontend form.js) — валидируем по белому списку.
CATEGORY_SUBTASKS: dict[str, set[str]] = {
    "atm-installation": {"installation", "dismantling", "full-relocation", "site-preparation"},
    "transport-rigging": {"single-unit", "batch", "heavy", "storage"},
    "restoration-branding": {"painting", "restoration", "rebranding", "ral"},
    "canopies": {"new", "installation", "repair", "dismantling"},
    "corporate-logistics": {"office-move", "furniture", "internal", "removal"},
}


class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=6, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    category: str | None = Field(default=None, max_length=100)
    subtask: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=255)
    quantity: str | None = Field(default=None, max_length=50)
    preferred_date: date | None = None
    message: str | None = Field(default=None, max_length=5000)
    source_page: str | None = Field(default=None, max_length=255)
    locale: str | None = Field(default=None, pattern="^(ru|kk)$")
    source: str | None = Field(default=None, max_length=100)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_RE.match(v):
            raise ValueError("Invalid phone number")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is not None and v not in CATEGORY_SUBTASKS:
            raise ValueError("Unknown work category")
        return v


class LeadUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=6, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    category: str | None = Field(default=None, max_length=100)
    subtask: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=255)
    quantity: str | None = Field(default=None, max_length=50)
    preferred_date: date | None = None
    message: str | None = Field(default=None, max_length=5000)
    status: LeadStatus | None = None
    assignee_id: uuid.UUID | None = None
    deal_amount: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)


class LeadNoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class LeadNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    author_id: uuid.UUID | None
    author: UserOut | None = None
    body: str
    created_at: datetime


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    company: str | None
    phone: str
    email: str | None
    category: str | None
    subtask: str | None
    city: str | None
    quantity: str | None
    preferred_date: date | None
    message: str | None
    source_page: str | None
    locale: str | None
    attachment_name: str | None
    status: LeadStatus
    deal_amount: Decimal | None
    source: str | None
    ip: str | None
    user_agent: str | None
    assignee_id: uuid.UUID | None
    assignee: UserOut | None = None
    created_at: datetime
    updated_at: datetime


class LeadDetailOut(LeadOut):
    notes: list[LeadNoteOut] = []


class LeadListOut(BaseModel):
    items: list[LeadOut]
    total: int
    page: int
    page_size: int


class LeadStatsOut(BaseModel):
    new: int
    qualified: int
    proposal: int
    in_progress: int
    won: int
    done: int
    cancelled: int
    declined: int
    total: int


class LeadDailyPoint(BaseModel):
    date: date
    count: int


class LeadDailyOut(BaseModel):
    points: list[LeadDailyPoint]


class LeadPublicOut(BaseModel):
    """Ответ публичной формы: никаких внутренних данных наружу."""

    id: uuid.UUID
    detail: str = "accepted"
