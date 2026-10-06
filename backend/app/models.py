"""SQLAlchemy ORM models for trace_runs, trace_spans, and evaluations.

Schema contracts are defined in ARCHITECTURE.md Section 5.
All team members depend on these models — do NOT modify without team approval.

Supports both PostgreSQL (with pgvector) and SQLite (local dev) backends.
"""

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    JSON,
    Uuid,
    event,
)
from sqlalchemy.orm import relationship

from app.config import get_settings
from app.database import Base

_settings = get_settings()

# ──────────────────────────────────────────
# Portable type helpers
# ──────────────────────────────────────────
# On PostgreSQL we use native JSONB and UUID columns.
# On SQLite we fall back to JSON (stored as TEXT) and String(36).

if _settings.is_sqlite:
    _JSONType = JSON
    _UUIDType = Uuid(as_uuid=True)
    _VectorType = JSON  # store embeddings as JSON-encoded list of floats
else:
    from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
    try:
        from pgvector.sqlalchemy import Vector
        _VectorType = Vector(384)
    except ImportError:
        _VectorType = JSON
    _JSONType = JSONB
    _UUIDType = PG_UUID(as_uuid=True)


def _utcnow() -> datetime:
    """Return current UTC time with timezone info."""
    return datetime.now(timezone.utc)


def _new_uuid() -> uuid.UUID:
    """Generate a new UUID4."""
    return uuid.uuid4()


class TraceRun(Base):
    """A single execution run of an AI agent pipeline.

    One run contains many spans (steps). This is the top-level grouping.
    """

    __tablename__ = "trace_runs"

    id = Column(_UUIDType, primary_key=True, default=_new_uuid)
    name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="running")
    total_tokens = Column(Integer, default=0)
    total_latency_ms = Column(Float, default=0.0)
    metadata_ = Column("metadata", _JSONType, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    # Relationships
    spans = relationship("TraceSpan", back_populates="run", cascade="all, delete-orphan")


class TraceSpan(Base):
    """A single step/operation within a trace run.

    Spans form a tree via parent_span_id (self-referential FK).
    Root spans have parent_span_id = NULL.

    The embedding column (384-dim vector) is written by the evaluation engine,
    NOT by the ingestion API. It is nullable on insert.
    """

    __tablename__ = "trace_spans"

    id = Column(_UUIDType, primary_key=True, default=_new_uuid)
    run_id = Column(
        _UUIDType,
        ForeignKey("trace_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_span_id = Column(
        _UUIDType,
        ForeignKey("trace_spans.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(String(255), nullable=False)
    kind = Column(String(30), nullable=False)
    status = Column(String(20), nullable=False, default="running")
    input_data = Column(_JSONType, default=dict)
    output_data = Column(_JSONType, default=dict)
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Float, nullable=False)
    token_count = Column(Integer, default=0)
    model_name = Column(String(100), nullable=True)
    embedding = Column(_VectorType, nullable=True)
    metadata_ = Column("metadata", _JSONType, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    # For time-travel rewind (Rushikesh will use these)
    rewind_group_id = Column(_UUIDType, nullable=True)
    rewind_depth = Column(Integer, default=0)

    # Relationships
    run = relationship("TraceRun", back_populates="spans")
    parent = relationship("TraceSpan", remote_side=[id], back_populates="children")
    children = relationship("TraceSpan", back_populates="parent")
    evaluations = relationship("Evaluation", back_populates="span", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_spans_run_id", "run_id"),
        Index("idx_spans_parent", "run_id", "parent_span_id"),
    )


class Evaluation(Base):
    """Result of one evaluation phase for a span.

    Each span gets at most 3 evaluations (one per phase).
    The unique constraint on (span_id, phase) enforces this.
    """

    __tablename__ = "evaluations"

    id = Column(_UUIDType, primary_key=True, default=_new_uuid)
    span_id = Column(
        _UUIDType,
        ForeignKey("trace_spans.id", ondelete="CASCADE"),
        nullable=False,
    )
    phase = Column(String(30), nullable=False)
    verdict = Column(String(20), nullable=False)
    score = Column(Float, nullable=True)
    details = Column(_JSONType, default=dict)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    # Relationships
    span = relationship("TraceSpan", back_populates="evaluations")

    __table_args__ = (
        Index("idx_eval_span_id", "span_id"),
        UniqueConstraint("span_id", "phase", name="uq_eval_span_phase"),
    )
