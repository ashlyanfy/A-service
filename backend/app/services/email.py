import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger("aservice.email")


async def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.smtp_host:
        logger.warning("SMTP is not configured; email to %s not sent", to)
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=settings.smtp_use_tls,
        )
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


async def send_password_reset_email(to: str, reset_url: str) -> bool:
    subject = "Админка A-SERVICE — восстановление пароля"
    body = (
        "Вы запросили восстановление пароля в админке A-SERVICE.\n\n"
        f"Ссылка для смены пароля (действует 1 час):\n{reset_url}\n\n"
        "Если вы не запрашивали смену пароля, просто проигнорируйте это письмо."
    )
    return await send_email(to, subject, body)
