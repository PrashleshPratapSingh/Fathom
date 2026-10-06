"""Time-travel rewind API endpoints.

Allows fixing input on a faulty/failed node and cascading updates downstream.

Owner: Rushikesh
"""

from collections import deque
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import SpanStatus
from app.models import TraceRun, TraceSpan
from app.schemas import RewindRequest, RewindResponse
from app.services.evaluator import evaluate_span

router = APIRouter(prefix="/api/v1", tags=["Rewind Engine"])


@router.post(
    "/runs/{run_id}/rewind",
    response_model=RewindResponse,
    status_code=status.HTTP_200_OK,
    summary="Rewind a span with mutated input and re-evaluate",
)
async def rewind_run(
    run_id: UUID,
    payload: RewindRequest,
    db: AsyncSession = Depends(get_db),
):
    """Rewind an execution tree from a target span.

    1. Validates that the span belongs to run_id.
    2. Updates target span input_data with mutated_input and marks status = "rewound".
    3. Finds all downstream descendant spans in the DAG.
    4. If re_execute is true:
       - Marks descendant spans as "rewound".
       - Triggers re-evaluation on the mutated target span.
    5. Returns RewindResponse detailing the affected spans.
    """
    run = await db.get(TraceRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )

    target_span = await db.get(TraceSpan, payload.span_id)
    if not target_span or target_span.run_id != run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Span {payload.span_id} not found in run {run_id}",
        )

    # Fetch all spans for this run to build child mapping
    result = await db.execute(
        select(TraceSpan).where(TraceSpan.run_id == run_id)
    )
    all_spans = result.scalars().all()
    span_map = {s.id: s for s in all_spans}

    # Build adjacency list: parent_id -> list of child_ids
    children_map: dict[UUID, list[UUID]] = {}
    for s in all_spans:
        if s.parent_span_id:
            children_map.setdefault(s.parent_span_id, []).append(s.id)

    # Find all downstream descendants using BFS
    downstream_ids: list[UUID] = []
    queue = deque(children_map.get(payload.span_id, []))
    while queue:
        curr_id = queue.popleft()
        downstream_ids.append(curr_id)
        queue.extend(children_map.get(curr_id, []))

    # Update target span
    target_span.input_data = payload.mutated_input
    target_span.status = SpanStatus.REWOUND.value

    # Downstream spans status update if re_execute is requested
    re_executed_ids: list[UUID] = []
    if payload.re_execute:
        for d_id in downstream_ids:
            d_span = span_map.get(d_id)
            if d_span:
                d_span.status = SpanStatus.REWOUND.value
                re_executed_ids.append(d_id)

    # Re-evaluate the mutated span
    try:
        await evaluate_span(target_span, db)
    except Exception:
        # Don't fail the rewind if mock LLM / evaluation hits an issue
        pass

    await db.commit()

    return RewindResponse(
        success=True,
        rewound_span_id=payload.span_id,
        downstream_re_executed=re_executed_ids,
        new_run_id=None,
        message=f"Span {payload.span_id} mutated and rewound. {len(re_executed_ids)} downstream span(s) updated.",
    )
