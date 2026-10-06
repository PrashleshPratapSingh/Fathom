"""Groq-powered AI Copilot & Root-Cause Diagnosis Service.

Analyzes failed or warned trace spans, pinpoints the root cause, and provides
an intelligent repaired input payload for one-click re-execution via Rewind.
"""

import json
import logging
from typing import Any
import groq

from app.config import get_settings
from app.models import TraceSpan

logger = logging.getLogger("fathom.copilot")


def _generate_fallback_diagnosis(span: TraceSpan) -> dict[str, Any]:
    """Fallback diagnostic heuristics when Groq API key is not yet configured."""
    error = span.error_message or ""
    input_data = span.input_data or {}

    summary = "Trace step completed with potential performance or logic warnings."
    root_cause = "No fatal exceptions were thrown, but the step was flagged by evaluation rules."
    suggested_fix = "Review parameter boundaries and ensure prompt inputs align with expected schemas."
    repaired_input = dict(input_data)

    if "500" in error or "unavailable" in error.lower():
        summary = "Upstream API service failure or network timeout."
        root_cause = f"The external endpoint failed with error: {error.splitlines()[-1] if error else 'Internal Server Error'}"
        suggested_fix = "Enable exponential backoff retry or switch to a fallback endpoint."
        # If query has special characters or bad format, sanitize it
        if "query" in repaired_input and isinstance(repaired_input["query"], str):
            repaired_input["query"] = repaired_input["query"].strip()
    elif "bad_request" in error.lower() or "invalid" in error.lower() or "action=" in error:
        summary = "Invalid action payload or unhandled enum choice."
        root_cause = "The agent attempted to invoke an unknown tool or passed parameters outside the accepted tool schema."
        suggested_fix = "Constrain agent routing to allowed tool actions and validate target parameters."
        if "action" in repaired_input and repaired_input["action"] == "unknown_operation_xyz":
            repaired_input["action"] = "notify_user"
            repaired_input["target"] = "user_inbox"
    elif span.status == "failed":
        summary = f"Execution halted at '{span.name}'."
        root_cause = f"Error details: {error.splitlines()[-1] if error else 'Unhandled execution exception.'}"
        suggested_fix = "Inspect input types and verify API credentials for this step."

    return {
        "status": "success",
        "model_used": "heuristic-engine (Add GROQ_API_KEY in .env for Llama-3.3-70B)",
        "summary": summary,
        "root_cause": root_cause,
        "suggested_fix": suggested_fix,
        "repaired_input": repaired_input,
    }


async def diagnose_span(span: TraceSpan, parent_span: TraceSpan | None = None) -> dict[str, Any]:
    """Diagnose a span using Groq Llama 3.3 70B or heuristic fallback."""
    settings = get_settings()

    # Check for valid Groq API key
    api_key = settings.GROQ_API_KEY
    if not api_key or api_key == "your_groq_api_key_here" or not api_key.startswith("gsk_"):
        logger.info("GROQ_API_KEY not configured or is placeholder. Using heuristic diagnosis.")
        return _generate_fallback_diagnosis(span)

    client = groq.AsyncGroq(api_key=api_key)
    model = settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    # Assemble context for Groq
    evaluations_info = [
        {
            "phase": ev.phase,
            "verdict": ev.verdict,
            "score": ev.score,
            "summary": ev.summary,
            "details": ev.details,
        }
        for ev in span.evaluations
    ]

    context_payload = {
        "span_name": span.name,
        "span_kind": span.kind,
        "status": span.status,
        "model_name": span.model_name,
        "latency_ms": span.latency_ms,
        "error_message": span.error_message,
        "input_data": span.input_data,
        "output_data": span.output_data,
        "evaluations": evaluations_info,
        "parent_context": {
            "name": parent_span.name,
            "kind": parent_span.kind,
            "output_data": parent_span.output_data,
        }
        if parent_span
        else None,
    }

    system_prompt = (
        "You are Fathom AI Copilot, an expert AI systems diagnostic and debugging assistant. "
        "Analyze the provided failed or problematic AI agent trace step. "
        "Provide a clear root cause diagnosis, an actionable suggested fix, and a repaired input JSON "
        "that corrects the error so the user can re-execute this span with the Rewind engine.\n\n"
        "Return ONLY a valid JSON object with the following exact keys:\n"
        "{\n"
        '  "summary": "Short 1-sentence headline of what went wrong",\n'
        '  "root_cause": "Detailed technical explanation of the failure reason",\n'
        '  "suggested_fix": "Actionable instructions on how to fix the prompt, schema, or system",\n'
        '  "repaired_input": { ... corrected input JSON object ... }\n'
        "}"
    )

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Here is the trace span telemetry:\n{json.dumps(context_payload, indent=2)}",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1000,
        )

        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)

        return {
            "status": "success",
            "model_used": f"Groq ({model})",
            "summary": parsed.get("summary", "Analysis completed."),
            "root_cause": parsed.get("root_cause", "No specific root cause identified."),
            "suggested_fix": parsed.get("suggested_fix", "Review input parameters."),
            "repaired_input": parsed.get("repaired_input", span.input_data or {}),
        }

    except Exception as e:
        logger.warning("Groq diagnosis failed: %s. Falling back to heuristic diagnosis.", e)
        fallback = _generate_fallback_diagnosis(span)
        fallback["groq_error"] = str(e)
        return fallback
