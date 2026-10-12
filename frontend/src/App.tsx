// Fathom — Main Application
// High-Aesthetic Monochrome (Black & White Minimalist Design)
// Strict Rule: Zero Emojis, Zero Decorative Icons

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Layers } from 'lucide-react';
import type { RunResponse, DagResponse, SpanResponse, ViewMode } from './types/api';
import { fetchRuns, fetchDag, rewindSpan } from './api/client';
import HeaderBar from './components/HeaderBar';
import TraceSidebar from './components/TraceSidebar';
import DagCanvas from './components/DagCanvas';
import TimelineView from './components/TimelineView';
import NodeInspector from './components/NodeInspector';

export default function App() {
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [dag, setDag] = useState<DagResponse | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<SpanResponse | null>(null);
  const [mode, setMode] = useState<ViewMode>('non-developer'); // Simple Mode by default
  const [activeView, setActiveView] = useState<'graph' | 'timeline'>('graph');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rewinding, setRewinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data);
        if (data.length > 0 && !selectedRunId) {
          setSelectedRunId(data[0].id);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    setLoading(true);
    setSelectedSpan(null);
    setError(null);
    fetchDag(selectedRunId)
      .then((data) => {
        setDag(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedRunId]);

  const handleSelectRun = useCallback((runId: string) => setSelectedRunId(runId), []);
  const handleToggleMode = useCallback(() => setMode((m) => (m === 'developer' ? 'non-developer' : 'developer')), []);
  const handleToggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);
  const handleNodeClick = useCallback((span: SpanResponse) => setSelectedSpan(span), []);
  const handleCloseInspector = useCallback(() => setSelectedSpan(null), []);

  const handleRewind = useCallback(
    async (spanId: string, mutatedInput: Record<string, unknown>) => {
      if (!selectedRunId) return;
      setRewinding(true);
      try {
        const result = await rewindSpan(selectedRunId, {
          span_id: spanId,
          mutated_input: mutatedInput,
          re_execute: true,
        });
        setToastMessage(result.message || 'Rewind executed successfully.');
        setTimeout(() => setToastMessage(null), 4000);
        const updatedDag = await fetchDag(selectedRunId);
        setDag(updatedDag);
        setSelectedSpan(null);
      } catch (err: any) {
        setError(`Rewind failed: ${err.message}`);
      } finally {
        setRewinding(false);
      }
    },
    [selectedRunId],
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-100 overflow-hidden font-sans">
      <HeaderBar
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
        mode={mode}
        onToggleMode={handleToggleMode}
        loading={loading}
        spans={dag?.spans || []}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* Global Notifications */}
      {toastMessage && (
        <div className="bg-zinc-900 border-b border-zinc-700 px-5 py-2 text-xs font-mono text-white flex items-center justify-between shrink-0">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/90 border-b border-rose-800 px-5 py-2 text-xs font-mono text-rose-200 flex items-center gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Workspace Area: Sidebar + Main Content (Graph or Timeline) + Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Runs Browser */}
        <TraceSidebar
          runs={runs}
          selectedRunId={selectedRunId}
          onSelectRun={handleSelectRun}
          isOpen={isSidebarOpen}
          onToggleOpen={handleToggleSidebar}
        />

        {/* Center Main Stage: Graph or Timeline */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
          {dag && dag.spans.length > 0 ? (
            activeView === 'graph' ? (
              <DagCanvas
                spans={dag.spans}
                mode={mode}
                onNodeClick={handleNodeClick}
                selectedSpanId={selectedSpan?.id || null}
              />
            ) : (
              <TimelineView
                spans={dag.spans}
                selectedSpanId={selectedSpan?.id || null}
                onSelectSpan={handleNodeClick}
                mode={mode}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-black">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-zinc-400">Loading trace telemetry...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Layers className="w-8 h-8 text-zinc-700" />
                  <span className="text-xs font-mono text-zinc-500">Select a trace run from the sidebar</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Drawer: Step Inspector & Groq AI Copilot */}
        <NodeInspector
          span={selectedSpan}
          mode={mode}
          onClose={handleCloseInspector}
          onRewind={handleRewind}
          rewinding={rewinding}
        />
      </div>
    </div>
  );
}
