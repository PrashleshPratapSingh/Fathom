// Header bar — High-Aesthetic Monochrome (Black & White Minimalist Design)
// Strict Rule: Zero Emojis, Zero Decorative Icons

import type { RunResponse, ViewMode, SpanResponse } from '../types/api';
import { estimateCost, formatCost } from '../utils/costEstimator';
import { PanelLeftClose, PanelLeft, GitBranch, AlignLeft } from 'lucide-react';

interface HeaderBarProps {
  runs: RunResponse[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  mode: ViewMode;
  onToggleMode: () => void;
  loading: boolean;
  spans: SpanResponse[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeView: 'graph' | 'timeline';
  onChangeView: (view: 'graph' | 'timeline') => void;
}

export default function HeaderBar({
  runs,
  selectedRunId,
  mode,
  onToggleMode,
  loading,
  spans,
  isSidebarOpen,
  onToggleSidebar,
  activeView,
  onChangeView,
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
    <div className="shrink-0 border-b border-zinc-800 bg-black z-20 select-none">
      {/* Main navigation row */}
      <header className="flex items-center justify-between px-4 py-2.5">
        {/* Left: Sidebar Toggle + Brand + Current Run Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Hide Traces Sidebar' : 'Show Traces Sidebar'}
            className={`p-1.5 rounded border transition-all flex items-center gap-1.5 font-mono text-xs ${
              isSidebarOpen
                ? 'bg-zinc-900 border-zinc-700 text-white'
                : 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-3.5 h-3.5" />
            ) : (
              <PanelLeft className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Traces</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wider text-white font-mono">FATHOM</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
              Agent Observability
            </span>
          </div>

          {selectedRun && (
            <div className="hidden lg:flex items-center gap-2 border-l border-zinc-800 pl-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Trace:
              </span>
              <span className="text-xs font-mono text-zinc-200 truncate max-w-sm">
                {selectedRun.name}
              </span>
            </div>
          )}

          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {/* Center: Graph vs Timeline View Switcher (Black & White Pill Toggle) */}
        <div className="flex items-center border border-zinc-800 rounded-md p-0.5 bg-zinc-950 font-mono text-xs">
          <button
            onClick={() => onChangeView('graph')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 ${
              activeView === 'graph'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Graph</span>
          </button>
          <button
            onClick={() => onChangeView('timeline')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 ${
              activeView === 'timeline'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
        </div>

        {/* Right: Mode Switch (Simple Mode vs Dev Mode - High Contrast) */}
        <div className="flex items-center border border-zinc-800 rounded-md p-0.5 bg-zinc-950 font-mono text-xs">
          <button
            onClick={() => mode !== 'non-developer' && onToggleMode()}
            className={`px-3 py-1 rounded transition-all ${
              mode === 'non-developer'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Simple Mode
          </button>
          <button
            onClick={() => mode !== 'developer' && onToggleMode()}
            className={`px-3 py-1 rounded transition-all ${
              mode === 'developer'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Dev Mode
          </button>
        </div>
      </header>

      {/* Telemetry Summary Bar */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-between px-5 py-1.5 bg-zinc-950 border-t border-zinc-900 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-5">
            <div>
              <span>Steps: </span>
              <span className="text-white font-semibold">{totalSteps}</span>
            </div>

            <div>
              <span>Passed: </span>
              <span className="text-zinc-200 font-semibold">{passCount}</span>
            </div>

            {failCount > 0 && (
              <div>
                <span>Failed: </span>
                <span className="text-rose-400 font-semibold">{failCount}</span>
              </div>
            )}

            {mode === 'developer' && (
              <>
                <div className="h-3 w-px bg-zinc-800" />

                <div>
                  <span>Latency: </span>
                  <span className="text-zinc-200">
                    {totalLatency < 1000 ? `${totalLatency.toFixed(0)}ms` : `${(totalLatency / 1000).toFixed(2)}s`}
                  </span>
                </div>

                {totalTokens > 0 && (
                  <div>
                    <span>Tokens: </span>
                    <span className="text-zinc-200">{totalTokens.toLocaleString()}</span>
                  </div>
                )}

                {totalCost > 0 && (
                  <div>
                    <span>Cost: </span>
                    <span className="text-zinc-200">{formatCost(totalCost)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {failCount > 0 && mode === 'non-developer' && (
            <div className="text-[11px] text-zinc-300">
              Click the failed step below to diagnose & solve with AI
            </div>
          )}

          {mode === 'developer' && selectedRun && (
            <div className="text-[10px] text-zinc-500 truncate max-w-xs">
              ID: <span className="font-mono">{selectedRun.id.slice(0, 12)}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
