"""3-Phase Hybrid Evaluation Engine.

Evaluates trace spans for correctness using 3 independent phases:
  Phase 1 — Tool Check:     Schema/structure validation
  Phase 2 — Semantic Drift: Detects hallucination via text similarity (TF-IDF cosine)
  Phase 3 — Judge Summary:  Generates plain-English failure explanation (rule-based)

All phases are rule-based — no external LLM API calls required.
This keeps the evaluator free, fast, and fully offline.
"""

import math
import re
from collections import Counter
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Evaluation, TraceSpan


# ──────────────────────────────────────────
# Phase 1: Tool Check
# ──────────────────────────────────────────

def _evaluate_tool_check(span: TraceSpan) -> dict:
    """Validate span structure and metadata.

    Checks:
    - Does input_data exist and is non-empty?
    - Does output_data exist (for completed spans)?
    - Is there an error_message for failed spans?
    - Are HTTP status codes successful (if present in metadata)?

    Returns: { verdict, score, details }
    """
    issues = []
    score = 1.0

    # Check input data exists
    if not span.input_data or len(span.input_data) == 0:
        issues.append("Input data is empty — the step received no input")
        score -= 0.3

    # Check output for completed spans
    if span.status == "completed":
        if not span.output_data or len(span.output_data) == 0:
            issues.append("Output data is empty despite step being marked as completed")
            score -= 0.3

    # Check error message for failed spans
    if span.status == "failed":
        if not span.error_message:
            issues.append("Step failed but no error message was recorded")
            score -= 0.2
        else:
            score -= 0.5  # Failed with error = significant issue

    # Check HTTP status codes in metadata
    metadata = span.metadata_ or {}
    status_code = metadata.get("status_code")
    if status_code is not None:
        if isinstance(status_code, int):
            if status_code >= 400:
                issues.append(f"HTTP status code {status_code} indicates an error")
                score -= 0.4
            elif status_code >= 300:
                issues.append(f"HTTP status code {status_code} indicates a redirect")
                score -= 0.1

    # Check schema validity flag if present
    schema_valid = metadata.get("schema_valid", True)
    if not schema_valid:
        issues.append("Response schema validation failed")
        score -= 0.3

    score = max(0.0, min(1.0, score))

    if score >= 0.8:
        verdict = "pass"
    elif score >= 0.5:
        verdict = "warning"
    else:
        verdict = "failure"

    return {
        "verdict": verdict,
        "score": round(score, 2),
        "details": {
            "schema_valid": len(issues) == 0 or schema_valid,
            "http_status": status_code,
            "issues": issues if issues else None,
        },
    }


# ──────────────────────────────────────────
# Phase 2: Semantic Drift Detection
# ──────────────────────────────────────────

def _text_from_data(data: dict | None) -> str:
    """Extract all string values from a nested dict for text comparison."""
    if not data:
        return ""

    texts = []

    def _extract(obj, depth=0):
        if depth > 5:
            return
        if isinstance(obj, str):
            texts.append(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                _extract(v, depth + 1)
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                _extract(item, depth + 1)

    _extract(data)
    return " ".join(texts)


def _tokenize(text: str) -> list[str]:
    """Simple whitespace + punctuation tokenizer."""
    return re.findall(r'\b\w+\b', text.lower())


def _cosine_similarity(text_a: str, text_b: str) -> float:
    """Compute cosine similarity using TF-IDF-like term frequency vectors.

    This is a lightweight alternative to embedding models.
    Good enough to detect when output contains information
    not present in the input (hallucination indicator).
    """
    if not text_a.strip() or not text_b.strip():
        return 0.0

    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)

    if not tokens_a or not tokens_b:
        return 0.0

    # Build term frequency vectors
    counter_a = Counter(tokens_a)
    counter_b = Counter(tokens_b)

    # Get all unique terms
    all_terms = set(counter_a.keys()) | set(counter_b.keys())

    # Compute dot product and magnitudes
    dot_product = sum(counter_a.get(t, 0) * counter_b.get(t, 0) for t in all_terms)
    mag_a = math.sqrt(sum(v ** 2 for v in counter_a.values()))
    mag_b = math.sqrt(sum(v ** 2 for v in counter_b.values()))

    if mag_a == 0 or mag_b == 0:
        return 0.0

    return dot_product / (mag_a * mag_b)


def _evaluate_semantic_drift(span: TraceSpan) -> dict:
    """Detect semantic drift between input and output.

    If the output contains significant information not traceable
    to the input, it may indicate hallucination.

    Returns: { verdict, score, details }
    """
    # Skip for failed spans with no output
    if span.status == "failed" and (not span.output_data or len(span.output_data) == 0):
        return {
            "verdict": "failure",
            "score": 0.0,
            "details": {"note": "Span failed before producing output"},
        }

    input_text = _text_from_data(span.input_data)
    output_text = _text_from_data(span.output_data)

    if not input_text or not output_text:
        return {
            "verdict": "pass",
            "score": 0.85,
            "details": {
                "cosine_similarity": None,
                "note": "Insufficient text data for drift analysis",
            },
        }

    similarity = round(_cosine_similarity(input_text, output_text), 2)

    # Thresholds
    drift_threshold = 0.70
    warning_threshold = 0.55

    drift_detected = similarity < warning_threshold

    if similarity >= drift_threshold:
        verdict = "pass"
    elif similarity >= warning_threshold:
        verdict = "warning"
    else:
        verdict = "failure"

    # Find potential novel terms in output not in input
    input_tokens = set(_tokenize(input_text))
    output_tokens = set(_tokenize(output_text))
    novel_terms = output_tokens - input_tokens
    # Filter out common English words
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
                  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
                  "should", "may", "might", "must", "can", "could", "to", "of", "in",
                  "for", "on", "with", "at", "by", "from", "as", "into", "through",
                  "and", "but", "or", "nor", "not", "no", "so", "if", "than", "that",
                  "this", "it", "its", "they", "them", "their", "we", "our", "you", "your",
                  "he", "she", "his", "her", "my", "me", "i", "s", "t", "re", "ve", "ll", "d"}
    novel_terms = {t for t in novel_terms if t not in stop_words and len(t) > 2}

    details = {
        "cosine_similarity": similarity,
        "drift_threshold": drift_threshold,
        "drift_detected": drift_detected,
    }

    if novel_terms and (verdict == "warning" or verdict == "failure"):
        details["novel_terms_in_output"] = sorted(list(novel_terms))[:20]
        details["note"] = f"Output contains {len(novel_terms)} terms not found in input"

    return {
        "verdict": verdict,
        "score": similarity,
        "details": details,
    }


# ──────────────────────────────────────────
# Phase 3: Judge Summary (Rule-Based)
# ──────────────────────────────────────────

def _evaluate_judge_summary(
    span: TraceSpan,
    tool_check_result: dict,
    drift_result: dict,
) -> dict:
    """Generate a plain-English failure explanation.

    Combines results from Phase 1 and Phase 2 to create a human-readable
    summary. Uses templates and rules — no LLM API call needed.

    Returns: { verdict, score, details, summary }
    """
    issues = []
    explanations = []

    # Analyze tool check
    tc_verdict = tool_check_result["verdict"]
    tc_issues = tool_check_result["details"].get("issues") or []

    if tc_verdict == "failure":
        issues.append("tool_check_failure")
        for issue in tc_issues:
            explanations.append(f"• {issue}")

    elif tc_verdict == "warning":
        issues.append("tool_check_warning")
        for issue in tc_issues:
            explanations.append(f"• {issue}")

    # Analyze semantic drift
    drift_verdict = drift_result["verdict"]
    similarity = drift_result["details"].get("cosine_similarity")

    if drift_verdict == "failure":
        issues.append("semantic_drift_failure")
        novel = drift_result["details"].get("novel_terms_in_output", [])
        if novel:
            terms_str = ", ".join(f"'{t}'" for t in novel[:5])
            explanations.append(
                f"• The output contains significant information not present in the input. "
                f"Novel terms detected: {terms_str}. "
                f"This suggests the AI may have fabricated or hallucinated data."
            )
        else:
            explanations.append(
                "• The output significantly diverges from the input, "
                "which may indicate hallucination or incorrect processing."
            )

    elif drift_verdict == "warning":
        issues.append("semantic_drift_warning")
        explanations.append(
            "• The output contains some information not directly traceable to the input. "
            "This may be acceptable enrichment or mild hallucination — review recommended."
        )

    # Analyze span status
    if span.status == "failed" and span.error_message:
        issues.append("span_error")
        # Extract the last line of the traceback (usually the most useful)
        error_lines = span.error_message.strip().split("\n")
        last_line = error_lines[-1] if error_lines else span.error_message
        explanations.append(f"• The step crashed with error: {last_line}")

    # Determine overall verdict
    if "semantic_drift_failure" in issues or "tool_check_failure" in issues or "span_error" in issues:
        verdict = "failure"
    elif any("warning" in i for i in issues):
        verdict = "warning"
    else:
        verdict = "pass"

    # Compute composite score
    tc_score = tool_check_result.get("score", 1.0)
    drift_score = drift_result.get("score", 1.0)
    composite_score = round((tc_score * 0.4 + drift_score * 0.6), 2)

    # Generate human-readable summary
    if verdict == "pass":
        summary = f"This step completed correctly. The output is consistent with the input data."
        if span.kind == "llm_call" and span.model_name:
            summary += f" (Model: {span.model_name})"
    elif verdict == "warning":
        summary = (
            f"Warning: This step ({span.name}) completed but has potential issues:\n"
            + "\n".join(explanations)
            + "\n\nReview recommended but may not require immediate action."
        )
    else:
        summary = (
            f"FAILURE: This step ({span.name}) has critical issues:\n"
            + "\n".join(explanations)
        )

        # Add actionable recommendation
        if "semantic_drift_failure" in issues:
            if span.kind == "llm_call":
                summary += (
                    "\n\nRecommendation: Add grounding instructions to the prompt, such as "
                    "'Only use facts explicitly stated in the provided context. "
                    "Do not add any information that is not present in the input.'"
                )
            else:
                summary += "\n\nRecommendation: Verify the data source and processing logic for this step."

        if "span_error" in issues:
            summary += "\n\nRecommendation: Check the error traceback and fix the underlying code issue."

    return {
        "verdict": verdict,
        "score": composite_score,
        "details": {
            "judge_model": "fathom-rule-engine-v1",
            "reasoning": "; ".join(explanations) if explanations else "All checks passed.",
            "tool_check_verdict": tc_verdict,
            "drift_verdict": drift_verdict,
        },
        "summary": summary,
    }


# ──────────────────────────────────────────
# Public API
# ──────────────────────────────────────────

async def evaluate_span(db: AsyncSession, span_id) -> list[dict]:
    """Run all 3 evaluation phases on a span and store results.

    Returns list of evaluation results.
    """
    span = await db.get(TraceSpan, span_id)
    if not span:
        raise ValueError(f"Span {span_id} not found")

    results = []

    # Phase 1: Tool Check
    tc_result = _evaluate_tool_check(span)
    results.append({"phase": "tool_check", **tc_result})

    # Phase 2: Semantic Drift
    drift_result = _evaluate_semantic_drift(span)
    results.append({"phase": "semantic_drift", **drift_result})

    # Phase 3: Judge Summary
    judge_result = _evaluate_judge_summary(span, tc_result, drift_result)
    results.append({"phase": "judge_llm", **judge_result})

    # Store in database (upsert — replace if exists)
    for r in results:
        # Check if evaluation already exists for this span+phase
        existing = await db.execute(
            select(Evaluation).where(
                Evaluation.span_id == span_id,
                Evaluation.phase == r["phase"],
            )
        )
        existing_eval = existing.scalar_one_or_none()

        if existing_eval:
            existing_eval.verdict = r["verdict"]
            existing_eval.score = r["score"]
            existing_eval.details = r["details"]
            existing_eval.summary = r.get("summary")
            existing_eval.created_at = datetime.now(timezone.utc)
        else:
            evaluation = Evaluation(
                span_id=span_id,
                phase=r["phase"],
                verdict=r["verdict"],
                score=r["score"],
                details=r["details"],
                summary=r.get("summary"),
            )
            db.add(evaluation)

    await db.flush()
    return results


async def evaluate_run(db: AsyncSession, run_id) -> dict:
    """Evaluate all spans in a run.

    Returns summary with per-span results.
    """
    stmt = select(TraceSpan).where(TraceSpan.run_id == run_id)
    result = await db.execute(stmt)
    spans = result.scalars().all()

    if not spans:
        raise ValueError(f"No spans found for run {run_id}")

    all_results = {}
    for span in spans:
        span_results = await evaluate_span(db, span.id)
        all_results[str(span.id)] = {
            "span_name": span.name,
            "evaluations": span_results,
        }

    return {
        "run_id": str(run_id),
        "spans_evaluated": len(spans),
        "results": all_results,
    }
