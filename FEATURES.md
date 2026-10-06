# Fathom Product Features & Roadmap

> Detailed implementation specifications for each feature are organized inside the [`features/`](./features) directory.

---

## 🚀 Quick Navigation

1. **[01. React Flow Trace DAG Visualizer](./features/01-react-flow-visualizer.md)**  
   *Interactive DAG with Top-to-Bottom / Left-to-Right auto-layout, execution replay scrubber, latency bottleneck detection, and search-to-focus.*

2. **[02. AI Trace Copilot & Auto-Repair](./features/02-ai-copilot-root-cause.md)**  
   *AI-driven root-cause diagnosis for failed runs and automated input mutation suggestions for the Rewind engine.*

3. **[03. Active LLM-as-a-Judge Engine](./features/03-llm-judge-evaluations.md)**  
   *3-phase evaluation pipeline (Tool validation, Semantic drift detection, and LLM-as-a-judge for truthfulness and clarity).*

4. **[04. Cost, Token & Latency Analytics](./features/04-cost-latency-analytics.md)**  
   *Aggregate metrics dashboard tracking spend ($USD), token usage per model, and P50/P95/P99 latency percentiles.*

5. **[05. Python Tracing SDK & Framework Integrations](./features/05-tracing-sdk-python.md)**  
   *Drop-in Python `@fathom.trace` decorator and LangChain/LlamaIndex callback handlers.*

---

## 📂 Directory Structure

```
features/
├── README.md                          # Features index & architecture diagram
├── 01-react-flow-visualizer.md        # React Flow DAG specifications
├── 02-ai-copilot-root-cause.md        # AI Copilot & auto-fix specifications
├── 03-llm-judge-evaluations.md        # LLM Judge evaluation specifications
├── 04-cost-latency-analytics.md       # Cost & latency analytics specifications
└── 05-tracing-sdk-python.md           # Python SDK instrumentation specifications
```
