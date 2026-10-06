// Custom Span Node for React Flow with modern glassmorphism, kind icons, and rich telemetry pills

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Sparkles,
  Wrench,
  Database,
  Cpu,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Clock,
  Coins,
  Flame,
} from 'lucide-react';
import type { SpanNodeData } from '../utils/dagTransform';
import { formatCost } from '../utils/costEstimator';

interface SpanNodeProps {
  data: SpanNodeData;
  selected: boolean;
}

const KIND_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  llm_call: {
    label: 'LLM',
    icon: Sparkles,
    color: 'text-violet-400',
    bg: 'bg-violet-950/40',
    border: 'border-violet-800/50',
  },
  tool_call: {
    label: 'TOOL',
    icon: Wrench,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-800/50',
  },
  retrieval: {
    label: 'RAG',
    icon: Database,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800/50',
  },
  processing: {
    label: 'PROCESS',
    icon: Cpu,
    color: 'text-slate-400',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/50',
  },
  agent_decision: {
    label: 'DECIDE',
    icon: GitBranch,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40',
    border: 'border-amber-800/50',
  },
};

const SpanNode = memo(({ data, selected }: SpanNodeProps) => {
  const span = data.span;
  const worstVerdict = data.worstVerdict;
  const direction = data.direction || 'TB';
  const stepIndex = data.stepIndex || 1;
  const isCritical = data.isCritical;
  const isDimmed = data.isDimmed;
  const isHighlighted = data.isHighlighted;

  const isFailed = span.status === 'failed' || worstVerdict === 'failure';
  const isWarning = worstVerdict === 'warning';
  const isRewound = span.status === 'rewound';

  const kindConfig = KIND_CONFIG[span.kind] || {
    label: span.kind.toUpperCase(),
    icon: Cpu,
    color: 'text-slate-400',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/50',
  };
  const KindIcon = kindConfig.icon;

  // Handle placement based on DAG direction
  const targetPosition = direction === 'TB' ? Position.Top : Position.Left;
  const sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;

  return (
    <div
      className={`group relative rounded-xl transition-all duration-200 cursor-pointer select-none text-left
        ${direction === 'TB' ? 'w-[260px]' : 'w-[270px]'}
        ${isDimmed ? 'opacity-25 grayscale-[60%]' : 'opacity-100'}
        ${
          selected
            ? 'ring-2 ring-violet-500 shadow-[0_0_24px_rgba(139,92,246,0.35)] bg-slate-900 border-violet-500'
            : isCritical
            ? 'ring-1 ring-amber-500/80 shadow-[0_0_18px_rgba(245,158,11,0.25)] bg-slate-950/95 border-amber-500/70'
            : isFailed
            ? 'ring-1 ring-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.25)] bg-slate-950/95 border-rose-500/70'
            : isWarning
            ? 'ring-1 ring-amber-400/50 bg-slate-950/95 border-amber-500/40'
            : 'bg-slate-950/90 hover:bg-slate-900/90 border-slate-800/90 hover:border-slate-700 shadow-lg'
        }
        ${isHighlighted ? 'ring-2 ring-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : ''}
        border backdrop-blur-md px-3.5 py-3
      `}
    >
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2.5 !h-2.5 !bg-slate-900 !border-2 !border-slate-500 hover:!border-violet-400 transition-colors"
      />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono text-slate-500 font-semibold">#{stepIndex}</span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${kindConfig.bg} ${kindConfig.color} ${kindConfig.border}`}
          >
            <KindIcon className="w-3 h-3" />
            {kindConfig.label}
          </span>
          {span.model_name && (
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800/70 px-1.5 py-0.5 rounded truncate max-w-[85px]">
              {span.model_name.replace('gpt-', '').replace('claude-', '')}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {isCritical && (
            <span title="Critical Path (Latency Bottleneck)" className="text-amber-400 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
            </span>
          )}
          {isFailed ? (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-mono">
              <XCircle className="w-3.5 h-3.5" />
            </span>
          ) : isRewound ? (
            <span className="flex items-center gap-1 text-[10px] text-purple-400 font-mono">
              <RotateCcw className="w-3.5 h-3.5" />
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="flex items-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Span Name */}
      <div className="font-medium text-xs text-slate-100 truncate mb-2 group-hover:text-white transition-colors">
        {span.name}
      </div>

      {/* Metrics Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/60">
        <div className="flex items-center gap-1 text-slate-300">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className={span.latency_ms > 2000 ? 'text-amber-400 font-semibold' : ''}>
            {span.latency_ms < 1000 ? `${span.latency_ms.toFixed(0)}ms` : `${(span.latency_ms / 1000).toFixed(2)}s`}
          </span>
        </div>

        {span.token_count > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{span.token_count.toLocaleString()} tok</span>
          </div>
        )}

        {data.cost > 0 && (
          <div className="flex items-center gap-0.5 text-emerald-400/90" title="Estimated API cost">
            <Coins className="w-2.5 h-2.5" />
            <span>{formatCost(data.cost)}</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2.5 !h-2.5 !bg-slate-900 !border-2 !border-slate-500 hover:!border-violet-400 transition-colors"
      />
    </div>
  );
});

SpanNode.displayName = 'SpanNode';
export default SpanNode;
