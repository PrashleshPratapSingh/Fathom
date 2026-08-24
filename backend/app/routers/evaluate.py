"""Evaluation endpoints — trigger the 3-phase evaluation engine.

POST /api/v1/evaluate/{span_id}     — Evaluate a single span
POST /api/v1/evaluate/run/{run_id}  — Evaluate all spans in a run
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.evaluator import evaluate_span, evaluate_run

router = APIRouter(prefix="/api/v1/evaluate", tags=["Evaluation Engine"])


@router.post(
    "/{span_id}",
    summary="Evaluate a single span (all 3 phases)",
)
async def evaluate_single_span(
    span_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Run tool check, semantic drift, and judge summary on a span."""
    try:
        results = await evaluate_span(db, span_id)
        await db.commit()
        return {
            "span_id": str(span_id),
            "evaluations": results,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/run/{run_id}",
    summary="Evaluate all spans in a run",
)
async def evaluate_full_run(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Run all 3 evaluation phases on every span in the given run."""
    try:
        results = await evaluate_run(db, run_id)
        await db.commit()
        return results
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
