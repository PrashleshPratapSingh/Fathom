"""Time-Travel Rewind endpoint.

POST /api/v1/runs/{run_id}/rewind — mutate a span and mark downstream as rewound.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import TraceRun
from app.schemas import RewindRequest, RewindResponse
from app.services.rewind_engine import rewind_span

router = APIRouter(prefix="/api/v1", tags=["Time-Travel Rewind"])


@router.post(
    "/runs/{run_id}/rewind",
    response_model=RewindResponse,
    summary="Rewind a span and re-execute downstream",
)
async def rewind(
    run_id: UUID,
    payload: RewindRequest,
    db: AsyncSession = Depends(get_db),
):
    """Mutate a span's input data and mark it + all downstream spans as rewound.

    This is the Time-Travel Rewind feature. The user edits a failing node's
    input in the UI, and this endpoint propagates the change downstream.
    """
    # Verify run exists
    run = await db.get(TraceRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )

    result = await rewind_span(db, run_id, payload.span_id, payload.mutated_input)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return RewindResponse(**result)
