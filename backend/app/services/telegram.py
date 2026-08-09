import logging

import httpx

from app.config import settings

logger = logging.getLogger("aservice.telegram")


async def send_telegram_message(text: str) -> None:
    """Отправляет сообщение во все настроенные Telegram-чаты (уведомления о заявках)."""
    if not settings.telegram_bot_token or not settings.telegram_chat_ids_list:
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        for chat_id in settings.telegram_chat_ids_list:
            try:
                response = await client.post(
                    url,
                    json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
                )
                if response.status_code != 200:
                    logger.warning("Telegram send failed (%s): %s", chat_id, response.text[:200])
            except httpx.HTTPError:
                logger.exception("Telegram send error (%s)", chat_id)
