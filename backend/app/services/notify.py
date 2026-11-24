from html import escape

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bank_request import SERVICE_TITLES
from app.models.lead import Lead
from app.services.push import notify_all_subscriptions
from app.services.telegram import send_telegram_message

CATEGORY_LABELS = {
    **SERVICE_TITLES,
    "bank-profile": "Запрос профиля компании (PDF)",
    "atm-installation": "Монтаж и демонтаж банкоматов",
    "transport-rigging": "Перевозка и такелаж",
    "restoration-branding": "Покраска и брендирование",
    "canopies": "Козырьки и конструкции",
    "corporate-logistics": "Корпоративная логистика",
}


async def notify_new_lead(db: AsyncSession, lead: Lead) -> None:
    """Отправляет уведомление о новой заявке в Telegram и web-push (админка)."""
    category = CATEGORY_LABELS.get(lead.category or "", lead.category or "—")
    text = (
        "<b>Новая заявка — A-SERVICE</b>\n"
        f"Имя: {escape(lead.name or '—')}\n"
        f"Контакт: {escape(lead.phone or lead.email or '—')}\n"
        f"Компания: {escape(lead.company or '—')}\n"
        f"Категория: {escape(category)}\n"
        f"Город: {escape(lead.city or '—')}\n"
        f"Страница: {escape(lead.source_page or '—')}"
    )
    await send_telegram_message(text)
    await notify_all_subscriptions(
        db,
        title="Новая заявка",
        body=" · ".join(filter(None, (lead.name, lead.phone or lead.email, category))),
        url=f"/leads/{lead.id}",
    )
