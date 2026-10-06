# Feature 05: Python Tracing SDK & Framework Integrations

**Status**: In Progress  
**Lead Component**: SDK / Client  
**Primary Files**:
- `fathom_sdk/tracer.py`
- `fathom_sdk/integrations/langchain.py`
- `fathom_sdk/integrations/llamaindex.py`

---

## 1. Overview & Objective
Make instrumenting any existing AI agent or LLM script effortless with a 1-line Python decorator or callback handler.

---

## 2. Developer Experience Examples

### A. Simple Function Decorator
```python
from fathom_sdk import fathom

@fathom.trace(kind="llm_call", name="generate_summary")
def summarize(text: str) -> str:
    response = client.chat.completions.create(...)
    return response.choices[0].message.content
```

### B. LangChain Callback Handler
```python
from fathom_sdk.integrations.langchain import FathomCallbackHandler

handler = FathomCallbackHandler(endpoint="http://localhost:8000")
chain.invoke({"input": "Hello"}, config={"callbacks": [handler]})
```

---

## 3. Teammate Checklist
- [ ] Complete `fathom_sdk/tracer.py` with asynchronous non-blocking flush queue.
- [ ] Add auto-capture for OpenAI and Anthropic client SDK calls.
