"""Copilot diagnosis router.

Provides AI root-cause diagnosis and automated rewind payload generation powered by Groq.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import TraceSpan
from app.services.copilot_service import diagnose_span

router = APIRouter(prefix="/api/v1/copilot", tags=["AI Copilot"])


class DiagnosisRequest(BaseModel):
    run_id: UUID
    span_id: UUID


class DiagnosisResponse(BaseModel):
    status: str
    model_used: str
    summary: str
    root_cause: str
    suggested_fix: str
    repaired_input: dict
    groq_error: str | None = None


@router.post("/diagnose", response_model=DiagnosisResponse)
async def diagnose(
    request: DiagnosisRequest,
    db: AsyncSession = Depends(get_db),
):
    """Diagnose a failed or warned span with Groq AI."""
    stmt = (
        select(TraceSpan)
        .where(TraceSpan.id == request.span_id, TraceSpan.run_id == request.run_id)
        .options(selectinload(TraceSpan.evaluations))
    )
    result = await db.execute(stmt)
    span = result.scalar_one_or_none()

    if not span:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Span '{request.span_id}' not found in run '{request.run_id}'.",
        )

    # Fetch parent span if available
    parent_span = None
    if span.parent_span_id:
        parent_stmt = select(TraceSpan).where(TraceSpan.id == span.parent_span_id)
        parent_res = await db.execute(parent_stmt)
        parent_span = parent_res.scalar_one_or_none()

    diagnosis = await diagnose_span(span, parent_span)
    return diagnosis
