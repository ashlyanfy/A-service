import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Block(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    type: str = Field(min_length=1, max_length=50)
    data: dict[str, Any] = {}
    order: int = 0
    enabled: bool = True


class PageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    blocks: list[Block]
    created_at: datetime
    updated_at: datetime


class PublicPageOut(BaseModel):
    slug: str
    title: str
    blocks: list[Block]


class PageListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    updated_at: datetime


class PageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    blocks: list[Block] | None = None


class SeoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str | None = None
    description: str | None = None
    keywords: str | None = None
    og_image: str | None = None


class SeoUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    keywords: str | None = Field(default=None, max_length=500)
    og_image: str | None = Field(default=None, max_length=500)
