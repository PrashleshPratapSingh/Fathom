// Node Inspector — Minimalist, Enterprise Drawer (Zero Emojis, Zero Decorative Icons)

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { SpanResponse, ViewMode, EvaluationResponse, DiagnosisResponse } from '../types/api';
import { KIND_LABELS } from '../types/api';
import { estimateCost, formatCost } from '../utils/costEstimator';
import { diagnoseSpan } from '../api/client';

interface NodeInspectorProps {
  span: SpanResponse | null;
  mode: ViewMode;
  onClose: () => void;
  onRewind: (spanId: string, mutatedInput: Record<string, unknown>) => void;
  rewinding: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
      title="Copy"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function EvalCard({ evaluation, mode }: { evaluation: EvaluationResponse; mode: ViewMode }) {
  const phaseLabels: Record<string, string> = {
    tool_check: 'Tool Validation',
    semantic_drift: 'Semantic Drift',
    judge_llm: 'Quality Assessment',
  };

  const isFail = evaluation.verdict === 'failure';
  const isWarn = evaluation.verdict === 'warning';

  return (
    <div
      className={`p-3 rounded border text-left font-mono text-xs ${
        isFail
          ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
          : isWarn
          ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
          : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-semibold">{phaseLabels[evaluation.phase] || evaluation.phase}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
            isFail
              ? 'bg-rose-900/60 text-rose-300'
              : isWarn
              ? 'bg-amber-900/60 text-amber-300'
              : 'bg-emerald-900/60 text-emerald-300'
          }`}
        >
          {evaluation.verdict}
        </span>
      </div>

      {mode === 'non-developer' && evaluation.summary && (
        <p className="text-xs text-slate-300 leading-relaxed font-sans">{evaluation.summary}</p>
      )}

      {mode === 'developer' && (
        <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800 overflow-x-auto max-h-32 overflow-y-auto mt-1">
          {JSON.stringify(evaluation.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function NodeInspector({ span, mode, onClose, onRewind, rewinding }: NodeInspectorProps) {
  const [editInput, setEditInput] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);

  // Groq AI Diagnosis state
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

  useEffect(() => {
    setDiagnosis(null);
    setDiagnosisError(null);
    setShowEditForm(false);
  }, [span?.id]);

  if (!span) return null;

  const kindLabel = (KIND_LABELS[span.kind] || span.kind).toUpperCase();
  const isFailed = span.status === 'failed';
  const isWarning = span.evaluations.some((e) => e.verdict === 'warning');
  const canRewind = span.status === 'failed' || span.status === 'completed';
  const estimatedCost = estimateCost(span.model_name, span.token_count);

  const handleRewind = () => {
    try {
      const parsed = JSON.parse(editInput);
      onRewind(span.id, parsed);
      setShowEditForm(false);
      setEditInput('');
    } catch {
      alert('Invalid JSON input format.');
    }
  };

  const handleOpenEdit = () => {
    setEditInput(JSON.stringify(span.input_data, null, 2));
    setShowEditForm(true);
  };

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagnosisError(null);
    try {
      const result = await diagnoseSpan(span.run_id, span.id);
      setDiagnosis(result);
    } catch (err: any) {
      setDiagnosisError(err.message || 'Diagnosis request failed.');
    } finally {
      setDiagnosing(false);
    }
  };

  // 1-Click Simple Mode AI Fix Execution
  const handleDirectAIFixAndRerun = () => {
    if (!diagnosis?.repaired_input) return;
    onRewind(span.id, diagnosis.repaired_input);
  };

  const handleApplyAIFixToDevEditor = () => {
    if (!diagnosis?.repaired_input) return;
    setEditInput(JSON.stringify(diagnosis.repaired_input, null, 2));
    setShowEditForm(true);
  };

  return (
    <div className="w-[420px] bg-slate-950 border-l border-slate-800 flex flex-col h-full overflow-hidden shrink-0 z-30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 font-mono">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
              [{kindLabel}]
            </span>
            <span
              className={`text-[10px] uppercase font-semibold ${
                span.status === 'failed'
                  ? 'text-rose-400'
                  : span.status === 'rewound'
                  ? 'text-purple-400'
                  : 'text-emerald-400'
              }`}
            >
              {span.status}
            </span>
          </div>
          <h2 className="text-xs font-bold text-white truncate">{span.name}</h2>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* ────────────────────────────────────────── */}
        {/* SIMPLE MODE (Clean, Non-Technical View)     */}
        {/* ────────────────────────────────────────── */}
        {mode === 'non-developer' ? (
          <div className="space-y-4">
            {/* Simple Status Banner */}
            {isFailed ? (
              <div className="p-3.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-200 space-y-1.5">
                <div className="text-xs font-mono font-semibold text-rose-300 uppercase tracking-wide">
                  Step Failed
                </div>
                {span.error_message && (
                  <p className="text-xs text-rose-200/90 leading-relaxed font-sans bg-rose-950/60 p-2.5 rounded border border-rose-900/60">
                    {span.error_message.split('\n').pop()}
                  </p>
                )}
              </div>
            ) : isWarning ? (
              <div className="p-3 rounded bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs font-sans">
                Notice: Step finished with quality or drift warnings.
              </div>
            ) : (
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 text-xs font-sans">
                Step completed successfully.
              </div>
            )}

            {/* AI Solver Card (Clean Simple Mode) */}
            {(isFailed || isWarning || canRewind) && (
              <div className="p-4 rounded bg-slate-900 border border-violet-800/50 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-violet-300 uppercase tracking-wider">
                    AI Diagnostic & Auto-Fix
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800/60">
                    Groq
                  </span>
                </div>

                {!diagnosis && !diagnosing && (
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Ask AI to analyze this step, determine why it failed, and generate a working fix.
                  </p>
                )}

                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing || rewinding}
                  className="w-full py-2 px-3 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-mono font-medium transition-all"
                >
                  {diagnosing ? 'Analyzing with Groq AI...' : diagnosis ? 'Re-run Diagnosis' : 'Analyze & Solve with AI'}
                </button>

                {diagnosisError && (
                  <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 font-mono">
                    Notice: {diagnosisError}
                  </div>
                )}

                {diagnosis && (
                  <div className="space-y-3 pt-2 border-t border-slate-800 text-xs animate-fade">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-violet-400 font-semibold block mb-0.5">
                        What Happened:
                      </span>
                      <p className="text-slate-200 leading-relaxed font-sans">{diagnosis.summary}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold block mb-0.5">
                        Recommended Solution:
                      </span>
                      <p className="text-slate-300 leading-relaxed font-sans bg-slate-950 p-2.5 rounded border border-slate-800">
                        {diagnosis.suggested_fix}
                      </p>
                    </div>

                    <button
                      onClick={handleDirectAIFixAndRerun}
                      disabled={rewinding}
                      className="w-full py-2.5 px-4 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-semibold transition-all shadow"
                    >
                      {rewinding ? 'Applying Fix & Re-executing...' : 'Apply AI Fix & Re-run Step'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Simple Step Context */}
            <div className="p-3.5 rounded bg-slate-900/50 border border-slate-800 space-y-1.5 font-mono">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                Operation Name
              </span>
              <p className="text-xs text-slate-200">
                {span.name}
              </p>
            </div>
          </div>
        ) : (
          /* ────────────────────────────────────────── */
          /* DEV MODE (Advanced Engineering Telemetry)   */
          /* ────────────────────────────────────────── */
          <div className="space-y-4 font-mono">
            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-4 gap-2 bg-slate-900 p-2.5 rounded border border-slate-800">
              <div className="text-center">
                <div className="text-xs font-bold text-slate-200">
                  {span.latency_ms < 1000 ? `${span.latency_ms.toFixed(0)}ms` : `${(span.latency_ms / 1000).toFixed(2)}s`}
                </div>
                <div className="text-[9px] text-slate-500 uppercase mt-0.5">Latency</div>
              </div>

              <div className="text-center">
                <div className="text-xs font-bold text-slate-200">{span.token_count.toLocaleString()}</div>
                <div className="text-[9px] text-slate-500 uppercase mt-0.5">Tokens</div>
              </div>

              <div className="text-center">
                <div className="text-xs font-bold text-emerald-400">{formatCost(estimatedCost)}</div>
                <div className="text-[9px] text-slate-500 uppercase mt-0.5">Cost</div>
              </div>

              <div className="text-center truncate">
                <div className="text-xs font-bold text-slate-200 truncate" title={span.model_name || 'N/A'}>
                  {span.model_name ? span.model_name.replace('gpt-', '').replace('claude-', '') : '—'}
                </div>
                <div className="text-[9px] text-slate-500 uppercase mt-0.5">Model</div>
              </div>
            </div>

            {/* AI Copilot Diagnosis Card (Dev Mode) */}
            <div className="p-3.5 rounded bg-slate-900 border border-violet-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300 uppercase">Fathom AI Copilot</span>
                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-semibold transition-all"
                >
                  {diagnosing ? 'Analyzing...' : 'Diagnose Root Cause'}
                </button>
              </div>

              {diagnosisError && (
                <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300">
                  Notice: {diagnosisError}
                </div>
              )}

              {diagnosis && (
                <div className="space-y-2.5 pt-1 text-xs animate-fade">
                  <div className="text-[10px] text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1">
                    <span>Model: {diagnosis.model_used}</span>
                    <span className="text-emerald-400 font-semibold">Diagnosis Ready</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-violet-400 font-semibold block mb-0.5">
                      Headline:
                    </span>
                    <p className="text-slate-200 font-sans text-xs leading-relaxed">{diagnosis.summary}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-amber-400 font-semibold block mb-0.5">
                      Root Cause:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-2 rounded border border-slate-800">
                      {diagnosis.root_cause}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-emerald-400 font-semibold block mb-0.5">
                      Actionable Fix:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-2 rounded border border-slate-800">
                      {diagnosis.suggested_fix}
                    </p>
                  </div>

                  {canRewind && (
                    <button
                      onClick={handleApplyAIFixToDevEditor}
                      className="w-full py-1.5 px-3 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 text-xs font-medium transition-all"
                    >
                      Auto-Populate Repaired Input in Rewind
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error message callout (Dev Mode) */}
            {span.error_message && (
              <div className="p-3 rounded bg-rose-950/30 border border-rose-800/60 text-rose-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-rose-300 uppercase">Execution Stacktrace</span>
                  <CopyButton text={span.error_message} />
                </div>
                <pre className="text-[11px] text-rose-200/90 whitespace-pre-wrap bg-rose-950/60 p-2 rounded border border-rose-900/60 max-h-32 overflow-y-auto">
                  {span.error_message}
                </pre>
              </div>
            )}

            {/* Input Data */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-wider font-semibold">Payload Input</span>
                <CopyButton text={JSON.stringify(span.input_data, null, 2)} />
              </div>
              <pre className="text-[11px] text-slate-300 bg-slate-900 border border-slate-800 p-2.5 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(span.input_data, null, 2)}
              </pre>
            </div>

            {/* Output Data */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-wider font-semibold">Payload Output</span>
                <CopyButton text={JSON.stringify(span.output_data, null, 2)} />
              </div>
              <pre className="text-[11px] text-slate-300 bg-slate-900 border border-slate-800 p-2.5 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {Object.keys(span.output_data).length > 0
                  ? JSON.stringify(span.output_data, null, 2)
                  : '(No output returned)'}
              </pre>
            </div>

            {/* Evaluations */}
            {span.evaluations && span.evaluations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="uppercase tracking-wider font-semibold">Evaluations</span>
                  <span className="text-[10px] text-slate-500">{span.evaluations.length} checks</span>
                </div>
                <div className="space-y-2">
                  {span.evaluations.map((ev) => (
                    <EvalCard key={ev.id} evaluation={ev} mode={mode} />
                  ))}
                </div>
              </div>
            )}

            {/* Rewind & Mutate Action Section (Dev Mode) */}
            {canRewind && (
              <div className="pt-2 border-t border-slate-800">
                {!showEditForm ? (
                  <button
                    onClick={handleOpenEdit}
                    className="w-full py-2 px-3 rounded bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/50 hover:border-violet-500 text-xs text-violet-200 transition-all"
                  >
                    Mutate Input & Re-execute
                  </button>
                ) : (
                  <div className="space-y-2.5 bg-slate-900 p-3 rounded border border-violet-800/60 animate-fade">
                    <span className="text-xs text-violet-300">Edit Input JSON:</span>
                    <textarea
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full h-32 bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-violet-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRewind}
                        disabled={rewinding}
                        className="flex-1 py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold transition-all"
                      >
                        {rewinding ? 'Rewinding...' : 'Execute Rewind'}
                      </button>
                      <button
                        onClick={() => setShowEditForm(false)}
                        className="px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-white bg-slate-900 text-xs transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
