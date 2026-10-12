// Collapsible Sidebar for Agent Traces — High-Aesthetic Monochrome (Black & White)
// Strict Rule: Zero Emojis, Zero Decorative Icons

import { useState, useMemo } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RunResponse } from '../types/api';

interface TraceSidebarProps {
  runs: RunResponse[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function TraceSidebar({
  runs,
  selectedRunId,
  onSelectRun,
  isOpen,
  onToggleOpen,
}: TraceSidebarProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'failed' | 'completed'>('all');

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesSearch = run.name.toLowerCase().includes(filterQuery.toLowerCase());
      const isFailed = run.status === 'failed' || run.name.toLowerCase().includes('error') || run.name.toLowerCase().includes('hallucination') || run.name.toLowerCase().includes('bad_decision');
      
      if (!matchesSearch) return false;
      if (statusFilter === 'failed') return isFailed;
      if (statusFilter === 'completed') return !isFailed;
      return true;
    });
  }, [runs, filterQuery, statusFilter]);

  if (!isOpen) {
    return (
      <div className="shrink-0 w-10 border-r border-zinc-800 bg-black flex flex-col items-center py-3 select-none">
        <button
          onClick={onToggleOpen}
          title="Expand Traces Sidebar"
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-8 [writing-mode:vertical-lr] rotate-180 text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
          Traces ({runs.length})
        </div>
      </div>
    );
  }

  return (
    <aside className="shrink-0 w-72 md:w-80 border-r border-zinc-800 bg-black flex flex-col h-full select-none z-10">
      {/* Top Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold tracking-wider text-white uppercase">
            Traces
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
            {runs.length}
          </span>
        </div>
        <button
          onClick={onToggleOpen}
          title="Collapse Sidebar"
          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2.5 border-b border-zinc-900 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter traces..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-white rounded pl-8 pr-7 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Pills (Black & White High Contrast) */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-0.5 rounded transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-black font-semibold'
                : 'text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950'
            }`}
          >
            All ({runs.length})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-2 py-0.5 rounded transition-all ${
              statusFilter === 'failed'
                ? 'bg-white text-black font-semibold'
                : 'text-zinc-400 hover:text-rose-400 border border-zinc-800 bg-zinc-950'
            }`}
          >
            Failed
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-2 py-0.5 rounded transition-all ${
              statusFilter === 'completed'
                ? 'bg-white text-black font-semibold'
                : 'text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950'
            }`}
          >
            OK
          </button>
        </div>
      </div>

      {/* Traces List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {filteredRuns.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-zinc-600">
            No matching traces
          </div>
        ) : (
          filteredRuns.map((run) => {
            const isSelected = run.id === selectedRunId;
            const isFailed = run.status === 'failed' || run.name.toLowerCase().includes('error') || run.name.toLowerCase().includes('hallucination') || run.name.toLowerCase().includes('bad_decision');

            return (
              <button
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className={`w-full text-left p-3 transition-all flex flex-col gap-1.5 relative border-l-2 ${
                  isSelected
                    ? 'border-white bg-zinc-900/90'
                    : 'border-transparent hover:bg-zinc-900/30'
                }`}
              >
                {/* Header row: Status & Step Count */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isFailed ? 'bg-rose-500' : 'bg-white'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-mono uppercase font-medium ${
                        isFailed ? 'text-rose-400' : 'text-zinc-300'
                      }`}
                    >
                      {isFailed ? 'Failed' : 'Completed'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {run.span_count} {run.span_count === 1 ? 'step' : 'steps'}
                  </span>
                </div>

                {/* Run Title */}
                <div
                  className={`text-xs font-mono line-clamp-2 leading-relaxed transition-colors ${
                    isSelected ? 'text-white font-medium' : 'text-zinc-300'
                  }`}
                >
                  {run.name}
                </div>

                {/* Bottom Row: Latency & Tokens */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                  <span>
                    {run.total_latency_ms < 1000
                      ? `${run.total_latency_ms.toFixed(0)}ms`
                      : `${(run.total_latency_ms / 1000).toFixed(2)}s`}
                  </span>
                  {run.total_tokens > 0 && (
                    <span>{run.total_tokens.toLocaleString()} tok</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 flex items-center justify-between bg-black">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="text-zinc-400">Live SQLite</span>
        </span>
        <span className="text-zinc-600">fathom_dev.db</span>
      </div>
    </aside>
  );
}
