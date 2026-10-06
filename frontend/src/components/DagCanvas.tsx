// Advanced React Flow Canvas for Fathom LLM Traces
// Clean Minimal Toolbar — Zero Emojis, Zero Clutter

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Play, Pause, SkipBack, SkipForward, RotateCcw, X } from 'lucide-react';

import SpanNode from './SpanNode';
import type { SpanResponse, ViewMode } from '../types/api';
import { transformToReactFlow, type LayoutDirection, type SpanNodeData } from '../utils/dagTransform';

const nodeTypes = { spanNode: SpanNode };

interface DagCanvasProps {
  spans: SpanResponse[];
  mode: ViewMode;
  onNodeClick: (span: SpanResponse) => void;
  selectedSpanId: string | null;
}

export default function DagCanvas({ spans, mode, onNodeClick, selectedSpanId }: DagCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<SpanNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [direction, setDirection] = useState<LayoutDirection>('TB');
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Trace Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const totalSteps = spans.length;
  const replayTimerRef = useRef<number | null>(null);

  // Compute Layout
  useMemo(() => {
    const { nodes: newNodes, edges: newEdges } = transformToReactFlow(spans, mode, direction, {
      searchQuery,
      showCriticalPath,
      replayStep,
    });
    setNodes(newNodes);
    setEdges(newEdges);
  }, [spans, mode, direction, searchQuery, showCriticalPath, replayStep, setNodes, setEdges]);

  // Fit view when spans or direction change
  useEffect(() => {
    if (rfInstance && spans.length > 0) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.35, duration: 400 });
      }, 50);
    }
  }, [spans.length, direction, rfInstance]);

  // Replay Execution Loop
  useEffect(() => {
    if (isReplaying) {
      replayTimerRef.current = window.setInterval(() => {
        setReplayStep((prev) => {
          const current = prev ?? 0;
          if (current >= totalSteps) {
            setIsReplaying(false);
            return totalSteps;
          }
          return current + 1;
        });
      }, 1000);
    } else {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    }

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isReplaying, totalSteps]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const span = spans.find((s) => s.id === node.id);
      if (span) {
        onNodeClick(span);
        if (rfInstance) {
          rfInstance.setCenter(node.position.x + 120, node.position.y + 40, {
            zoom: 1.1,
            duration: 400,
          });
        }
      }
    },
    [spans, onNodeClick, rfInstance],
  );

  const toggleDirection = () => {
    setDirection((d) => (d === 'TB' ? 'LR' : 'TB'));
  };

  const handleStartReplay = () => {
    setReplayStep(1);
    setIsReplaying(true);
  };

  const handleStopReplay = () => {
    setIsReplaying(false);
    setReplayStep(null);
  };

  return (
    <div className="flex-1 h-full relative overflow-hidden bg-[#090b10]">
      {/* Floating Canvas Top Toolbar (Clean, No Emojis, No Clutter) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-950/90 border border-slate-800 p-1.5 rounded-lg shadow-lg">
        {/* Search Input */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Search spans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* Direction Switcher */}
        <button
          onClick={toggleDirection}
          className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all"
        >
          Layout: {direction === 'TB' ? 'Vertical' : 'Horizontal'}
        </button>

        {/* Critical Path Bottleneck Highlighter (Dev Mode feature) */}
        {mode === 'developer' && (
          <button
            onClick={() => setShowCriticalPath((prev) => !prev)}
            className={`px-2.5 py-1 text-xs font-mono rounded border transition-all ${
              showCriticalPath
                ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            Bottlenecks
          </button>
        )}

        {/* Trace Replay Trigger */}
        <button
          onClick={replayStep === null ? handleStartReplay : handleStopReplay}
          className={`px-2.5 py-1 text-xs font-mono rounded border transition-all ${
            replayStep !== null
              ? 'bg-violet-950/60 border-violet-500 text-violet-300'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
        >
          {replayStep !== null ? 'Exit Replay' : 'Replay Trace'}
        </button>
      </div>

      {/* Floating Replay Scrubber Bar at Bottom */}
      {replayStep !== null && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/95 border border-slate-800 px-4 py-2 rounded-xl shadow-xl animate-fade">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setReplayStep(1)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setReplayStep((s) => Math.max(1, (s ?? 1) - 1))}
              disabled={(replayStep ?? 1) <= 1}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              title="Previous"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsReplaying((r) => !r)}
              className="p-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow transition-all"
              title={isReplaying ? 'Pause' : 'Play'}
            >
              {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <button
              onClick={() => setReplayStep((s) => Math.min(totalSteps, (s ?? 1) + 1))}
              disabled={(replayStep ?? 1) >= totalSteps}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              title="Next"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <input
              type="range"
              min="1"
              max={totalSteps}
              value={replayStep}
              onChange={(e) => setReplayStep(Number(e.target.value))}
              className="w-36 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-violet-500"
            />
            <span className="text-xs text-violet-300 font-semibold min-w-[45px] text-right">
              {replayStep} / {totalSteps}
            </span>
          </div>
        </div>
      )}

      {/* Main React Flow Canvas */}
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedSpanId }))}
        edges={edges}
        onInit={(instance) => setRfInstance(instance as unknown as ReactFlowInstance)}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          position="bottom-left"
          className="!bg-slate-950 !border !border-slate-800 !rounded-lg !p-1"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            const kind = data?.span?.kind;
            if (kind === 'llm_call') return '#8b5cf6';
            if (kind === 'tool_call') return '#06b6d4';
            if (kind === 'retrieval') return '#10b981';
            if (kind === 'agent_decision') return '#f59e0b';
            return '#64748b';
          }}
          maskColor="rgba(9, 11, 16, 0.85)"
          className="!bg-slate-950 !border !border-slate-800 !rounded-lg"
          style={{ width: 130, height: 80 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148, 163, 184, 0.08)" />
      </ReactFlow>
    </div>
  );
}
