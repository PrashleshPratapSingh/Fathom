# Fathom Project Changes & Feature Guide

This document summarizes all architectural upgrades, new features, UI refinements, AI integrations, and codebase cleanup completed in Fathom.

---

## 1. Executive Summary

Fathom has been upgraded from a basic prototype into an **enterprise-grade AI agent observability and time-travel debugging platform**.

Key additions include:
1. **Interactive React Flow DAG Visualizer**: Dual-layout auto-positioning (Vertical & Horizontal), execution replay scrubber, latency bottleneck critical path, and real-time search.
2. **Groq AI Copilot & 1-Click Auto-Rewind**: High-speed LLM root-cause analysis powered by Groq (`qwen/qwen3.8-27b` / `llama-3.3-70b-versatile`) that automatically writes corrected inputs for re-execution.
3. **Simple Mode vs. Dev Mode**: Clear role-based interface — Simple Mode for non-technical users to inspect and solve errors with AI in 1 click; Dev Mode for engineers with full latency, token split, and JSON payloads.
4. **Clean Enterprise UI**: 100% stripped of decorative emojis and cartoonish iconography in favor of crisp typography and minimal design.
5. **Team Feature Specifications**: Organized specifications in [`features/`](./features) for seamless collaboration.
6. **Zero-Docker SQLite Local Development**: Full database compatibility with zero container dependencies.

---

## 2. Frontend Upgrades

### A. React Flow Trace DAG Canvas ([`DagCanvas.tsx`](./frontend/src/components/DagCanvas.tsx))
- **Auto-Layout with Dagre**: Computes collision-free hierarchical layouts for complex agent decision branching.
- **Direction Toggle**: Switch between **Vertical (Top-to-Bottom)** and **Horizontal (Left-to-Right)** orientations with matching dynamic React Flow handles.
- **Critical Path Highlighting**: Identifies the chain of spans contributing maximum latency and highlights bottleneck edges.
- **Search & Focus**: Instant filtering across span names, models, and payloads with smooth auto-centering on matching nodes.
- **Trace Replay Scrubber**: Floating playback bar with Play/Pause, step-by-step navigation, and progress scrubbing.

### B. Clean Node Architecture ([`SpanNode.tsx`](./frontend/src/components/SpanNode.tsx))
- **Kind Badges**: Minimalist colored text tags: `[LLM]`, `[TOOL]`, `[RAG]`, `[PROCESS]`, `[DECIDE]`.
- **Status Indicators**: Minimal colored geometric dots (`OK`, `Failed`, `Warning`, `Rewound`).
- **Telemetry Footer**: Shows latency, token count, and estimated API cost ($USD) in Dev Mode; displays clean step status in Simple Mode.

### C. Inspection Drawer & AI Solver ([`NodeInspector.tsx`](./frontend/src/components/NodeInspector.tsx))
- **Simple Mode Experience**:
  - Highlights step errors in clear, non-technical language.
  - **AI Diagnostic & Auto-Fix**: One-click analysis powered by Groq.
  - **Apply AI Fix & Re-run Step**: Instantly dispatches repaired inputs to the Rewind engine without manual JSON editing.
- **Dev Mode Experience**:
  - Full latency, token count, model chip, and estimated cost grid.
  - Raw JSON input & output viewers with copy functionality.
  - Full Python exception stacktraces.
  - 3-Phase evaluation breakdown (Tool validation, Semantic drift, Judge verdicts).
  - Manual JSON mutation editor.

### D. Header Navigation ([`HeaderBar.tsx`](./frontend/src/components/HeaderBar.tsx))
- Clean segmented switch: `[ Simple Mode ]` | `[ Dev Mode ]`.
- Live aggregated telemetry: Total Steps, Passed count, Failed count, Latency, Tokens, and Total Cost.
- Trace run selector.

---

## 3. Backend & AI Integrations

### A. Groq AI Integration ([`copilot_service.py`](./backend/app/services/copilot_service.py) & [`copilot.py`](./backend/app/routers/copilot.py))
- **Endpoint**: `POST /api/v1/copilot/diagnose`
- **Model**: `qwen/qwen3.8-27b` (configurable via `GROQ_MODEL` in `.env`)
- **Diagnostic Engine**:
  - Evaluates span inputs, outputs, errors, parent span context, and evaluation results.
  - Returns structured JSON:
    - `summary`: High-level headline of what went wrong.
    - `root_cause`: Technical diagnosis of schema mismatch or API error.
    - `suggested_fix`: Actionable instructions.
    - `repaired_input`: Corrected JSON payload ready for re-execution.
- **Fallback**: Includes a deterministic heuristic engine if no API key is provided, ensuring zero local crashes.

### B. Active LLM-as-a-Judge ([`judge_llm.py`](./backend/app/services/judge_llm.py))
- Updated Phase 3 evaluation to support Groq's high-speed endpoint (`https://api.groq.com/openai/v1`) alongside OpenAI.

### C. Cost Estimator Utility ([`costEstimator.ts`](./frontend/src/utils/costEstimator.ts))
- Dynamically estimates API spend across OpenAI, Anthropic, Gemini, and Groq models based on token usage.

---

## 4. Documentation & Feature Specifications

Created the [`features/`](./features) directory and root [`FEATURES.md`](./FEATURES.md):
- [`01-react-flow-visualizer.md`](./features/01-react-flow-visualizer.md) — DAG layout, replay scrubber, bottleneck detection.
- [`02-ai-copilot-root-cause.md`](./features/02-ai-copilot-root-cause.md) — Groq AI diagnosis & automated rewind repair.
- [`03-llm-judge-evaluations.md`](./features/03-llm-judge-evaluations.md) — 3-Phase evaluation pipeline specs.
- [`04-cost-latency-analytics.md`](./features/04-cost-latency-analytics.md) — Token spend & P95/P99 latency dashboards.
- [`05-tracing-sdk-python.md`](./features/05-tracing-sdk-python.md) — Python `@fathom.trace` decorator & LangChain integrations.

---

## 5. Repository Cleanup & Hygiene

1. **Removed Binary DB from Git**:
   - `backend/fathom_dev.db` untracked from Git so database writes no longer cause git diffs.
   - Updated `.gitignore` to ignore `*.db`, `*.sqlite`, `*.sqlite3`, and `backend/*.db`.
2. **Removed Stale Files**:
   - Deleted auto-generated scratch test files (`tests/test_regression_*.py`).
   - Deleted TypeScript build info cache (`frontend/tsconfig.tsbuildinfo`).
   - Cleared all `__pycache__` and `.pytest_cache` directories.
3. **Environment Security**:
   - `.env` and `backend/.env` are strictly gitignored to protect your Groq API key from accidental commits.
   - Updated `.env.example` with clear placeholders for teammates.

---

## 6. How to Run & Test

```bash
# 1. Start Backend (Port 8000)
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000

# 2. Start Frontend (Port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` to test Simple Mode, inspect traces, and run Groq AI root cause analysis.
