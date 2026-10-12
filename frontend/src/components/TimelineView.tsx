// Timeline / Waterfall Gantt View for Agent Traces — High-Aesthetic Monochrome (Black & White)
// Strict Rule: Zero Emojis, Zero Decorative Icons

import { useMemo, useState } from 'react';
import type { SpanResponse, ViewMode } from '../types/api';
import { formatCost, estimateCost } from '../utils/costEstimator';

interface TimelineViewProps {
  spans: SpanResponse[];
  selectedSpanId: string | null;
  onSelectSpan: (span: SpanResponse) => void;
  mode: ViewMode;
}

const KIND_COLORS: Record<string, { label: string; bar: string; badge: string }> = {
  llm_call: {
    label: 'LLM',
    bar: 'bg-white text-black font-semibold border-white hover:bg-zinc-200',
    badge: 'bg-white/10 text-white border-white/20',
  },
  tool_call: {
    label: 'TOOL',
    bar: 'bg-zinc-300 text-black font-medium border-zinc-200 hover:bg-zinc-200',
    badge: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  },
  retrieval: {
    label: 'RAG',
    bar: 'bg-zinc-400 text-black font-medium border-zinc-300 hover:bg-zinc-300',
    badge: 'bg-zinc-900 text-zinc-200 border-zinc-700',
  },
  processing: {
    label: 'PROCESS',
    bar: 'bg-zinc-600 text-white font-medium border-zinc-500 hover:bg-zinc-500',
    badge: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  },
  agent_decision: {
    label: 'DECIDE',
    bar: 'bg-zinc-500 text-white font-medium border-zinc-400 hover:bg-zinc-400',
    badge: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  },
};

export default function TimelineView({
  spans,
  selectedSpanId,
  onSelectSpan,
  mode,
}: TimelineViewProps) {
  const [hoveredSpanId, setHoveredSpanId] = useState<string | null>(null);

  // Compute waterfall timing offsets
  const { spanTimings, totalDurationMs } = useMemo(() => {
    if (!spans || spans.length === 0) {
      return { spanTimings: [], totalDurationMs: 1 };
    }

    // Sort spans topologically / by creation
    const sorted = [...spans].sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
    });

    const minTimestamp = new Date(sorted[0].created_at).getTime();
    const maxTimestamp = new Date(sorted[sorted.length - 1].created_at).getTime();
    const hasRealisticTimestamps = maxTimestamp - minTimestamp > 10;

    let cumulativeOffset = 0;
    const timings = sorted.map((span, index) => {
      let startOffsetMs = 0;
      if (hasRealisticTimestamps) {
        startOffsetMs = Math.max(0, new Date(span.created_at).getTime() - minTimestamp);
      } else {
        startOffsetMs = cumulativeOffset;
        cumulativeOffset += span.latency_ms;
      }

      return {
        span,
        index: index + 1,
        startOffsetMs,
        latencyMs: Math.max(span.latency_ms, 1),
      };
    });

    const maxEndMs = Math.max(
      ...timings.map((t) => t.startOffsetMs + t.latencyMs),
      cumulativeOffset || 1,
    );

    return {
      spanTimings: timings,
      totalDurationMs: Math.max(maxEndMs, 100),
    };
  }, [spans]);

  const timeTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden font-mono">
      {/* Waterfall Header Controls & Time Axis */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Execution Waterfall
          </span>
          <span className="text-[11px] text-zinc-500">
            Total Duration:{' '}
            <span className="text-white font-medium">
              {totalDurationMs < 1000
                ? `${totalDurationMs.toFixed(0)}ms`
                : `${(totalDurationMs / 1000).toFixed(2)}s`}
            </span>
          </span>
        </div>

        <div className="text-[11px] text-zinc-400">
          Click any step to inspect tokens, prompt, and AI fixes
        </div>
      </div>

      {/* Main Timeline Table */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Time Axis Labels */}
        <div className="flex items-center border-b border-zinc-900 bg-black text-[10px] text-zinc-500 py-1.5 px-6 sticky top-0 z-10">
          <div className="w-80 shrink-0 font-medium text-zinc-400">Step & Span</div>
          <div className="flex-1 relative h-4">
            {timeTicks.map((pct) => {
              const tickMs = totalDurationMs * pct;
              const formattedTick =
                tickMs < 1000 ? `${tickMs.toFixed(0)}ms` : `${(tickMs / 1000).toFixed(2)}s`;
              return (
                <div
                  key={pct}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${pct * 100}%` }}
                >
                  <span>{formattedTick}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-900">
          {spanTimings.map(({ span, index, startOffsetMs, latencyMs }) => {
            const isSelected = span.id === selectedSpanId;
            const isHovered = span.id === hoveredSpanId;
            const isFailed =
              span.status === 'failed' ||
              span.evaluations.some((e) => e.verdict === 'failure');
            const kind = KIND_COLORS[span.kind] || {
              label: span.kind.toUpperCase(),
              bar: 'bg-zinc-600 text-white font-medium border-zinc-500',
              badge: 'bg-zinc-900 text-zinc-400 border-zinc-800',
            };

            const leftPct = (startOffsetMs / totalDurationMs) * 100;
            const widthPct = Math.max((latencyMs / totalDurationMs) * 100, 1.5);
            const cost = estimateCost(span.model_name, span.token_count);

            return (
              <div
                key={span.id}
                onClick={() => onSelectSpan(span)}
                onMouseEnter={() => setHoveredSpanId(span.id)}
                onMouseLeave={() => setHoveredSpanId(null)}
                className={`flex items-center px-6 py-2 transition-all cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-zinc-900 border-l-2 border-white'
                    : isHovered
                    ? 'bg-zinc-900/60'
                    : 'hover:bg-zinc-900/30'
                }`}
              >
                {/* Left Meta Column */}
                <div className="w-80 shrink-0 flex items-center gap-2.5 pr-4">
                  <span className="text-[10px] text-zinc-500 w-5">#{index}</span>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] border font-medium uppercase tracking-wider ${kind.badge}`}
                  >
                    {kind.label}
                  </span>

                  <span
                    className={`truncate font-mono transition-colors flex-1 ${
                      isSelected ? 'text-white font-medium' : 'text-zinc-300'
                    }`}
                    title={span.name}
                  >
                    {span.name}
                  </span>

                  {/* Status dot */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isFailed ? 'bg-rose-400' : 'bg-white'
                    }`}
                  />
                </div>

                {/* Right Waterfall Bar Column */}
                <div className="flex-1 relative h-6 flex items-center">
                  {/* Vertical grid lines */}
                  {timeTicks.map((pct) => (
                    <div
                      key={pct}
                      className="absolute top-0 bottom-0 w-px bg-zinc-900 pointer-events-none"
                      style={{ left: `${pct * 100}%` }}
                    />
                  ))}

                  {/* Latency Bar */}
                  <div
                    className={`absolute h-4 rounded-sm border transition-all duration-150 flex items-center px-1.5 shadow-sm ${
                      isFailed
                        ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                        : `${kind.bar}`
                    }`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '24px',
                    }}
                  >
                    <span className="text-[9px] font-mono whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-sm font-semibold">
                      {latencyMs < 1000 ? `${latencyMs.toFixed(0)}ms` : `${(latencyMs / 1000).toFixed(2)}s`}
                    </span>
                  </div>

                  {/* Extra Dev Mode info to the right of the bar if space permits */}
                  {mode === 'developer' && span.token_count > 0 && (
                    <div
                      className="absolute text-[9px] text-zinc-500 whitespace-nowrap pl-2 pointer-events-none"
                      style={{
                        left: `calc(${leftPct + widthPct}% + 8px)`,
                      }}
                    >
                      {span.token_count.toLocaleString()} tok
                      {cost > 0 && ` • ${formatCost(cost)}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
