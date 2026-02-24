import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visitor_id = Column(String(255), nullable=False)
    experiment_id = Column(UUID(as_uuid=True), nullable=True)
    variant = Column(String(255))
    event_type = Column(String(100), nullable=False)
    event_name = Column(String(255))
    event_metadata = Column("metadata", JSONB, default={})
    page_url = Column(Text)
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
