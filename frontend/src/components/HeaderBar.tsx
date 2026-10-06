// Header bar — Clean Minimal Navigation (Zero Emojis, Zero Decorative Icons)

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
    <div className="shrink-0 border-b border-slate-800 bg-slate-950 z-20">
      {/* Main navigation row */}
      <header className="flex items-center justify-between px-5 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tracking-wider text-white font-mono">FATHOM</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-900 text-slate-400 border border-slate-800">
            Explorer
          </span>
        </div>

        {/* Run Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedRunId || ''}
              onChange={(e) => onSelectRun(e.target.value)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded px-3 py-1.5 text-xs font-mono min-w-[340px] focus:outline-none focus:border-violet-500 transition-all"
            >
              <option value="" disabled className="bg-slate-900 text-slate-500">
                Select an agent trace...
              </option>
              {runs.map((run) => (
                <option key={run.id} value={run.id} className="bg-slate-900 text-slate-200">
                  {run.name} ({run.span_count} steps)
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Mode Switch (Clean Segmented Buttons, Zero Emojis) */}
        <div className="flex items-center border border-slate-800 rounded p-0.5 bg-slate-900 font-mono text-xs">
          <button
            onClick={() => mode !== 'non-developer' && onToggleMode()}
            className={`px-3 py-1 rounded transition-colors ${
              mode === 'non-developer'
                ? 'bg-violet-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Simple Mode
          </button>
          <button
            onClick={() => mode !== 'developer' && onToggleMode()}
            className={`px-3 py-1 rounded transition-colors ${
              mode === 'developer'
                ? 'bg-violet-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dev Mode
          </button>
        </div>
      </header>

      {/* Telemetry Summary Bar */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-between px-5 py-1.5 bg-slate-900/60 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-5">
            <div>
              <span>Steps: </span>
              <span className="text-slate-100 font-semibold">{totalSteps}</span>
            </div>

            <div>
              <span>Passed: </span>
              <span className="text-emerald-400 font-semibold">{passCount}</span>
            </div>

            {failCount > 0 && (
              <div>
                <span>Failed: </span>
                <span className="text-rose-400 font-semibold">{failCount}</span>
              </div>
            )}

            {mode === 'developer' && (
              <>
                <div className="h-3 w-px bg-slate-800" />

                <div>
                  <span>Latency: </span>
                  <span className="text-slate-200">
                    {totalLatency < 1000 ? `${totalLatency.toFixed(0)}ms` : `${(totalLatency / 1000).toFixed(2)}s`}
                  </span>
                </div>

                {totalTokens > 0 && (
                  <div>
                    <span>Tokens: </span>
                    <span className="text-slate-200">{totalTokens.toLocaleString()}</span>
                  </div>
                )}

                {totalCost > 0 && (
                  <div>
                    <span>Cost: </span>
                    <span className="text-emerald-400">{formatCost(totalCost)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {failCount > 0 && mode === 'non-developer' && (
            <div className="text-[11px] text-amber-400">
              Click the red failed step below to diagnose & solve with AI
            </div>
          )}

          {mode === 'developer' && selectedRun && (
            <div className="text-[10px] text-slate-500 truncate max-w-xs">
              ID: <span className="font-mono">{selectedRun.id.slice(0, 12)}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
