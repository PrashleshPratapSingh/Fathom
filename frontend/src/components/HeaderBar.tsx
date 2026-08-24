// Header bar — Monochrome design

import type { RunResponse, ViewMode, SpanResponse } from '../types/api';

interface HeaderBarProps {
  runs: RunResponse[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  mode: ViewMode;
  onToggleMode: () => void;
  loading: boolean;
  spans: SpanResponse[];
}

export default function HeaderBar({ runs, selectedRunId, onSelectRun, mode, onToggleMode, loading, spans }: HeaderBarProps) {
  const totalSteps = spans.length;
  const passCount = spans.filter(s => s.status === 'completed' && !s.evaluations.some(e => e.verdict === 'failure')).length;
  const failCount = spans.filter(s => s.status === 'failed' || s.evaluations.some(e => e.verdict === 'failure')).length;
  const totalLatency = spans.reduce((sum, s) => sum + s.latency_ms, 0);

  return (
    <div className="shrink-0 border-b border-[#222222]">
      {/* Main header */}
      <header className="flex items-center justify-between px-4 py-2 bg-black">
        {/* Title */}
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-mono font-bold tracking-widest text-white uppercase">
            FATHOM
          </h1>
        </div>

        {/* Run selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedRunId || ''}
            onChange={(e) => onSelectRun(e.target.value)}
            className="bg-black border border-[#222222] text-neutral-400 rounded px-2.5 py-1 text-[11px] font-mono min-w-[280px] focus:outline-none focus:border-white transition-all"
          >
            <option value="" disabled style={{ background: '#000000', color: '#666666' }}>Select a run...</option>
            {runs.map((run) => (
              <option
                key={run.id}
                value={run.id}
                style={{ background: '#000000', color: '#ffffff' }}
              >
                {run.name.toUpperCase()} [{run.span_count} STEPS]
              </option>
            ))}
          </select>

          {loading && (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMode}
            className="px-2 py-0.5 border border-[#222222] hover:border-white text-[10px] font-mono text-neutral-400 hover:text-white uppercase transition-all"
          >
            {mode === 'developer' ? 'dev mode' : 'simple mode'}
          </button>
        </div>
      </header>

      {/* Stats bar */}
      {totalSteps > 0 && (
        <div className="flex items-center gap-5 px-4 py-1.5 bg-black text-[10px] font-mono text-neutral-500">
          <div>
            STEPS: <span className="text-white">{totalSteps}</span>
          </div>
          <div>
            OK: <span className="text-white">{passCount}</span>
          </div>
          {failCount > 0 && (
            <div>
              ERR: <span className="text-white">{failCount}</span>
            </div>
          )}
          <div className="w-px h-2.5 bg-[#222222]"></div>
          <div>
            TIME: <span className="text-white">{totalLatency.toFixed(0)}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}
