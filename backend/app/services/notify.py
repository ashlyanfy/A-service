from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.services.push import notify_all_subscriptions
from app.services.telegram import send_telegram_message

CATEGORY_LABELS = {
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
        f"Имя: {lead.name}\n"
        f"Телефон: {lead.phone}\n"
        f"Компания: {lead.company or '—'}\n"
        f"Категория: {category}\n"
        f"Город: {lead.city or '—'}\n"
        f"Страница: {lead.source_page or '—'}"
    )
    await send_telegram_message(text)
    await notify_all_subscriptions(
        db,
        title="Новая заявка",
        body=f"{lead.name} · {lead.phone} · {category}",
        url=f"/leads/{lead.id}",
    )
