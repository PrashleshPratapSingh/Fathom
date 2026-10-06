# Feature 01: React Flow Trace DAG Visualizer

**Status**: Implemented  
**Lead Component**: Frontend  
**Primary Files**:
- `frontend/src/components/DagCanvas.tsx`
- `frontend/src/components/SpanNode.tsx`
- `frontend/src/utils/dagTransform.ts`
- `frontend/src/utils/costEstimator.ts`

---

## 1. Overview & Objective
Transform flat trace span logs into an intuitive, interactive Directed Acyclic Graph (DAG) using `@xyflow/react`. Provides developers and non-technical stakeholders with instant visibility into agent decision trees, tool calls, latencies, and errors.

---

## 2. Key Capabilities

### A. Dual Orientation Auto-Layout (TB & LR)
- Uses `dagre` graph layout library to dynamically calculate collision-free (X, Y) node coordinates.
- **Top-to-Bottom (TB)**: Traditional hierarchical tree view.
- **Left-to-Right (LR)**: Horizontal timeline pipeline view.
- React Flow handles dynamically shift (Top/Bottom vs Left/Right) based on active orientation.

### B. Critical Path (Latency Bottleneck) Detection
- Computes the longest-latency path through the DAG from root span to leaf spans using DFS.
- When toggled via the **"Bottlenecks"** button:
  - Bottleneck edges render with glowing amber color (`#f59e0b`) and animated dashes.
  - Culprit nodes display a pulsating **Flame** badge and highlighted border.

### C. Live Search & Center-Focus
- Filter spans in real-time by:
  - Span name
  - Span kind (`llm`, `tool`, `rag`, `process`, `decide`)
  - Model name (`gpt-4o`, `claude-3-5-sonnet`)
  - Input query / Output content
- Matching nodes stay bright and highlighted; non-matching nodes are dimmed.
- Clicking any node smoothly centers and zooms the canvas.

### D. Execution Replay Scrubber
- Floating playback toolbar at the bottom of the canvas:
  - **Play / Pause** toggle.
  - **Step Forward / Backward** step controls.
  - Interactive slider (`Step 1 of N`).
- Steps light up sequentially, illustrating how the agent branched and executed in real-time.

### E. Telemetry Cards on Node
- **Kind Badges**: Custom icons for LLM, Tool, RAG, Process, Decide.
- **Latency Pill**: Visual warning if latency exceeds 2,000ms.
- **Tokens & Cost**: Live token count and estimated API cost ($USD).
- **Status Indicator**: Success (Green), Error (Crimson), Warning (Amber), Mutated (Purple).

---

## 3. Maintenance & Extension Guide for Teammates
- **Adding new span kinds**: Update `KIND_CONFIG` in `frontend/src/components/SpanNode.tsx` and `KIND_LABELS` in `frontend/src/types/api.ts`.
- **Modifying graph layout spacing**: Tweak `nodesep` and `ranksep` in `frontend/src/utils/dagTransform.ts`.
