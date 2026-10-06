// DAG Canvas with improved edge styling

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SpanNode from './SpanNode';
import type { SpanResponse, ViewMode } from '../types/api';
import { transformToReactFlow } from '../utils/dagTransform';

const nodeTypes = { spanNode: SpanNode };

interface DagCanvasProps {
  spans: SpanResponse[];
  mode: ViewMode;
  onNodeClick: (span: SpanResponse) => void;
  selectedSpanId: string | null;
}

export default function DagCanvas({ spans, mode, onNodeClick, selectedSpanId }: DagCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useMemo(() => {
    const { nodes: newNodes, edges: newEdges } = transformToReactFlow(spans, mode);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [spans, mode, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const span = spans.find((s) => s.id === node.id);
      if (span) onNodeClick(span);
    },
    [spans, onNodeClick],
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedSpanId }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 2 },
        }}
      >
        <Controls position="bottom-left" />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            return data?.nodeColor || '#6B7280';
          }}
          maskColor="rgba(9, 11, 16, 0.8)"
          style={{ borderRadius: 12 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={24} size={0.5} color="rgba(124,92,252,0.06)" />
      </ReactFlow>
    </div>
  );
}
