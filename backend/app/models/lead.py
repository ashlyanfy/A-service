import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import GUID, Base
from app.models.mixins import TimestampMixin
from app.models.user import User  # noqa: F401


class LeadStatus(str, enum.Enum):
    NEW = "NEW"                # новая заявка с сайта
    QUALIFIED = "QUALIFIED"    # уточнили состав, готовим КП
    PROPOSAL = "PROPOSAL"      # коммерческое предложение отправлено
    IN_PROGRESS = "IN_PROGRESS"  # работы идут
    WON = "WON"                # договор подписан / сделка закрыта
    DONE = "DONE"              # работы завершены и переданы
    CANCELLED = "CANCELLED"    # клиент отменил
    DECLINED = "DECLINED"      # мы отказались / нецелевая


class Lead(TimestampMixin, Base):
    """Заявка с формы «Получить расчёт» лендинга a-service.asia."""

    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # категория работ + подзадача из анкеты (atm-installation / dismantling / ...)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    subtask: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quantity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    preferred_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # страница, с которой открыли форму (sourceService)
    source_page: Mapped[str | None] = mapped_column(String(255), nullable=True)
    locale: Mapped[str | None] = mapped_column(String(5), nullable=True)
    attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=LeadStatus.NEW,
        index=True,
    )
    deal_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    # Момент первого перевода в WON — для отчёта «сделки по дням».
    won_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    assignee: Mapped["User | None"] = relationship()
    notes: Mapped[list["LeadNote"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan", order_by="LeadNote.created_at"
    )


class LeadNote(Base):
    __tablename__ = "lead_notes"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("leads.id", ondelete="CASCADE"))
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lead: Mapped["Lead"] = relationship(back_populates="notes")
    author: Mapped["User | None"] = relationship()
