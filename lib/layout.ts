import dagre from '@dagrejs/dagre';
import { GraphNode, GraphEdge } from './graph';

export function layout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeWidth = 240,
  nodeHeight = 80
): GraphNode[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) {
      return {
        ...node,
        position: { x: 0, y: 0 },
      };
    }
    return {
      ...node,
      position: {
        x: Math.round(dagreNode.x - nodeWidth / 2),
        y: Math.round(dagreNode.y - nodeHeight / 2),
      },
    };
  });
}

