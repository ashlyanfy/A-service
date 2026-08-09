import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import GUID, Base


class SiteEventType(str, enum.Enum):
    """Действия посетителей на лендинге a-service.asia."""

    PAGE_VIEW = "PAGE_VIEW"      # просмотр страницы (посещаемость)
    WHATSAPP = "WHATSAPP"        # клик по кнопке WhatsApp
    CALL = "CALL"                # клик «Позвонить»
    QUOTE_OPEN = "QUOTE_OPEN"    # открытие анкеты «Получить расчёт»
    LEAD_SUBMIT = "LEAD_SUBMIT"  # успешная отправка заявки


class SiteEvent(Base):
    __tablename__ = "site_events"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[SiteEventType] = mapped_column(
        Enum(SiteEventType, name="site_event_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        index=True,
    )
    page: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    visitor_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
