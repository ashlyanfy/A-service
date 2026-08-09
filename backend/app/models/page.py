import uuid

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import GUID, Base
from app.models.mixins import TimestampMixin


class Page(TimestampMixin, Base):
    """Страница лендинга. slug = путь страницы, например "/ru/uslugi/"."""

    __tablename__ = "pages"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # blocks: список {id, type, data, order, enabled} — редактируемые блоки страницы
    blocks: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    seo: Mapped["Seo | None"] = relationship(
        back_populates="page", uselist=False, cascade="all, delete-orphan"
    )


class Seo(TimestampMixin, Base):
    __tablename__ = "seo"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    page_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("pages.id", ondelete="CASCADE"), unique=True
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    keywords: Mapped[str | None] = mapped_column(String(500), nullable=True)
    og_image: Mapped[str | None] = mapped_column(String(500), nullable=True)

    page: Mapped["Page"] = relationship(back_populates="seo")
