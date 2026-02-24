from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class ExperimentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    variants: list[str] = Field(default=["control", "variant"], min_length=2)
    traffic_split: dict[str, int] = Field(default={"control": 50, "variant": 50})
    is_active: bool = True


class ExperimentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    variants: list[str] | None = Field(None, min_length=2)
    traffic_split: dict[str, int] | None = None
    is_active: bool | None = None


class ExperimentResponse(BaseModel):
    id: UUID
    name: str
    description: str
    variants: list[str]
    traffic_split: dict[str, int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignmentRequest(BaseModel):
    visitor_id: str = Field(..., min_length=1, max_length=255)
    experiment_id: UUID


class AssignmentResponse(BaseModel):
    visitor_id: str
    experiment_id: UUID
    variant: str
    is_new: bool


class FeatureToggleUpdate(BaseModel):
    enabled: bool | None = None
    config: dict | None = None


class FeatureToggleResponse(BaseModel):
    id: UUID
    name: str
    key: str
    description: str
    enabled: bool
    config: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
