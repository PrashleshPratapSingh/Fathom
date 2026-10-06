# Feature 02: AI Trace Copilot & Auto-Repair (Groq-Powered)

**Status**: Implemented  
**Lead Component**: Backend & Frontend  
**Primary Files**:
- `backend/app/routers/copilot.py` (Endpoint `/api/v1/copilot/diagnose`)
- `backend/app/services/copilot_service.py` (Groq Llama-3.3-70B diagnostic logic)
- `frontend/src/components/NodeInspector.tsx` (AI Diagnosis & 1-Click Auto-Rewind button)

---

## 1. Overview & Objective
Empower developers to troubleshoot agent failures instantly using an integrated AI Copilot powered by **Groq (`llama-3.3-70b-versatile`)**. When a span fails or triggers warnings, the AI inspects the full trace context, pinpoints the root cause, and offers a 1-click repaired input payload for the Rewind mechanism.

---

## 2. Architecture & Data Flow

```mermaid
sequenceDiagram
    participant User as Developer (Frontend)
    participant UI as NodeInspector
    participant API as FastAPI (/api/v1/copilot/diagnose)
    participant LLM as Groq LPU (llama-3.3-70b-versatile)
    participant Rewind as Rewind Engine

    User->>UI: Clicks "Diagnose Root Cause"
    UI->>API: POST /api/v1/copilot/diagnose { run_id, span_id }
    API->>LLM: Prompt with error message, input/output JSON, and parent context
    LLM-->>API: Structured response (Headline summary, root cause, suggested fix, repaired input JSON)
    API-->>UI: DiagnosisResponse
    UI->>User: Displays plain-English root cause diagnosis
    User->>UI: Clicks "⚡ Auto-Populate Repaired Input in Rewind"
    UI->>Rewind: Pre-populates editor and allows instant execution
```

---

## 3. Implementation Blueprint

### Backend Endpoint: `POST /api/v1/copilot/diagnose`
**Request Body**:
```json
{
  "run_id": "uuid",
  "span_id": "uuid"
}
```

**Response Body**:
```json
{
  "summary": "The web search tool failed because the query contained invalid punctuation.",
  "root_cause_category": "tool_argument_error",
  "culprit_span_id": "uuid",
  "repaired_input": {
    "query": "Fix deployment authentication error"
  },
  "confidence_score": 0.95
}
```

### Frontend Integration
- Add a **"✨ AI Root Cause Diagnosis"** card inside `NodeInspector.tsx`.
- Include a **"⚡ Auto-Populate Repaired Input"** button directly connected to the Rewind mutation editor.

---

## 4. Teammate Checklist
- [ ] Create `backend/app/routers/copilot.py` and register in `backend/app/main.py`.
- [ ] Support fallback heuristic analysis if API keys are not supplied.
- [ ] Add loading skeletons and error banners in `NodeInspector.tsx`.
