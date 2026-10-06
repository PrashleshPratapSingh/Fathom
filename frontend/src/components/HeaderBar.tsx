// Header bar — Modern dark observability navigation and live metrics summary

import { Activity, Clock, Cpu, Coins, CheckCircle, AlertTriangle, Layers, Terminal } from 'lucide-react';
import type { RunResponse, ViewMode, SpanResponse } from '../types/api';
import { estimateCost, formatCost } from '../utils/costEstimator';

interface HeaderBarProps {
  runs: RunResponse[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  mode: ViewMode;
  onToggleMode: () => void;
  loading: boolean;
  spans: SpanResponse[];
}

export default function HeaderBar({
  runs,
  selectedRunId,
  onSelectRun,
  mode,
  onToggleMode,
  loading,
  spans,
}: HeaderBarProps) {
  const totalSteps = spans.length;
  const passCount = spans.filter(
    (s) => s.status === 'completed' && !s.evaluations.some((e) => e.verdict === 'failure'),
  ).length;
  const failCount = spans.filter(
    (s) => s.status === 'failed' || s.evaluations.some((e) => e.verdict === 'failure'),
  ).length;
  const totalLatency = spans.reduce((sum, s) => sum + s.latency_ms, 0);
  const totalTokens = spans.reduce((sum, s) => sum + s.token_count, 0);
  const totalCost = spans.reduce((sum, s) => sum + estimateCost(s.model_name, s.token_count), 0);

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  return (
    <div className="shrink-0 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur z-20">
      {/* Main navigation row */}
      <header className="flex items-center justify-between px-5 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wider text-white font-mono">FATHOM</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-violet-950/80 text-violet-300 border border-violet-800/60">
                Trace DAG
              </span>
            </div>
          </div>
        </div>

        {/* Run Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedRunId || ''}
              onChange={(e) => onSelectRun(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono min-w-[320px] focus:outline-none focus:border-violet-500 transition-all shadow-inner"
            >
              <option value="" disabled className="bg-slate-900 text-slate-500">
                Select a trace run...
              </option>
              {runs.map((run) => (
                <option key={run.id} value={run.id} className="bg-slate-900 text-slate-200">
                  {run.name} • {run.span_count} spans • {run.total_tokens.toLocaleString()} tok
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Developer Mode Switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all border ${
              mode === 'developer'
                ? 'bg-violet-950/60 border-violet-700 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{mode === 'developer' ? 'Dev Mode' : 'Simple Mode'}</span>
          </button>
        </div>
      </header>

      {/* Real-time Telemetry Banner */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-between px-5 py-1.5 bg-slate-900/60 border-t border-slate-800/50 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Spans:</span>
              <span className="text-slate-100 font-semibold">{totalSteps}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Passed:</span>
              <span className="text-emerald-300 font-semibold">{passCount}</span>
            </div>

            {failCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Errors:</span>
                <span className="text-rose-400 font-semibold">{failCount}</span>
              </div>
            )}

            <div className="h-3 w-px bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Latency:</span>
              <span className="text-slate-200 font-semibold">
                {totalLatency < 1000 ? `${totalLatency.toFixed(0)}ms` : `${(totalLatency / 1000).toFixed(2)}s`}
              </span>
            </div>

            {totalTokens > 0 && (
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                <span>Tokens:</span>
                <span className="text-slate-200 font-semibold">{totalTokens.toLocaleString()}</span>
              </div>
            )}

            {totalCost > 0 && (
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>Est. Cost:</span>
                <span className="text-emerald-400 font-semibold">{formatCost(totalCost)}</span>
              </div>
            )}
          </div>

          {selectedRun && (
            <div className="text-[10px] text-slate-500 truncate max-w-xs">
              ID: <span className="font-mono">{selectedRun.id.slice(0, 12)}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
