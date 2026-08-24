"""Graph query endpoints — serves trace data as DAGs to the frontend.

Endpoints:
    GET /api/v1/runs          — List all runs with span counts
    GET /api/v1/runs/{id}/dag — Full DAG for a run with nested evaluations
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Evaluation, TraceRun, TraceSpan
from app.schemas import DagResponse, RunResponse, SpanResponse, EvaluationResponse

router = APIRouter(prefix="/api/v1", tags=["Graph Query"])


# ──────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────


def _eval_to_response(e: Evaluation) -> EvaluationResponse:
    return EvaluationResponse(
        id=e.id,
        span_id=e.span_id,
        phase=e.phase,
        verdict=e.verdict,
        score=e.score,
        details=e.details or {},
        summary=e.summary,
        created_at=e.created_at,
    )


def _span_to_response(span: TraceSpan) -> SpanResponse:
    return SpanResponse(
        id=span.id,
        run_id=span.run_id,
        parent_span_id=span.parent_span_id,
        name=span.name,
        kind=span.kind,
        status=span.status,
        input_data=span.input_data or {},
        output_data=span.output_data or {},
        error_message=span.error_message,
        latency_ms=span.latency_ms,
        token_count=span.token_count,
        model_name=span.model_name,
        metadata=span.metadata_ or {},
        created_at=span.created_at,
        updated_at=span.updated_at,
        evaluations=[_eval_to_response(e) for e in span.evaluations] if span.evaluations else [],
    )


# ──────────────────────────────────────────
# GET /api/v1/runs — List all runs
# ──────────────────────────────────────────


@router.get(
    "/runs",
    response_model=list[RunResponse],
    summary="List all trace runs",
)
async def list_runs(
    skip: int = Query(0, ge=0, description="Number of runs to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max runs to return"),
    db: AsyncSession = Depends(get_db),
):
    """List all trace runs, ordered by most recent first.

    Includes the span count for each run.
    """
    # Subquery for span counts
    span_count_sq = (
        select(
            TraceSpan.run_id,
            func.count(TraceSpan.id).label("span_count"),
        )
        .group_by(TraceSpan.run_id)
        .subquery()
    )

    # Main query
    stmt = (
        select(TraceRun, func.coalesce(span_count_sq.c.span_count, 0).label("span_count"))
        .outerjoin(span_count_sq, TraceRun.id == span_count_sq.c.run_id)
        .order_by(TraceRun.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        RunResponse(
            id=run.id,
            name=run.name,
            status=run.status,
            total_tokens=run.total_tokens,
            total_latency_ms=run.total_latency_ms,
            metadata=run.metadata_ or {},
            created_at=run.created_at,
            updated_at=run.updated_at,
            span_count=span_count,
        )
        for run, span_count in rows
    ]


# ──────────────────────────────────────────
# GET /api/v1/runs/{run_id}/dag — Full DAG
# ──────────────────────────────────────────


@router.get(
    "/runs/{run_id}/dag",
    response_model=DagResponse,
    summary="Get the full DAG for a trace run",
)
async def get_dag(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Return the full causal DAG for a given run.

    Returns all spans (flat list with parent_span_id references)
    and their nested evaluations. The frontend reconstructs the
    tree structure using parent_span_id.
    """
    # Get the run
    run = await db.get(TraceRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )

    # Get all spans for this run, with evaluations eagerly loaded
    stmt = (
        select(TraceSpan)
        .where(TraceSpan.run_id == run_id)
        .options(selectinload(TraceSpan.evaluations))
        .order_by(TraceSpan.created_at.asc())
    )
    result = await db.execute(stmt)
    spans = result.scalars().all()

    # Build response
    span_responses = [_span_to_response(s) for s in spans]
    root_span_ids = [s.id for s in spans if s.parent_span_id is None]

    # Count spans for RunResponse
    run_response = RunResponse(
        id=run.id,
        name=run.name,
        status=run.status,
        total_tokens=run.total_tokens,
        total_latency_ms=run.total_latency_ms,
        metadata=run.metadata_ or {},
        created_at=run.created_at,
        updated_at=run.updated_at,
        span_count=len(spans),
    )

    return DagResponse(
        run=run_response,
        spans=span_responses,
        root_span_ids=root_span_ids,
    )
