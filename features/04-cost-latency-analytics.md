# Feature 04: Cost, Token & Latency Analytics

**Status**: Planned  
**Lead Component**: Frontend & Backend  
**Primary Files**:
- `backend/app/routers/analytics.py` (New endpoint `/api/v1/analytics/summary`)
- `frontend/src/components/AnalyticsView.tsx` (New Dashboard view)

---

## 1. Overview & Objective
Provide an aggregate dashboard that helps engineering teams track operational efficiency across all agent executions.

---

## 2. Key Metrics & Visualizations

1. **Token & Cost Tracking**:
   - Total Tokens consumed by Model (`gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-flash`).
   - Estimated daily and per-run spend ($USD).
2. **Latency Distributions**:
   - P50, P90, P95, and P99 latency percentiles across tool calls vs. LLM generation.
3. **Failure Rate Heatmap**:
   - Breakdown of top failing tools, API timeouts, and drift events.

---

## 3. Teammate Checklist
- [ ] Add SQL aggregation queries for `tokens`, `latency_ms`, and `status`.
- [ ] Create a toggle in `HeaderBar.tsx` between **"Trace DAG View"** and **"Analytics Dashboard"**.
