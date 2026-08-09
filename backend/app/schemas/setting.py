from typing import Any

from pydantic import BaseModel


class SettingOut(BaseModel):
    key: str
    value: Any = None


class SettingsBulkUpdate(BaseModel):
    settings: dict[str, Any]
