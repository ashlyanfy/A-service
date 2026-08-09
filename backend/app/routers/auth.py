import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.database import get_db
from app.models.user import PasswordResetToken, User
from app.schemas.user import (
    ForgotPasswordRequest,
    LoginRequest,
    PasswordChangeRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenPair,
    UserOut,
)
from app.services.email import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

security_logger = logging.getLogger("aservice.security")


@router.post("/login", response_model=TokenPair)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    client_ip = request.client.host if request.client else "unknown"
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.password_hash):
        security_logger.warning("login_failed email=%s ip=%s", payload.email, client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    security_logger.info("login_success user_id=%s ip=%s", user.id, client_ip)

    access_token = create_access_token(user.id, user.role.value, user.token_version)
    refresh_token = create_refresh_token(user.id, user.role.value, user.token_version)

    return TokenPair(access_token=access_token, refresh_token=refresh_token, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    token_payload = decode_token(payload.refresh_token)
    if token_payload is None or token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    try:
        user_id = uuid.UUID(token_payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if token_payload.get("tv") != user.token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    access_token = create_access_token(user.id, user.role.value, user.token_version)
    refresh_token = create_refresh_token(user.id, user.role.value, user.token_version)

    return TokenPair(access_token=access_token, refresh_token=refresh_token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> None:
    """Отзывает все выданные пользователю access/refresh токены."""
    user.token_version += 1
    await db.commit()


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request, payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Ответ одинаковый вне зависимости от того, существует ли email — никакой утечки.
    if user is not None:
        raw_token, token_hash, expires_at = generate_reset_token()
        reset_token = PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        db.add(reset_token)
        await db.commit()

        reset_url = f"{settings.admin_url}/reset-password?token={raw_token}"
        await send_password_reset_email(user.email, reset_url)

    return {"detail": "Если email зарегистрирован, на него отправлено письмо с инструкциями"}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict:
    token_hash = hash_reset_token(payload.token)

    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    reset_token = result.scalar_one_or_none()

    if reset_token is None or reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user = await db.get(User, reset_token.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")

    user.password_hash = hash_password(payload.password)
    user.token_version += 1
    await db.delete(reset_token)
    await db.commit()

    return {"detail": "Пароль успешно изменён"}


@router.patch("/password")
async def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1
    await db.commit()

    return {"detail": "Пароль успешно изменён"}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
