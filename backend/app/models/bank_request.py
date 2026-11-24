"""Immutable receipts and independent mail jobs for the short public forms."""
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import GUID, Base

SERVICE_TITLES = {
    "general": "Общий вопрос", "install": "Монтаж и демонтаж банкоматов",
    "transport": "Перевозка банкоматов", "dispose": "Утилизация банкоматов",
    "canopy": "Изготовление козырьков", "clean": "Наружная мойка банкоматов и терминалов",
    "furniture": "Перевозка мебели банков", "paint": "Покраска и брендирование банкоматов",
    "rigging": "Такелаж банковского оборудования", "terminal": "Монтаж и демонтаж платёжных терминалов",
    "canopy-care": "Ремонт козырьков", "furniture-pack": "Упаковка мебели и имущества",
}


class BankRequest(Base):
    __tablename__ = "bank_requests"
    __table_args__ = (
        Index("bank_request_email_time", "email", "kind", "created_at"),
        Index("bank_request_network_time", "network_bucket", "kind", "created_at"),
    )
    request_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True)
    lead_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("leads.id", ondelete="CASCADE"), unique=True)
    kind: Mapped[str] = mapped_column(String(12))
    service: Mapped[str] = mapped_column(String(40), default="")
    contact: Mapped[str] = mapped_column(String(254), default="")
    comment: Mapped[str] = mapped_column(Text, default="")
    name: Mapped[str] = mapped_column(String(100), default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    locale: Mapped[str] = mapped_column(String(2))
    network_bucket: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[int] = mapped_column(Integer)
    jobs: Mapped[list["RequestMail"]] = relationship(cascade="all, delete-orphan")


class RequestMail(Base):
    __tablename__ = "bank_request_mail"
    __table_args__ = (
        CheckConstraint("kind in ('owner','customer')", name="bank_mail_kind"),
        CheckConstraint("status in ('pending','sending','sent','review')", name="bank_mail_status"),
        Index("bank_request_mail_due", "status", "next_attempt_at"),
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("bank_requests.request_id", ondelete="CASCADE"), primary_key=True
    )
    kind: Mapped[str] = mapped_column(String(10), primary_key=True)
    status: Mapped[str] = mapped_column(String(10), default="pending")
    next_attempt_at: Mapped[int] = mapped_column(Integer)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    lease_token: Mapped[str | None] = mapped_column(String(36))
    lease_until: Mapped[int | None] = mapped_column(Integer)
    last_error: Mapped[str | None] = mapped_column(String(80))
    sent_at: Mapped[int | None] = mapped_column(Integer)
