// TypeScript types matching backend Pydantic schemas exactly.

export type SpanStatus = 'running' | 'completed' | 'failed' | 'rewound';
export type SpanKind = 'llm_call' | 'tool_call' | 'retrieval' | 'processing' | 'agent_decision';
export type EvaluationPhase = 'tool_check' | 'semantic_drift' | 'judge_llm';
export type EvaluationVerdict = 'pass' | 'warning' | 'failure';
export type RunStatus = 'running' | 'completed' | 'failed' | 'rewound';

export interface EvaluationResponse {
  id: string;
  span_id: string;
  phase: EvaluationPhase;
  verdict: EvaluationVerdict;
  score: number | null;
  details: Record<string, unknown>;
  summary: string | null;
  created_at: string;
}

export interface SpanResponse {
  id: string;
  run_id: string;
  parent_span_id: string | null;
  name: string;
  kind: SpanKind;
  status: SpanStatus;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  latency_ms: number;
  token_count: number;
  model_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  evaluations: EvaluationResponse[];
}

export interface RunResponse {
  id: string;
  name: string;
  status: RunStatus;
  total_tokens: number;
  total_latency_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  span_count: number;
}

export interface DagResponse {
  run: RunResponse;
  spans: SpanResponse[];
  root_span_ids: string[];
}

export interface RewindRequest {
  span_id: string;
  mutated_input: Record<string, unknown>;
  re_execute: boolean;
}

export interface RewindResponse {
  success: boolean;
  rewound_span_id: string;
  downstream_re_executed: string[];
  new_run_id: string | null;
  message: string;
}

// UI-specific types
export type ViewMode = 'developer' | 'non-developer';

export const KIND_LABELS: Record<SpanKind, string> = {
  llm_call: 'llm',
  tool_call: 'tool',
  retrieval: 'retrieval',
  processing: 'process',
  agent_decision: 'decide',
};
