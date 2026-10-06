// Transform flat span list into React Flow nodes + edges
// Supports both Top-to-Bottom (TB) and Left-to-Right (LR) auto-layout with Dagre

import dagre from 'dagre';
import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { SpanResponse, ViewMode, EvaluationVerdict } from '../types/api';
import { KIND_LABELS } from '../types/api';
import { estimateCost } from './costEstimator';

export type LayoutDirection = 'TB' | 'LR';

export interface SpanNodeData {
  label: string;
  span: SpanResponse;
  worstVerdict: EvaluationVerdict | null;
  kindLabel: string;
  mode: ViewMode;
  direction: LayoutDirection;
  stepIndex: number;
  cost: number;
  isCritical: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  activeInReplay?: boolean;
  [key: string]: unknown;
}

function getWorstVerdict(span: SpanResponse): EvaluationVerdict | null {
  if (!span.evaluations || span.evaluations.length === 0) return null;
  const verdicts = span.evaluations.map((e) => e.verdict);
  if (verdicts.includes('failure')) return 'failure';
  if (verdicts.includes('warning')) return 'warning';
  return 'pass';
}

/**
 * Computes critical path nodes (path of spans with highest cumulative latency)
 */
function findCriticalPathIds(spans: SpanResponse[]): Set<string> {
  const spanMap = new Map<string, SpanResponse>(spans.map((s) => [s.id, s]));
  const childrenMap = new Map<string, string[]>();

  for (const span of spans) {
    if (span.parent_span_id) {
      const existing = childrenMap.get(span.parent_span_id) || [];
      existing.push(span.id);
      childrenMap.set(span.parent_span_id, existing);
    }
  }

  // Find root spans (no parent or parent not in spans)
  const rootIds = spans
    .filter((s) => !s.parent_span_id || !spanMap.has(s.parent_span_id))
    .map((s) => s.id);

  // DFS to find path with highest cumulative latency
  let maxPath: string[] = [];
  let maxLatency = -1;

  function dfs(currentId: string, currentPath: string[], currentLatency: number) {
    const span = spanMap.get(currentId);
    if (!span) return;

    const path = [...currentPath, currentId];
    const latency = currentLatency + (span.latency_ms || 0);
    const children = childrenMap.get(currentId) || [];

    if (children.length === 0) {
      if (latency > maxLatency) {
        maxLatency = latency;
        maxPath = path;
      }
      return;
    }

    for (const childId of children) {
      dfs(childId, path, latency);
    }
  }

  for (const rootId of rootIds) {
    dfs(rootId, [], 0);
  }

  return new Set(maxPath);
}

export function transformToReactFlow(
  spans: SpanResponse[],
  mode: ViewMode,
  direction: LayoutDirection = 'TB',
  options?: {
    searchQuery?: string;
    showCriticalPath?: boolean;
    replayStep?: number | null; // active replay step index
  },
): { nodes: Node<SpanNodeData>[]; edges: Edge[] } {
  if (!spans || spans.length === 0) {
    return { nodes: [], edges: [] };
  }

  const { searchQuery = '', showCriticalPath = false, replayStep = null } = options || {};

  // Sort spans chronologically by created_at to assign step indices
  const sortedSpans = [...spans].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const stepIndexMap = new Map<string, number>();
  sortedSpans.forEach((span, idx) => {
    stepIndexMap.set(span.id, idx + 1);
  });

  const criticalPathSet = findCriticalPathIds(spans);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const nodeWidth = direction === 'TB' ? 260 : 270;
  const nodeHeight = direction === 'TB' ? 100 : 96;

  // Build nodes
  const nodes: Node<SpanNodeData>[] = spans.map((span) => {
    const worst = getWorstVerdict(span);
    const step = stepIndexMap.get(span.id) || 1;
    const isCritical = criticalPathSet.has(span.id);
    const cost = estimateCost(span.model_name, span.token_count);

    // Search query match check
    let isHighlighted = false;
    let isDimmed = false;

    if (normalizedQuery) {
      const matchesName = span.name.toLowerCase().includes(normalizedQuery);
      const matchesKind = (KIND_LABELS[span.kind] || span.kind).toLowerCase().includes(normalizedQuery);
      const matchesModel = (span.model_name || '').toLowerCase().includes(normalizedQuery);
      const matchesInput = JSON.stringify(span.input_data || {}).toLowerCase().includes(normalizedQuery);
      const matchesOutput = JSON.stringify(span.output_data || {}).toLowerCase().includes(normalizedQuery);

      if (matchesName || matchesKind || matchesModel || matchesInput || matchesOutput) {
        isHighlighted = true;
      } else {
        isDimmed = true;
      }
    }

    // Replay mode dimming
    const activeInReplay = replayStep !== null ? step <= replayStep : true;
    if (replayStep !== null && step > replayStep) {
      isDimmed = true;
    }

    return {
      id: span.id,
      type: 'spanNode',
      position: { x: 0, y: 0 },
      data: {
        label: span.name,
        span,
        worstVerdict: worst,
        kindLabel: KIND_LABELS[span.kind] || span.kind,
        mode,
        direction,
        stepIndex: step,
        cost,
        isCritical: showCriticalPath && isCritical,
        isHighlighted,
        isDimmed,
        activeInReplay,
      },
    };
  });

  // Build edges
  const edges: Edge[] = [];
  for (const span of spans) {
    if (span.parent_span_id) {
      const isParentCritical = criticalPathSet.has(span.parent_span_id);
      const isSpanCritical = criticalPathSet.has(span.id);
      const isEdgeCritical = showCriticalPath && isParentCritical && isSpanCritical;

      const parentStep = stepIndexMap.get(span.parent_span_id) || 1;
      const childStep = stepIndexMap.get(span.id) || 1;
      const isEdgeActiveInReplay = replayStep === null || (parentStep <= replayStep && childStep <= replayStep);

      const edgeColor = isEdgeCritical
        ? '#f59e0b' // Amber glow
        : isEdgeActiveInReplay
        ? '#475569' // Slate active
        : '#1e293b'; // Dimmed

      edges.push({
        id: `${span.parent_span_id}-${span.id}`,
        source: span.parent_span_id,
        target: span.id,
        type: 'smoothstep',
        animated: isEdgeCritical || span.status === 'running',
        style: {
          stroke: edgeColor,
          strokeWidth: isEdgeCritical ? 2.5 : 1.5,
          opacity: isEdgeActiveInReplay ? 1 : 0.25,
          filter: isEdgeCritical ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: edgeColor,
        },
      });
    }
  }

  // Dagre layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === 'TB' ? 50 : 60,
    ranksep: direction === 'TB' ? 80 : 90,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Apply computed positions
  for (const node of nodes) {
    const pos = g.node(node.id);
    if (pos) {
      node.position = {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      };
    }
  }

  return { nodes, edges };
}
