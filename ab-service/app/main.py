import hashlib
import logging
import os
from datetime import datetime, timezone
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Experiment, Assignment, FeatureToggle
from app.schemas import (
    ExperimentCreate, ExperimentUpdate, ExperimentResponse,
    AssignmentResponse,
    FeatureToggleUpdate, FeatureToggleResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ab-service")

app = FastAPI(title="A/B Test Assignment Service", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ab-service"}


# --- Experiments ---

@app.get("/api/experiments", response_model=list[ExperimentResponse])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Experiment).order_by(Experiment.created_at.desc()))
    return result.scalars().all()


@app.post("/api/experiments", response_model=ExperimentResponse, status_code=201)
async def create_experiment(payload: ExperimentCreate, db: AsyncSession = Depends(get_db)):
    split_total = sum(payload.traffic_split.values())
    if split_total != 100:
        raise HTTPException(status_code=400, detail=f"Traffic split must total 100, got {split_total}")

    split_keys = set(payload.traffic_split.keys())
    variant_set = set(payload.variants)
    if split_keys != variant_set:
        raise HTTPException(status_code=400, detail="Traffic split keys must match variant names")

    experiment = Experiment(**payload.model_dump())
    db.add(experiment)
    await db.commit()
    await db.refresh(experiment)
    logger.info("Created experiment: %s (%s)", experiment.name, experiment.id)
    return experiment


@app.get("/api/experiments/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(experiment_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


@app.put("/api/experiments/{experiment_id}", response_model=ExperimentResponse)
async def update_experiment(experiment_id: UUID, payload: ExperimentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "traffic_split" in update_data and "variants" in update_data:
        if set(update_data["traffic_split"].keys()) != set(update_data["variants"]):
            raise HTTPException(status_code=400, detail="Traffic split keys must match variant names")
    if "traffic_split" in update_data:
        if sum(update_data["traffic_split"].values()) != 100:
            raise HTTPException(status_code=400, detail="Traffic split must total 100")

    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.execute(update(Experiment).where(Experiment.id == experiment_id).values(**update_data))
    await db.commit()

    result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    logger.info("Updated experiment: %s", experiment_id)
    return result.scalar_one()


@app.delete("/api/experiments/{experiment_id}", status_code=204)
async def delete_experiment(experiment_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Experiment not found")
    await db.execute(Assignment.__table__.delete().where(Assignment.experiment_id == experiment_id))
    await db.execute(Experiment.__table__.delete().where(Experiment.id == experiment_id))
    await db.commit()
    logger.info("Deleted experiment: %s", experiment_id)


# --- Assignment ---

def _assign_variant(visitor_id: str, experiment_id: str, variants: list[str], traffic_split: dict[str, int]) -> str:
    """Deterministically assign a variant based on visitor_id + experiment_id hash."""
    hash_input = f"{visitor_id}:{experiment_id}"
    hash_value = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16) % 100

    cumulative = 0
    for variant in variants:
        cumulative += traffic_split.get(variant, 0)
        if hash_value < cumulative:
            return variant
    return variants[-1]


@app.get("/api/assign", response_model=AssignmentResponse)
async def assign_variant(
    visitor_id: str = Query(..., min_length=1, max_length=255),
    experiment_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Check experiment exists and is active
    result = await db.execute(select(Experiment).where(Experiment.id == experiment_id))
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    if not experiment.is_active:
        raise HTTPException(status_code=400, detail="Experiment is not active")

    # Check for existing assignment
    result = await db.execute(
        select(Assignment).where(
            Assignment.experiment_id == experiment_id,
            Assignment.visitor_id == visitor_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return AssignmentResponse(
            visitor_id=visitor_id,
            experiment_id=experiment_id,
            variant=existing.variant,
            is_new=False,
        )

    # Create new assignment
    variant = _assign_variant(str(visitor_id), str(experiment_id), experiment.variants, experiment.traffic_split)
    assignment = Assignment(experiment_id=experiment_id, visitor_id=visitor_id, variant=variant)
    db.add(assignment)
    await db.commit()

    logger.info("Assigned visitor %s to variant %s for experiment %s", visitor_id, variant, experiment_id)
    return AssignmentResponse(
        visitor_id=visitor_id,
        experiment_id=experiment_id,
        variant=variant,
        is_new=True,
    )


# --- Feature Toggles ---

@app.get("/api/toggles", response_model=list[FeatureToggleResponse])
async def list_toggles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeatureToggle).order_by(FeatureToggle.created_at))
    return result.scalars().all()


@app.put("/api/toggles/{key}", response_model=FeatureToggleResponse)
async def update_toggle(key: str, payload: FeatureToggleUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeatureToggle).where(FeatureToggle.key == key))
    toggle = result.scalar_one_or_none()
    if not toggle:
        raise HTTPException(status_code=404, detail="Feature toggle not found")

    update_data = payload.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.execute(update(FeatureToggle).where(FeatureToggle.key == key).values(**update_data))
    await db.commit()

    result = await db.execute(select(FeatureToggle).where(FeatureToggle.key == key))
    logger.info("Updated toggle '%s': %s", key, update_data)
    return result.scalar_one()
