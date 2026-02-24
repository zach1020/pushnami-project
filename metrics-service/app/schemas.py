from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    visitor_id: str = Field(..., min_length=1, max_length=255)
    experiment_id: UUID | None = None
    variant: str | None = None
    event_type: str = Field(..., min_length=1, max_length=100)
    event_name: str | None = Field(None, max_length=255)
    event_metadata: dict = Field(default_factory=dict, alias="metadata")
    page_url: str | None = None
    user_agent: str | None = None

    model_config = {"populate_by_name": True}


class EventResponse(BaseModel):
    id: UUID
    visitor_id: str
    experiment_id: UUID | None
    variant: str | None
    event_type: str
    event_name: str | None
    event_metadata: dict = Field(serialization_alias="metadata")
    page_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class StatsResponse(BaseModel):
    total_events: int
    unique_visitors: int
    events_by_type: dict[str, int]
    events_by_variant: dict[str, int]
    variant_breakdown: list[dict]
    conversion_by_variant: dict[str, dict]
    timeline: list[dict]
