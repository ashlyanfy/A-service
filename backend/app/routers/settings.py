from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.database import get_db
from app.models.setting import Setting
from app.models.user import User
from app.schemas.setting import SettingOut, SettingsBulkUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

SECRET_KEYS = {"smtp_password", "telegram_bot_token", "vapid_private_key"}
MASK = "••••••••"


def _mask(key: str, value):
    if key in SECRET_KEYS and value:
        return MASK
    return value


@router.get("", response_model=list[SettingOut])
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
) -> list[SettingOut]:
    result = await db.execute(select(Setting))
    rows = result.scalars().all()
    return [SettingOut(key=row.key, value=_mask(row.key, row.value)) for row in rows]


@router.patch("", response_model=list[SettingOut])
async def update_settings(
    payload: SettingsBulkUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
) -> list[SettingOut]:
    for key, value in payload.settings.items():
        # Маскированное значение секрета, вернувшееся из UI, не перезаписывает оригинал.
        if key in SECRET_KEYS and value == MASK:
            continue

        setting = await db.get(Setting, key)
        if setting is None:
            db.add(Setting(key=key, value=value))
        else:
            setting.value = value

    await db.commit()

    result = await db.execute(select(Setting))
    rows = result.scalars().all()
    return [SettingOut(key=row.key, value=_mask(row.key, row.value)) for row in rows]
