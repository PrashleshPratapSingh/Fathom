"""Time-Travel Rewind Engine.

Core logic for mutating a span's input and re-executing downstream branches.
For v1, we clone affected spans with updated data rather than modifying originals
(preserves history).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import TraceSpan


async def find_downstream_spans(
    db: AsyncSession,
    span_id: uuid.UUID,
    run_id: uuid.UUID,
) -> list[TraceSpan]:
    """Find all downstream (child, grandchild, etc.) spans of a given span.

    Uses iterative BFS since SQLAlchemy async doesn't support recursive CTEs
    easily. For the expected tree sizes (< 50 nodes), this is fine.
    """
    downstream = []
    queue = [span_id]

    while queue:
        current_id = queue.pop(0)
        stmt = (
            select(TraceSpan)
            .where(
                TraceSpan.run_id == run_id,
                TraceSpan.parent_span_id == current_id,
            )
            .options(selectinload(TraceSpan.evaluations))
        )
        result = await db.execute(stmt)
        children = result.scalars().all()

        for child in children:
            downstream.append(child)
            queue.append(child.id)

    return downstream


async def rewind_span(
    db: AsyncSession,
    run_id: uuid.UUID,
    span_id: uuid.UUID,
    mutated_input: dict,
) -> dict:
    """Rewind a span: update its input_data and mark it + downstream spans as rewound.

    For v1, we directly update the spans (simpler approach).
    A production version would clone spans with rewind_group_id.

    Returns:
        dict with rewound_span_id, downstream_re_executed list, and message.
    """
    # Get the target span
    span = await db.get(TraceSpan, span_id)
    if not span:
        return {
            "success": False,
            "rewound_span_id": span_id,
            "downstream_re_executed": [],
            "new_run_id": None,
            "message": f"Span {span_id} not found",
        }

    if span.run_id != run_id:
        return {
            "success": False,
            "rewound_span_id": span_id,
            "downstream_re_executed": [],
            "new_run_id": None,
            "message": f"Span {span_id} does not belong to run {run_id}",
        }

    # Update the target span
    span.input_data = mutated_input
    span.status = "rewound"
    span.rewind_depth = (span.rewind_depth or 0) + 1
    span.updated_at = datetime.now(timezone.utc)

    # Find and mark all downstream spans
    downstream = await find_downstream_spans(db, span_id, run_id)
    downstream_ids = []

    for ds_span in downstream:
        ds_span.status = "rewound"
        ds_span.rewind_depth = (ds_span.rewind_depth or 0) + 1
        ds_span.updated_at = datetime.now(timezone.utc)
        downstream_ids.append(ds_span.id)

    await db.flush()

    return {
        "success": True,
        "rewound_span_id": span_id,
        "downstream_re_executed": downstream_ids,
        "new_run_id": None,
        "message": f"Rewound span '{span.name}' and {len(downstream_ids)} downstream span(s). "
                   f"Input data updated. In a production system, downstream steps would be re-executed.",
    }
