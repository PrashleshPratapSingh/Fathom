// Advanced React Flow Canvas for Fathom LLM Traces
// Features: Auto-layout (TB/LR), Critical Path highlight, Search-to-focus, and Step-by-Step Replay scrubber

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
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  ArrowDownUp,
  ArrowLeftRight,
  Flame,
  Search,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import SpanNode from './SpanNode';
import type { SpanResponse, ViewMode } from '../types/api';
import { transformToReactFlow, type LayoutDirection, type SpanNodeData } from '../utils/dagTransform';
import type { Edge } from '@xyflow/react';

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
          rfInstance.setCenter(node.position.x + 130, node.position.y + 50, {
            zoom: 1.1,
            duration: 500,
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
      {/* Floating Canvas Top Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-1.5 rounded-xl shadow-2xl">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search spans, models, prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 bg-slate-900/90 border border-slate-700/60 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
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
          title={`Switch layout to ${direction === 'TB' ? 'Horizontal (Left-to-Right)' : 'Vertical (Top-to-Bottom)'}`}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all"
        >
          {direction === 'TB' ? (
            <>
              <ArrowDownUp className="w-3.5 h-3.5 text-violet-400" />
              <span>Vertical</span>
            </>
          ) : (
            <>
              <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>Horizontal</span>
            </>
          )}
        </button>

        {/* Critical Path Bottleneck Highlighter */}
        <button
          onClick={() => setShowCriticalPath((prev) => !prev)}
          title="Highlight latency bottleneck path"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
            showCriticalPath
              ? 'bg-amber-950/60 border-amber-600 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${showCriticalPath ? 'text-amber-400 fill-amber-400/30' : 'text-slate-400'}`} />
          <span>Bottlenecks</span>
        </button>

        {/* Trace Replay Trigger */}
        <button
          onClick={replayStep === null ? handleStartReplay : handleStopReplay}
          title="Replay trace step-by-step"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
            replayStep !== null
              ? 'bg-violet-950/60 border-violet-500 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>{replayStep !== null ? 'Exit Replay' : 'Replay'}</span>
        </button>
      </div>

      {/* Floating Replay Scrubber Bar at Bottom */}
      {replayStep !== null && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/90 backdrop-blur-lg border border-violet-800/60 px-4 py-2.5 rounded-2xl shadow-2xl animate-fade">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setReplayStep(1)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Reset to step 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setReplayStep((s) => Math.max(1, (s ?? 1) - 1))}
              disabled={(replayStep ?? 1) <= 1}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              title="Previous step"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsReplaying((r) => !r)}
              className="p-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg transition-transform hover:scale-105"
              title={isReplaying ? 'Pause' : 'Play'}
            >
              {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={() => setReplayStep((s) => Math.min(totalSteps, (s ?? 1) + 1))}
              disabled={(replayStep ?? 1) >= totalSteps}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              title="Next step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max={totalSteps}
              value={replayStep}
              onChange={(e) => setReplayStep(Number(e.target.value))}
              className="w-40 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
            <span className="text-xs font-mono text-violet-300 font-semibold min-w-[50px] text-right">
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
          className="!bg-slate-950/80 !backdrop-blur !border !border-slate-800/80 !rounded-xl !p-1 !shadow-xl"
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
          className="!bg-slate-950/80 !border !border-slate-800/80 !rounded-xl !shadow-2xl"
          style={{ width: 140, height: 90 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="rgba(148, 163, 184, 0.12)" />
      </ReactFlow>
    </div>
  );
}
