// Node Inspector — High-Aesthetic Monochrome (Black & White Minimalist Design)
// Strict Rule: Zero Emojis, Zero Decorative Icons

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
      className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
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
          ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
          : 'bg-zinc-950 border-zinc-800 text-zinc-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-semibold text-white">{phaseLabels[evaluation.phase] || evaluation.phase}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
            isFail
              ? 'bg-rose-950 text-rose-400 border border-rose-800'
              : isWarn
              ? 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              : 'bg-zinc-900 text-white border border-zinc-700'
          }`}
        >
          {evaluation.verdict}
        </span>
      </div>

      {mode === 'non-developer' && evaluation.summary && (
        <p className="text-xs text-zinc-300 leading-relaxed font-sans">{evaluation.summary}</p>
      )}

      {mode === 'developer' && (
        <pre className="text-[11px] font-mono text-zinc-300 bg-black p-2 rounded border border-zinc-900 overflow-x-auto max-h-32 overflow-y-auto mt-1">
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
    <div className="w-[420px] bg-black border-l border-zinc-800 flex flex-col h-full overflow-hidden shrink-0 z-30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950 font-mono">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white font-semibold">
              [{kindLabel}]
            </span>
            <span
              className={`text-[10px] uppercase font-semibold ${
                span.status === 'failed'
                  ? 'text-rose-400'
                  : span.status === 'rewound'
                  ? 'text-zinc-400'
                  : 'text-zinc-200'
              }`}
            >
              {span.status}
            </span>
          </div>
          <h2 className="text-xs font-bold text-white truncate">{span.name}</h2>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
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
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-sans">
                Notice: Step finished with quality or drift warnings.
              </div>
            ) : (
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-sans">
                Step completed successfully.
              </div>
            )}

            {/* AI Solver Card (Clean High-Contrast Monochrome) */}
            {(isFailed || isWarning || canRewind) && (
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    AI Diagnostic & Auto-Fix
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-white border border-zinc-700">
                    Groq
                  </span>
                </div>

                {!diagnosis && !diagnosing && (
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Ask AI to analyze this step, determine why it failed, and generate a working fix.
                  </p>
                )}

                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing || rewinding}
                  className="w-full py-2 px-3 rounded bg-white hover:bg-zinc-200 disabled:opacity-50 text-black text-xs font-mono font-semibold transition-all shadow-sm"
                >
                  {diagnosing ? 'Analyzing with Groq AI...' : diagnosis ? 'Re-run Diagnosis' : 'Analyze & Solve with AI'}
                </button>

                {diagnosisError && (
                  <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 font-mono">
                    Notice: {diagnosisError}
                  </div>
                )}

                {diagnosis && (
                  <div className="space-y-3 pt-2 border-t border-zinc-800 text-xs animate-fade-in">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold block mb-0.5">
                        What Happened:
                      </span>
                      <p className="text-zinc-200 leading-relaxed font-sans">{diagnosis.summary}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono text-white font-semibold block mb-0.5">
                        Recommended Solution:
                      </span>
                      <p className="text-zinc-300 leading-relaxed font-sans bg-black p-2.5 rounded border border-zinc-800">
                        {diagnosis.suggested_fix}
                      </p>
                    </div>

                    <button
                      onClick={handleDirectAIFixAndRerun}
                      disabled={rewinding}
                      className="w-full py-2.5 px-4 rounded bg-white hover:bg-zinc-200 disabled:opacity-50 text-black text-xs font-mono font-bold transition-all shadow-md"
                    >
                      {rewinding ? 'Applying Fix & Re-executing...' : 'Apply AI Fix & Re-run Step'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Simple Step Context */}
            <div className="p-3.5 rounded bg-zinc-950 border border-zinc-800 space-y-1.5 font-mono">
              <span className="text-[10px] uppercase text-zinc-500 font-semibold block">
                Operation Name
              </span>
              <p className="text-xs text-zinc-200">
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
            <div className="grid grid-cols-4 gap-2 bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <div className="text-center">
                <div className="text-xs font-bold text-white">
                  {span.latency_ms < 1000 ? `${span.latency_ms.toFixed(0)}ms` : `${(span.latency_ms / 1000).toFixed(2)}s`}
                </div>
                <div className="text-[9px] text-zinc-500 uppercase mt-0.5">Latency</div>
              </div>

              <div className="text-center">
                <div className="text-xs font-bold text-white">{span.token_count.toLocaleString()}</div>
                <div className="text-[9px] text-zinc-500 uppercase mt-0.5">Tokens</div>
              </div>

              <div className="text-center">
                <div className="text-xs font-bold text-white">{formatCost(estimatedCost)}</div>
                <div className="text-[9px] text-zinc-500 uppercase mt-0.5">Cost</div>
              </div>

              <div className="text-center truncate">
                <div className="text-xs font-bold text-white truncate" title={span.model_name || 'N/A'}>
                  {span.model_name ? span.model_name.replace('gpt-', '').replace('claude-', '') : '—'}
                </div>
                <div className="text-[9px] text-zinc-500 uppercase mt-0.5">Model</div>
              </div>
            </div>

            {/* AI Copilot Diagnosis Card (Dev Mode) */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase">Fathom AI Copilot</span>
                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="px-2.5 py-1 rounded bg-white hover:bg-zinc-200 disabled:opacity-50 text-black text-[11px] font-bold transition-all shadow-sm"
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
                <div className="space-y-2.5 pt-1 text-xs animate-fade-in">
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between border-b border-zinc-800 pb-1">
                    <span>Model: {diagnosis.model_used}</span>
                    <span className="text-white font-semibold">Diagnosis Ready</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 font-semibold block mb-0.5">
                      Headline:
                    </span>
                    <p className="text-zinc-200 font-sans text-xs leading-relaxed">{diagnosis.summary}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 font-semibold block mb-0.5">
                      Root Cause:
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed bg-black p-2 rounded border border-zinc-800">
                      {diagnosis.root_cause}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 font-semibold block mb-0.5">
                      Actionable Fix:
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed bg-black p-2 rounded border border-zinc-800">
                      {diagnosis.suggested_fix}
                    </p>
                  </div>

                  {canRewind && (
                    <button
                      onClick={handleApplyAIFixToDevEditor}
                      className="w-full py-1.5 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-medium transition-all"
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
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="uppercase tracking-wider font-semibold">Payload Input</span>
                <CopyButton text={JSON.stringify(span.input_data, null, 2)} />
              </div>
              <pre className="text-[11px] text-zinc-300 bg-zinc-950 border border-zinc-900 p-2.5 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(span.input_data, null, 2)}
              </pre>
            </div>

            {/* Output Data */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="uppercase tracking-wider font-semibold">Payload Output</span>
                <CopyButton text={JSON.stringify(span.output_data, null, 2)} />
              </div>
              <pre className="text-[11px] text-zinc-300 bg-zinc-950 border border-zinc-900 p-2.5 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {Object.keys(span.output_data).length > 0
                  ? JSON.stringify(span.output_data, null, 2)
                  : '(No output returned)'}
              </pre>
            </div>

            {/* Evaluations */}
            {span.evaluations && span.evaluations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="uppercase tracking-wider font-semibold">Evaluations</span>
                  <span className="text-[10px] text-zinc-500">{span.evaluations.length} checks</span>
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
              <div className="pt-2 border-t border-zinc-800">
                {!showEditForm ? (
                  <button
                    onClick={handleOpenEdit}
                    className="w-full py-2 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-all font-medium"
                  >
                    Mutate Input & Re-execute
                  </button>
                ) : (
                  <div className="space-y-2.5 bg-zinc-950 p-3 rounded border border-zinc-800 animate-fade-in">
                    <span className="text-xs text-zinc-300">Edit Input JSON:</span>
                    <textarea
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full h-32 bg-black border border-zinc-800 text-zinc-200 rounded p-2 text-xs focus:outline-none focus:border-white resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRewind}
                        disabled={rewinding}
                        className="flex-1 py-1.5 rounded bg-white hover:bg-zinc-200 disabled:opacity-50 text-black text-xs font-bold transition-all"
                      >
                        {rewinding ? 'Rewinding...' : 'Execute Rewind'}
                      </button>
                      <button
                        onClick={() => setShowEditForm(false)}
                        className="px-3 py-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-white bg-zinc-950 text-xs transition-all"
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
