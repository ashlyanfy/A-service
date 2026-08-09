from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(max_length=1024)
    keys: PushKeys


class PushSubscriptionDelete(BaseModel):
    endpoint: str = Field(max_length=1024)


class TestNotificationRequest(BaseModel):
    title: str = Field(default="A-SERVICE · Админка", max_length=100)
    body: str = Field(default="Тестовое уведомление", max_length=500)


class VapidPublicKeyOut(BaseModel):
    public_key: str
