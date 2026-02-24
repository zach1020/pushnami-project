import logging
import os
from uuid import UUID

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Event
from app.schemas import EventCreate, EventResponse, StatsResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("metrics-service")

app = FastAPI(title="Metrics Service", version="1.0.0")

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
    return {"status": "ok", "service": "metrics-service"}


@app.post("/api/events", response_model=EventResponse, status_code=201)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    event = Event(**payload.model_dump(by_alias=False))
    db.add(event)
    await db.commit()
    await db.refresh(event)
    logger.info("Event recorded: %s [%s] visitor=%s variant=%s", event.event_type, event.event_name, event.visitor_id, event.variant)
    return event


@app.post("/api/events/batch", status_code=201)
async def create_events_batch(payloads: list[EventCreate], db: AsyncSession = Depends(get_db)):
    events = [Event(**p.model_dump(by_alias=False)) for p in payloads]
    db.add_all(events)
    await db.commit()
    logger.info("Batch recorded: %d events", len(events))
    return {"created": len(events)}


@app.get("/api/events", response_model=list[EventResponse])
async def list_events(
    variant: str | None = Query(None),
    event_type: str | None = Query(None),
    experiment_id: UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(Event)
    if variant:
        query = query.where(Event.variant == variant)
    if event_type:
        query = query.where(Event.event_type == event_type)
    if experiment_id:
        query = query.where(Event.experiment_id == experiment_id)
    query = query.order_by(Event.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    return result.scalars().all()


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats(
    experiment_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    base_filter = Event.experiment_id == experiment_id if experiment_id else True

    # Total events
    result = await db.execute(select(func.count(Event.id)).where(base_filter))
    total_events = result.scalar() or 0

    # Unique visitors
    result = await db.execute(select(func.count(func.distinct(Event.visitor_id))).where(base_filter))
    unique_visitors = result.scalar() or 0

    # Events by type
    result = await db.execute(
        select(Event.event_type, func.count(Event.id))
        .where(base_filter)
        .group_by(Event.event_type)
    )
    events_by_type = {row[0]: row[1] for row in result.all()}

    # Events by variant
    result = await db.execute(
        select(Event.variant, func.count(Event.id))
        .where(base_filter)
        .where(Event.variant.isnot(None))
        .group_by(Event.variant)
    )
    events_by_variant = {row[0]: row[1] for row in result.all()}

    # Variant + event_type breakdown
    result = await db.execute(
        select(Event.variant, Event.event_type, func.count(Event.id))
        .where(base_filter)
        .where(Event.variant.isnot(None))
        .group_by(Event.variant, Event.event_type)
    )
    variant_breakdown = [
        {"variant": row[0], "event_type": row[1], "count": row[2]}
        for row in result.all()
    ]

    # Conversion rates by variant (page_view -> click or form_submit)
    conversion_by_variant = {}
    for variant_name in events_by_variant:
        v_filter = (Event.variant == variant_name) & base_filter
        views_result = await db.execute(
            select(func.count(func.distinct(Event.visitor_id)))
            .where(v_filter)
            .where(Event.event_type == "page_view")
        )
        views = views_result.scalar() or 0

        clicks_result = await db.execute(
            select(func.count(func.distinct(Event.visitor_id)))
            .where(v_filter)
            .where(Event.event_type == "click")
        )
        clicks = clicks_result.scalar() or 0

        submits_result = await db.execute(
            select(func.count(func.distinct(Event.visitor_id)))
            .where(v_filter)
            .where(Event.event_type == "form_submit")
        )
        submits = submits_result.scalar() or 0

        conversion_by_variant[variant_name] = {
            "views": views,
            "clicks": clicks,
            "submissions": submits,
            "click_rate": round(clicks / views * 100, 1) if views else 0,
            "submit_rate": round(submits / views * 100, 1) if views else 0,
        }

    # Timeline (events per hour for last 24h)
    timeline_query = text("""
        SELECT
            date_trunc('hour', created_at) as hour,
            variant,
            event_type,
            count(*) as count
        FROM events
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY hour, variant, event_type
        ORDER BY hour
    """)
    result = await db.execute(timeline_query)
    timeline = [
        {"hour": str(row[0]), "variant": row[1], "event_type": row[2], "count": row[3]}
        for row in result.all()
    ]

    return StatsResponse(
        total_events=total_events,
        unique_visitors=unique_visitors,
        events_by_type=events_by_type,
        events_by_variant=events_by_variant,
        variant_breakdown=variant_breakdown,
        conversion_by_variant=conversion_by_variant,
        timeline=timeline,
    )
