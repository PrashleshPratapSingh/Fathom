// Transform flat span list into React Flow nodes + edges
// Layout is strictly vertical (Top-to-Bottom)

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { SpanResponse, ViewMode, EvaluationVerdict } from '../types/api';
import { KIND_LABELS } from '../types/api';

export interface SpanNodeData {
  label: string;
  span: SpanResponse;
  worstVerdict: EvaluationVerdict | null;
  [key: string]: unknown;
}

function getWorstVerdict(span: SpanResponse): EvaluationVerdict | null {
  if (!span.evaluations || span.evaluations.length === 0) return null;
  const verdicts = span.evaluations.map(e => e.verdict);
  if (verdicts.includes('failure')) return 'failure';
  if (verdicts.includes('warning')) return 'warning';
  return 'pass';
}

export function transformToReactFlow(
  spans: SpanResponse[],
  mode: ViewMode,
): { nodes: Node<SpanNodeData>[]; edges: Edge[] } {
  const nodes: Node<SpanNodeData>[] = [];
  const edges: Edge[] = [];

  // Build nodes
  for (const span of spans) {
    const worst = getWorstVerdict(span);

    nodes.push({
      id: span.id,
      type: 'spanNode',
      position: { x: 0, y: 0 },
      data: {
        label: span.name,
        span,
        worstVerdict: worst,
        kindLabel: KIND_LABELS[span.kind] || span.kind,
        mode,
      },
    });
  }

  // Build edges - simple thin grey lines
  for (const span of spans) {
    if (span.parent_span_id) {
      edges.push({
        id: `${span.parent_span_id}-${span.id}`,
        source: span.parent_span_id,
        target: span.id,
        style: {
          stroke: '#222222',
          strokeWidth: 1,
        },
      });
    }
  }

  // Auto-layout with dagre (Strict Top-to-Bottom)
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });

  for (const node of nodes) {
    g.setNode(node.id, { width: 200, height: 70 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Apply dagre positions
  for (const node of nodes) {
    const pos = g.node(node.id);
    node.position = {
      x: pos.x - 100, // center
      y: pos.y - 35,  // center
    };
  }

  return { nodes, edges };
}
