"""Graph and Runs query API endpoints.

Serves trace runs and DAG data to clients/frontend.

Owner: Rushikesh
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import TraceRun, TraceSpan
from app.routers.ingest import _eval_to_response, _run_to_response, _span_to_response
from app.schemas import DagResponse, RunResponse, SpanResponse

router = APIRouter(prefix="/api/v1", tags=["Graph & Runs"])


@router.get(
    "/runs",
    response_model=list[RunResponse],
    summary="List all trace runs with span count (paginated)",
)
async def list_runs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all trace runs ordered by creation date descending.
    
    Includes the computed span count for each run.
    """
    # Query runs with span counts via outer join
    span_count_subq = (
        select(TraceSpan.run_id, func.count(TraceSpan.id).label("span_count"))
        .group_by(TraceSpan.run_id)
        .subquery()
    )

    query = (
        select(TraceRun, func.coalesce(span_count_subq.c.span_count, 0))
        .outerjoin(span_count_subq, TraceRun.id == span_count_subq.c.run_id)
        .order_by(TraceRun.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    runs: list[RunResponse] = []
    for run, count in rows:
        runs.append(_run_to_response(run, span_count=count))

    return runs


@router.get(
    "/runs/{run_id}",
    response_model=RunResponse,
    summary="Get single trace run metadata",
)
async def get_run(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get metadata for a single run."""
    run = await db.get(TraceRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )

    count_res = await db.execute(
        select(func.count(TraceSpan.id)).where(TraceSpan.run_id == run_id)
    )
    span_count = count_res.scalar_one()

    return _run_to_response(run, span_count=span_count)


@router.get(
    "/runs/{run_id}/dag",
    response_model=DagResponse,
    summary="Get full DAG for a run with nested evaluations",
)
async def get_run_dag(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get the complete DAG for an execution run.

    Returns the run, all spans (with nested evaluations), and root span IDs.
    The frontend can reconstruct the tree using `parent_span_id`.
    """
    run = await db.get(TraceRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )

    # Fetch all spans for this run with evaluations eagerly loaded
    stmt = (
        select(TraceSpan)
        .where(TraceSpan.run_id == run_id)
        .options(selectinload(TraceSpan.evaluations))
        .order_by(TraceSpan.created_at.asc())
    )
    res = await db.execute(stmt)
    spans = res.scalars().all()

    span_responses = [_span_to_response(s) for s in spans]
    root_ids = [s.id for s in spans if s.parent_span_id is None]

    run_response = _run_to_response(run, span_count=len(spans))

    return DagResponse(
        run=run_response,
        spans=span_responses,
        root_span_ids=root_ids,
    )
