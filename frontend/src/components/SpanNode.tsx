// Custom Span Node — Clean, Minimal, Enterprise Design (Zero Emojis, Zero Decorative Icons)

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { SpanNodeData } from '../utils/dagTransform';
import { formatCost } from '../utils/costEstimator';

interface SpanNodeProps {
  data: SpanNodeData;
  selected: boolean;
}

const KIND_COLORS: Record<string, { label: string; text: string; bg: string; border: string }> = {
  llm_call: {
    label: 'LLM',
    text: 'text-violet-300',
    bg: 'bg-violet-950/40',
    border: 'border-violet-800/60',
  },
  tool_call: {
    label: 'TOOL',
    text: 'text-cyan-300',
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-800/60',
  },
  retrieval: {
    label: 'RAG',
    text: 'text-emerald-300',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800/60',
  },
  processing: {
    label: 'PROCESS',
    text: 'text-slate-300',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/60',
  },
  agent_decision: {
    label: 'DECIDE',
    text: 'text-amber-300',
    bg: 'bg-amber-950/40',
    border: 'border-amber-800/60',
  },
};

const SpanNode = memo(({ data, selected }: SpanNodeProps) => {
  const span = data.span;
  const worstVerdict = data.worstVerdict;
  const direction = data.direction || 'TB';
  const stepIndex = data.stepIndex || 1;
  const mode = data.mode || 'non-developer';
  const isCritical = data.isCritical;
  const isDimmed = data.isDimmed;
  const isHighlighted = data.isHighlighted;

  const isFailed = span.status === 'failed' || worstVerdict === 'failure';
  const isWarning = worstVerdict === 'warning';
  const isRewound = span.status === 'rewound';

  const kind = KIND_COLORS[span.kind] || {
    label: span.kind.toUpperCase(),
    text: 'text-slate-300',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/60',
  };

  const targetPosition = direction === 'TB' ? Position.Top : Position.Left;
  const sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;

  return (
    <div
      className={`group relative rounded-lg transition-all duration-150 cursor-pointer select-none text-left
        ${direction === 'TB' ? 'w-[240px]' : 'w-[250px]'}
        ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}
        ${
          selected
            ? 'ring-1 ring-violet-400 bg-slate-900 border-violet-400 shadow-lg shadow-violet-950/50'
            : isCritical && mode === 'developer'
            ? 'ring-1 ring-amber-500/80 bg-slate-950 border-amber-500/80'
            : isFailed
            ? 'ring-1 ring-rose-500/80 bg-slate-950 border-rose-500/80'
            : isWarning
            ? 'ring-1 ring-amber-500/50 bg-slate-950 border-amber-500/50'
            : 'bg-slate-950 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
        }
        ${isHighlighted ? 'ring-1 ring-indigo-400' : ''}
        border px-3.5 py-3
      `}
    >
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2 !h-2 !bg-slate-900 !border !border-slate-500 hover:!border-violet-400 transition-colors"
      />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono text-slate-500">#{stepIndex}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border uppercase tracking-wider ${kind.bg} ${kind.text} ${kind.border}`}
          >
            {kind.label}
          </span>
          {mode === 'developer' && span.model_name && (
            <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded truncate max-w-[80px]">
              {span.model_name.replace('gpt-', '').replace('claude-', '')}
            </span>
          )}
        </div>

        {/* Minimal dot status indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isFailed ? (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Failed</span>
            </span>
          ) : isRewound ? (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Rewound</span>
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Warning</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>OK</span>
            </span>
          )}
        </div>
      </div>

      {/* Span Name */}
      <div className="font-mono text-xs text-slate-200 truncate mb-2 group-hover:text-white transition-colors">
        {span.name}
      </div>

      {/* Footer */}
      {mode === 'developer' ? (
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/80">
          <span className={span.latency_ms > 2000 ? 'text-amber-400' : 'text-slate-400'}>
            {span.latency_ms < 1000 ? `${span.latency_ms.toFixed(0)}ms` : `${(span.latency_ms / 1000).toFixed(2)}s`}
          </span>

          {span.token_count > 0 && <span>{span.token_count.toLocaleString()} tok</span>}

          {data.cost > 0 && <span className="text-emerald-400">{formatCost(data.cost)}</span>}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
          {isFailed ? (
            <span className="text-rose-400">Click to solve with AI</span>
          ) : (
            <span className="text-slate-500">Completed</span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2 !h-2 !bg-slate-900 !border !border-slate-500 hover:!border-violet-400 transition-colors"
      />
    </div>
  );
});

SpanNode.displayName = 'SpanNode';
export default SpanNode;
