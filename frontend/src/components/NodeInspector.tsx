// Node Inspector — Monochrome minimal side panel

import { useState } from 'react';
import type { SpanResponse, ViewMode, EvaluationResponse } from '../types/api';
import { KIND_LABELS } from '../types/api';

interface NodeInspectorProps {
  span: SpanResponse | null;
  mode: ViewMode;
  onClose: () => void;
  onRewind: (spanId: string, mutatedInput: Record<string, unknown>) => void;
  rewinding: boolean;
}

function EvalCard({ evaluation, mode }: { evaluation: EvaluationResponse; mode: ViewMode }) {
  const phaseLabels: Record<string, string> = {
    tool_check: 'tool check',
    semantic_drift: 'drift check',
    judge_llm: 'assessment',
  };

  return (
    <div className="p-3 border border-[#222222] bg-black">
      <div className="flex items-center justify-between mb-1 text-[10px] font-mono">
        <span className="text-neutral-500">{phaseLabels[evaluation.phase] || evaluation.phase}</span>
        <span className={evaluation.verdict === 'failure' ? 'text-white underline font-bold' : 'text-neutral-400'}>
          [{evaluation.verdict.toUpperCase()}]
        </span>
      </div>

      {mode === 'non-developer' && evaluation.summary && (
        <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">{evaluation.summary}</p>
      )}

      {mode === 'developer' && (
        <pre className="text-[10px] font-mono text-neutral-500 bg-black overflow-x-auto max-h-24 overflow-y-auto">
          {JSON.stringify(evaluation.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function NodeInspector({ span, mode, onClose, onRewind, rewinding }: NodeInspectorProps) {
  const [editInput, setEditInput] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);

  if (!span) return null;

  const kindLabel = KIND_LABELS[span.kind] || span.kind;
  const canRewind = span.status === 'failed' || span.status === 'completed';

  const handleRewind = () => {
    try {
      const parsed = JSON.parse(editInput);
      onRewind(span.id, parsed);
      setShowEditForm(false);
      setEditInput('');
    } catch {
      alert('Invalid JSON.');
    }
  };

  const handleOpenEdit = () => {
    setEditInput(JSON.stringify(span.input_data, null, 2));
    setShowEditForm(true);
  };

  return (
    <div className="w-[360px] bg-black border-l border-[#222222] flex flex-col h-full overflow-hidden shrink-0 animate-fade">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222222]">
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-mono font-bold text-white uppercase truncate">{span.name}</h2>
          <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-neutral-500">
            <span>[{kindLabel}]</span>
            <span>•</span>
            <span className={span.status === 'failed' ? 'text-white underline' : 'text-neutral-400'}>
              {span.status.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-white font-mono text-xs"
        >
          [CLOSE]
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Stats grid (dev mode) */}
        {mode === 'developer' && (
          <div className="grid grid-cols-3 gap-2 border-b border-[#222222] pb-4">
            {[
              { label: 'time', value: `${span.latency_ms.toFixed(0)}ms` },
              { label: 'tokens', value: span.token_count.toString() },
              { label: 'model', value: span.model_name || '—' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xs font-mono font-bold text-white">{stat.value}</div>
                <div className="text-[8px] font-mono text-neutral-500 uppercase mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Status card (non-dev) */}
        {mode === 'non-developer' && (
          <div className="border border-[#222222] p-3 text-[11px] font-mono">
            {span.status === 'failed' ? (
              <div className="text-white">
                <span className="font-bold">[ERR]</span> This step failed.
                {span.error_message && (
                  <p className="text-neutral-500 mt-1 line-clamp-2">{span.error_message.split('\n').pop()}</p>
                )}
              </div>
            ) : span.status === 'rewound' ? (
              <div className="text-neutral-400">
                <span>[RW]</span> Rewound with modified input
              </div>
            ) : (
              <div className="text-neutral-400">
                <span>[OK]</span> Completed successfully
              </div>
            )}
          </div>
        )}

        {/* Error (dev mode) */}
        {span.error_message && mode === 'developer' && (
          <div>
            <h3 className="text-[9px] font-mono text-neutral-500 mb-1 uppercase tracking-wider">Error Details</h3>
            <pre className="text-[10px] font-mono text-white bg-black border border-[#222222] p-2.5 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
              {span.error_message}
            </pre>
          </div>
        )}

        {/* Input */}
        <div>
          <h3 className="text-[9px] font-mono text-neutral-500 mb-1 uppercase tracking-wider">
            {mode === 'developer' ? 'Input JSON' : 'Input Context'}
          </h3>
          <pre className="text-[10px] font-mono text-neutral-400 bg-black border border-[#222222] p-2.5 overflow-x-auto max-h-36 overflow-y-auto">
            {JSON.stringify(span.input_data, null, 2)}
          </pre>
        </div>

        {/* Output */}
        <div>
          <h3 className="text-[9px] font-mono text-neutral-500 mb-1 uppercase tracking-wider">
            {mode === 'developer' ? 'Output JSON' : 'Output Result'}
          </h3>
          <pre className="text-[10px] font-mono text-neutral-400 bg-black border border-[#222222] p-2.5 overflow-x-auto max-h-36 overflow-y-auto">
            {Object.keys(span.output_data).length > 0
              ? JSON.stringify(span.output_data, null, 2)
              : '(no output data)'}
          </pre>
        </div>

        {/* Evaluations */}
        {span.evaluations.length > 0 && (
          <div>
            <h3 className="text-[9px] font-mono text-neutral-500 mb-1.5 uppercase tracking-wider">
              {mode === 'developer' ? 'System Evaluations' : 'Analysis'}
            </h3>
            <div className="space-y-2">
              {span.evaluations.map((ev) => (
                <EvalCard key={ev.id} evaluation={ev} mode={mode} />
              ))}
            </div>
          </div>
        )}

        {/* Rewind */}
        {canRewind && (
          <div className="border-t border-[#222222] pt-4">
            {!showEditForm ? (
              <button
                onClick={handleOpenEdit}
                className="w-full py-2 border border-[#222222] hover:border-white text-xs font-mono text-white bg-black transition-all"
              >
                [MUTATE INPUT & RE-RUN]
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  className="w-full h-32 bg-black border border-[#222222] text-white rounded p-2 text-[10px] font-mono focus:outline-none focus:border-white resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRewind}
                    disabled={rewinding}
                    className="flex-1 py-1.5 border border-white text-black bg-white font-mono text-xs hover:bg-neutral-200 transition-all"
                  >
                    {rewinding ? '[REWINDING...]' : '[EXECUTE REWIND]'}
                  </button>
                  <button
                    onClick={() => setShowEditForm(false)}
                    className="px-3 py-1.5 border border-[#222222] hover:border-white text-neutral-500 hover:text-white bg-black font-mono text-xs transition-all"
                  >
                    [CANCEL]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
