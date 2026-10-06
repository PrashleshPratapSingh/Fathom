// Fathom — Main Application

import { useState, useEffect, useCallback } from 'react';
import type { RunResponse, DagResponse, SpanResponse, ViewMode } from './types/api';
import { fetchRuns, fetchDag, rewindSpan } from './api/client';
import HeaderBar from './components/HeaderBar';
import DagCanvas from './components/DagCanvas';
import NodeInspector from './components/NodeInspector';

export default function App() {
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [dag, setDag] = useState<DagResponse | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<SpanResponse | null>(null);
  const [mode, setMode] = useState<ViewMode>('developer');
  const [loading, setLoading] = useState(false);
  const [rewinding, setRewinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data);
        if (data.length > 0) setSelectedRunId(data[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    setLoading(true);
    setSelectedSpan(null);
    setError(null);
    fetchDag(selectedRunId)
      .then((data) => { setDag(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [selectedRunId]);

  const handleSelectRun = useCallback((runId: string) => setSelectedRunId(runId), []);
  const handleToggleMode = useCallback(() => setMode((m) => (m === 'developer' ? 'non-developer' : 'developer')), []);
  const handleNodeClick = useCallback((span: SpanResponse) => setSelectedSpan(span), []);
  const handleCloseInspector = useCallback(() => setSelectedSpan(null), []);

  const handleRewind = useCallback(
    async (spanId: string, mutatedInput: Record<string, unknown>) => {
      if (!selectedRunId) return;
      setRewinding(true);
      try {
        const result = await rewindSpan(selectedRunId, { span_id: spanId, mutated_input: mutatedInput, re_execute: true });
        alert(`✅ ${result.message}`);
        const updatedDag = await fetchDag(selectedRunId);
        setDag(updatedDag);
        setSelectedSpan(null);
      } catch (err: any) {
        alert(`❌ Rewind failed: ${err.message}`);
      } finally {
        setRewinding(false);
      }
    },
    [selectedRunId],
  );

  return (
    <>
      <HeaderBar
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
        mode={mode}
        onToggleMode={handleToggleMode}
        loading={loading}
        spans={dag?.spans || []}
      />

      {error && (
        <div className="bg-red-500/5 border-b border-red-500/10 px-5 py-1.5 text-[11px] text-red-400/80">
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {dag && dag.spans.length > 0 ? (
          <DagCanvas
            spans={dag.spans}
            mode={mode}
            onNodeClick={handleNodeClick}
            selectedSpanId={selectedSpan?.id || null}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-fathom-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-white/30">Loading trace...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl opacity-20">🔍</span>
                <span className="text-xs text-white/20">Select a trace run</span>
              </div>
            )}
          </div>
        )}

        <NodeInspector
          span={selectedSpan}
          mode={mode}
          onClose={handleCloseInspector}
          onRewind={handleRewind}
          rewinding={rewinding}
        />
      </div>
    </>
  );
}
