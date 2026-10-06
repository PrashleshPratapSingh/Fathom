// Custom span node — Minimalist monochrome design

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { SpanNodeData } from '../utils/dagTransform';

interface SpanNodeProps {
  data: SpanNodeData;
  selected: boolean;
}

const SpanNode = memo(({ data, selected }: SpanNodeProps) => {
  const span = data.span;
  const kindLabel = (data as any).kindLabel as string;
  const mode = (data as any).mode as string;
  const worstVerdict = data.worstVerdict;

  const isFailed = span.status === 'failed' || worstVerdict === 'failure';
  const isWarning = worstVerdict === 'warning';

  // Monochrome border style based on status
  let borderStyle = '1px solid #222222';
  if (selected) {
    borderStyle = '1px solid #ffffff';
  } else if (isFailed) {
    borderStyle = '2px dashed #ffffff';
  } else if (isWarning) {
    borderStyle = '1px dashed #444444';
  }

  return (
    <div
      className="relative px-3 py-2 min-w-[200px] max-w-[240px] transition-all duration-150 cursor-pointer"
      style={{
        background: '#000000',
        border: borderStyle,
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-black !border !border-[#222222] !-top-1" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
          [{kindLabel}]
        </span>
        <span className="text-[9px] font-mono uppercase text-neutral-500">
          {span.status === 'failed' ? '[err]' : span.status === 'rewound' ? '[rw]' : '[ok]'}
        </span>
      </div>

      {/* Name */}
      <div className="text-[11px] font-mono text-white truncate mb-1">
        {span.name}
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500">
        {mode === 'developer' ? (
          <>
            <span>{span.latency_ms.toFixed(0)}ms</span>
            {span.token_count > 0 && <span>{span.token_count}t</span>}
          </>
        ) : (
          <>
            {worstVerdict && (
              <span className="uppercase tracking-wider">
                [{worstVerdict}]
              </span>
            )}
          </>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-black !border !border-[#222222] !-bottom-1" />
    </div>
  );
});

SpanNode.displayName = 'SpanNode';
export default SpanNode;
