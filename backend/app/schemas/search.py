import uuid

from pydantic import BaseModel


class LeadSearchResult(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    status: str


class PageSearchResult(BaseModel):
    slug: str
    title: str
    block_id: str
    block_type: str
    snippet: str


class SearchResults(BaseModel):
    leads: list[LeadSearchResult]
    pages: list[PageSearchResult]
