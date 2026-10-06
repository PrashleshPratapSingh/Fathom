// Node Inspector — Modern telemetry inspection drawer with Groq-powered AI Copilot & Rewind controls

import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Wrench,
  Database,
  Cpu,
  GitBranch,
  Clock,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Bot,
  Zap,
  ChevronRight,
  Flame,
} from 'lucide-react';
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
      className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function EvalCard({ evaluation, mode }: { evaluation: EvaluationResponse; mode: ViewMode }) {
  const phaseLabels: Record<string, string> = {
    tool_check: 'Tool Validation Check',
    semantic_drift: 'Semantic Drift Analysis',
    judge_llm: 'LLM Quality Assessment',
  };

  const isFail = evaluation.verdict === 'failure';
  const isWarn = evaluation.verdict === 'warning';

  return (
    <div
      className={`p-3 rounded-lg border text-left ${
        isFail
          ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
          : isWarn
          ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
          : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 opacity-80" />
          <span className="font-semibold">{phaseLabels[evaluation.phase] || evaluation.phase}</span>
        </div>
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

  const kindLabel = KIND_LABELS[span.kind] || span.kind;
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

  const handleApplyAIFix = () => {
    if (!diagnosis?.repaired_input) return;
    setEditInput(JSON.stringify(diagnosis.repaired_input, null, 2));
    setShowEditForm(true);
  };

  const KindIcon =
    span.kind === 'llm_call'
      ? Sparkles
      : span.kind === 'tool_call'
      ? Wrench
      : span.kind === 'retrieval'
      ? Database
      : span.kind === 'agent_decision'
      ? GitBranch
      : Cpu;

  return (
    <div className="w-[430px] bg-slate-950/95 backdrop-blur-xl border-l border-slate-800/90 flex flex-col h-full overflow-hidden shrink-0 z-30 shadow-2xl animate-fade">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-violet-400">
            <KindIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-mono font-bold text-white uppercase truncate">{span.name}</h2>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
              <span className="uppercase text-violet-400">[{kindLabel}]</span>
              <span>•</span>
              <span
                className={`font-semibold uppercase ${
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
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-4 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <div className="text-center">
            <div className="text-xs font-mono font-bold text-slate-200">
              {span.latency_ms < 1000 ? `${span.latency_ms.toFixed(0)}ms` : `${(span.latency_ms / 1000).toFixed(2)}s`}
            </div>
            <div className="text-[9px] font-mono text-slate-500 uppercase flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5" /> Time
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs font-mono font-bold text-slate-200">{span.token_count.toLocaleString()}</div>
            <div className="text-[9px] font-mono text-slate-500 uppercase flex items-center justify-center gap-1 mt-0.5">
              <Cpu className="w-2.5 h-2.5" /> Tokens
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs font-mono font-bold text-emerald-400">{formatCost(estimatedCost)}</div>
            <div className="text-[9px] font-mono text-slate-500 uppercase flex items-center justify-center gap-1 mt-0.5">
              <Coins className="w-2.5 h-2.5" /> Cost
            </div>
          </div>

          <div className="text-center truncate">
            <div className="text-xs font-mono font-bold text-slate-200 truncate" title={span.model_name || 'N/A'}>
              {span.model_name ? span.model_name.replace('gpt-', '').replace('claude-', '') : '—'}
            </div>
            <div className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">Model</div>
          </div>
        </div>

        {/* AI Copilot Diagnosis Trigger / Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-violet-950/30 to-slate-900/50 border border-violet-800/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-mono font-bold text-violet-200">Fathom AI Copilot</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-950/80 text-violet-300 border border-violet-800/60">
                Groq
              </span>
            </div>
            <button
              onClick={handleDiagnose}
              disabled={diagnosing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-mono text-[11px] font-semibold transition-all shadow-md shadow-violet-600/20"
            >
              {diagnosing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Diagnose Root Cause</span>
                </>
              )}
            </button>
          </div>

          {diagnosisError && (
            <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-[11px] font-mono text-rose-300">
              ⚠️ {diagnosisError}
            </div>
          )}

          {diagnosis && (
            <div className="space-y-2.5 pt-1 text-xs font-mono animate-fade">
              <div className="text-[10px] text-slate-400 flex items-center justify-between border-b border-violet-900/40 pb-1">
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
                <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950/80 p-2 rounded border border-slate-800">
                  {diagnosis.root_cause}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase text-emerald-400 font-semibold block mb-0.5">
                  Actionable Fix:
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950/80 p-2 rounded border border-slate-800">
                  {diagnosis.suggested_fix}
                </p>
              </div>

              {canRewind && (
                <button
                  onClick={handleApplyAIFix}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ Auto-Populate Repaired Input in Rewind</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error message callout */}
        {span.error_message && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Execution Error</span>
              </div>
              <CopyButton text={span.error_message} />
            </div>
            <pre className="text-[11px] font-mono text-rose-200/90 whitespace-pre-wrap bg-rose-950/60 p-2.5 rounded-lg border border-rose-900/60 max-h-32 overflow-y-auto">
              {span.error_message}
            </pre>
          </div>
        )}

        {/* Input Data */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="uppercase tracking-wider font-semibold">
              {mode === 'developer' ? 'Payload Input' : 'Input Context'}
            </span>
            <CopyButton text={JSON.stringify(span.input_data, null, 2)} />
          </div>
          <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 border border-slate-800 p-3 rounded-xl overflow-x-auto max-h-40 overflow-y-auto">
            {JSON.stringify(span.input_data, null, 2)}
          </pre>
        </div>

        {/* Output Data */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="uppercase tracking-wider font-semibold">
              {mode === 'developer' ? 'Payload Output' : 'Output Result'}
            </span>
            <CopyButton text={JSON.stringify(span.output_data, null, 2)} />
          </div>
          <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 border border-slate-800 p-3 rounded-xl overflow-x-auto max-h-40 overflow-y-auto">
            {Object.keys(span.output_data).length > 0
              ? JSON.stringify(span.output_data, null, 2)
              : '(No output returned)'}
          </pre>
        </div>

        {/* Evaluations */}
        {span.evaluations && span.evaluations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="uppercase tracking-wider font-semibold">Quality & Safety Evaluations</span>
              <span className="text-[10px] text-slate-500">{span.evaluations.length} checks</span>
            </div>
            <div className="space-y-2">
              {span.evaluations.map((ev) => (
                <EvalCard key={ev.id} evaluation={ev} mode={mode} />
              ))}
            </div>
          </div>
        )}

        {/* Rewind & Mutate Action Section */}
        {canRewind && (
          <div className="pt-2 border-t border-slate-800/80">
            {!showEditForm ? (
              <button
                onClick={handleOpenEdit}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/50 hover:border-violet-500 text-xs font-mono text-violet-200 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
                <span>Mutate Input & Re-execute from this Span</span>
              </button>
            ) : (
              <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-violet-800/60 animate-fade">
                <div className="flex items-center justify-between text-xs font-mono text-violet-300">
                  <span>Edit Input JSON:</span>
                </div>
                <textarea
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  className="w-full h-36 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-violet-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRewind}
                    disabled={rewinding}
                    className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-mono text-xs font-semibold shadow-lg transition-all"
                  >
                    {rewinding ? 'Rewinding & Executing...' : 'Execute Rewind'}
                  </button>
                  <button
                    onClick={() => setShowEditForm(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white bg-slate-900 font-mono text-xs transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
