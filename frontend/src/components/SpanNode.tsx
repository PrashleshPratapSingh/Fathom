// Custom Span Node — High-Aesthetic Monochrome (Black & White Minimalist Design)
// Strict Rule: Zero Emojis, Zero Decorative Icons

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { SpanNodeData } from '../utils/dagTransform';
import { formatCost } from '../utils/costEstimator';

interface SpanNodeProps {
  data: SpanNodeData;
  selected: boolean;
}

const KIND_CONFIG: Record<
  string,
  { label: string; text: string; bg: string; border: string; accentBorder: string }
> = {
  llm_call: {
    label: 'LLM',
    text: 'text-white',
    bg: 'bg-white/10',
    border: 'border-white/20',
    accentBorder: 'border-t-white',
  },
  tool_call: {
    label: 'TOOL',
    text: 'text-zinc-300',
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    accentBorder: 'border-t-zinc-400',
  },
  retrieval: {
    label: 'RAG',
    text: 'text-zinc-200',
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    accentBorder: 'border-t-zinc-300',
  },
  processing: {
    label: 'PROCESS',
    text: 'text-zinc-400',
    bg: 'bg-zinc-900',
    border: 'border-zinc-800',
    accentBorder: 'border-t-zinc-600',
  },
  agent_decision: {
    label: 'DECIDE',
    text: 'text-zinc-300',
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    accentBorder: 'border-t-zinc-500',
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

  const isRewound = span.status === 'rewound';
  const isFailed = (span.status === 'failed' || worstVerdict === 'failure') && !isRewound;
  const isWarning = worstVerdict === 'warning' && !isRewound;

  const kind = KIND_CONFIG[span.kind] || {
    label: span.kind.toUpperCase(),
    text: 'text-zinc-300',
    bg: 'bg-zinc-900',
    border: 'border-zinc-800',
    accentBorder: 'border-t-zinc-500',
  };

  const targetPosition = direction === 'TB' ? Position.Top : Position.Left;
  const sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;

  return (
    <div
      className={`group relative rounded-md transition-all duration-150 cursor-pointer select-none text-left
        ${direction === 'TB' ? 'w-[240px]' : 'w-[250px]'}
        ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}
        ${
          selected
            ? 'ring-1 ring-white bg-zinc-900 border-white shadow-xl shadow-white/5'
            : isCritical && mode === 'developer'
            ? 'ring-1 ring-zinc-400 bg-zinc-950 border-zinc-500'
            : isFailed
            ? 'ring-1 ring-rose-500/80 bg-zinc-950 border-rose-500/80'
            : isRewound
            ? 'ring-1 ring-white/50 bg-zinc-950 border-zinc-700'
            : isWarning
            ? 'ring-1 ring-zinc-500 bg-zinc-950 border-zinc-600'
            : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        }
        ${isHighlighted ? 'ring-1 ring-white' : ''}
        border border-t-2 ${isFailed ? '!border-t-rose-500' : isRewound ? '!border-t-white' : kind.accentBorder}
        px-3.5 py-3 shadow-md
      `}
    >
      {/* React Flow Handles (Minimal Monochrome) */}
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2 !h-2 !bg-black !border !border-zinc-600 hover:!border-white transition-colors"
      />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono text-zinc-500">#{stepIndex}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border uppercase tracking-wider ${kind.bg} ${kind.text} ${kind.border}`}
          >
            {kind.label}
          </span>
          {mode === 'developer' && span.model_name && (
            <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded truncate max-w-[80px]">
              {span.model_name.replace('gpt-', '').replace('claude-', '')}
            </span>
          )}
        </div>

        {/* Minimal dot status indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isFailed ? (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>Failed</span>
            </span>
          ) : isRewound ? (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>Healed</span>
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Warning</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>OK</span>
            </span>
          )}
        </div>
      </div>

      {/* Span Name */}
      <div className="font-mono text-xs text-zinc-200 truncate mb-2 group-hover:text-white transition-colors font-medium">
        {span.name}
      </div>

      {/* Footer */}
      {mode === 'developer' ? (
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-800/80">
          <span className="text-zinc-300 font-medium">
            {span.latency_ms < 1000 ? `${span.latency_ms.toFixed(0)}ms` : `${(span.latency_ms / 1000).toFixed(2)}s`}
          </span>

          {span.token_count > 0 && <span>{span.token_count.toLocaleString()} tok</span>}

          {data.cost > 0 && <span className="text-zinc-200">{formatCost(data.cost)}</span>}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
          {isFailed ? (
            <span className="text-rose-400 font-medium">Click to solve with AI</span>
          ) : isRewound ? (
            <span className="text-white font-medium">Healed with AI</span>
          ) : (
            <span className="text-zinc-500">Completed</span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2 !h-2 !bg-black !border !border-zinc-600 hover:!border-white transition-colors"
      />
    </div>
  );
});

SpanNode.displayName = 'SpanNode';
export default SpanNode;
