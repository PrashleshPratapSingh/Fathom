# Feature 03: Active LLM-as-a-Judge Evaluation Engine

**Status**: Partial / Enhancing  
**Lead Component**: Backend  
**Primary Files**:
- `backend/app/services/judge_llm.py`
- `backend/app/services/evaluator.py`
- `backend/app/services/drift_detector.py`
- `backend/app/services/tool_checker.py`

---

## 1. Overview & Objective
Every span ingested into Fathom passes through a 3-phase automated evaluation pipeline:
1. **Phase 1: Tool Checker** (Validates HTTP status, JSON schema, parameter constraints).
2. **Phase 2: Semantic Drift Detector** (Detects embedding cosine drift between prompt intent and response).
3. **Phase 3: Judge LLM** (Evaluates response quality, truthfulness, and generates non-technical summaries).

---

## 2. Supported LLM Providers
To ensure portability and zero vendor lock-in, the Judge LLM supports:
- **Google Gemini** (`gemini-1.5-flash`, `gemini-1.5-pro` via `GEMINI_API_KEY`)
- **OpenAI** (`gpt-4o-mini`, `gpt-4o` via `OPENAI_API_KEY`)
- **Local Ollama** (`llama3.2`, `mistral` via `OLLAMA_BASE_URL=http://localhost:11434`)
- **Deterministic Heuristic Fallback** (Zero external API dependencies needed for local testing)

---

## 3. Evaluation Verdicts & Scoring

| Verdict | Score Range | Criteria |
|---------|-------------|----------|
| **Pass** (`pass`) | 0.80 – 1.00 | Output is faithful, tool schema is valid, drift < threshold. |
| **Warning** (`warning`) | 0.50 – 0.79 | Minor hallucination, suboptimal formatting, or latency warning. |
| **Failure** (`failure`) | 0.00 – 0.49 | Unhandled error, tool crash, or complete semantic divergence. |

---

## 4. Teammate Checklist
- [ ] Add Gemini API adapter in `backend/app/services/judge_llm.py`.
- [ ] Implement RAG context-relevance check in Phase 2.
- [ ] Expose evaluation configuration thresholds via `.env` (`DRIFT_THRESHOLD`, `JUDGE_LLM_MODEL`).
