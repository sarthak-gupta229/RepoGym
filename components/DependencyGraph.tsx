'use client';

import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  Node,
  Edge,
  NodeProps,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { DependencyGraph as GraphData, GraphNode } from '@/lib/graph';
import { layout } from '@/lib/layout';

interface FileNodeData extends Record<string, unknown> {
  file: string;
  exports: string[];
  importsCount: number;
  language: string;
  isHighlighted: boolean;
  isSelected: boolean;
}

function FileNodeComponent({ data }: NodeProps<Node<FileNodeData>>) {
  const { file, exports, isHighlighted, isSelected } = data;

  const fileName = file.split('/').pop() || file;
  const dirPath = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';

  return (
    <div
      className={`px-3 py-2 rounded-lg border text-left shadow-sm transition-all duration-150 min-w-[200px] max-w-[260px] bg-white dark:bg-zinc-900 ${
        isHighlighted
          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 ring-2 ring-yellow-400 shadow-yellow-200'
          : isSelected
          ? 'border-blue-500 ring-2 ring-blue-400 dark:border-blue-400'
          : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-zinc-400" />
      
      {dirPath && (
        <div className="text-[10px] text-zinc-600 dark:text-zinc-300 font-mono truncate">
          {dirPath}/
        </div>
      )}
      <div className="font-semibold text-xs font-mono text-zinc-900 dark:text-zinc-100 truncate">
        {fileName}
      </div>

      {exports && exports.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {exports.slice(0, 3).map((exp) => (
            <span
              key={exp}
              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono truncate max-w-[180px]"
            >
              {exp}
            </span>
          ))}
          {exports.length > 3 && (
            <span className="text-[9px] text-zinc-600 dark:text-zinc-300 font-mono">
              +{exports.length - 3}
            </span>
          )}
        </div>
      )}

      {isHighlighted && (
        <div className="mt-1 text-[10px] font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Active topic / Citation
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-zinc-400" />
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNodeComponent,
};

interface DependencyGraphProps {
  graph: GraphData;
  highlight?: string[];
  selectedFile?: string;
  onSelect?: (filePath: string) => void;
  onEdgeClick?: (statement?: string) => void;
  showFlowOnly?: boolean;
  flowFiles?: string[];
}

export function DependencyGraph({
  graph,
  highlight = [],
  selectedFile,
  onSelect,
  onEdgeClick,
  showFlowOnly = false,
  flowFiles = [],
}: DependencyGraphProps) {
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);
  const flowSet = useMemo(() => new Set(flowFiles), [flowFiles]);

  const { initialNodes, initialEdges } = useMemo(() => {
    let filteredNodes = graph.nodes;
    let filteredEdges = graph.edges;

    if (showFlowOnly && flowFiles.length > 0) {
      filteredNodes = filteredNodes.filter((n) => flowSet.has(n.file));
      filteredEdges = filteredEdges.filter(
        (e) => flowSet.has(e.source) && flowSet.has(e.target)
      );
    }

    const positioned = layout(filteredNodes, filteredEdges);

    const rfNodes: Node<FileNodeData>[] = positioned.map((node: GraphNode) => ({
      id: node.id,
      type: 'fileNode',
      position: node.position || { x: 0, y: 0 },
      data: {
        file: node.file,
        exports: node.exports,
        importsCount: node.importsCount,
        language: node.language,
        isHighlighted: highlightSet.has(node.file),
        isSelected: selectedFile === node.file,
      },
    }));

    const rfEdges: Edge[] = filteredEdges.map((edge) => {
      const isConnectedToHighlight =
        highlightSet.has(edge.source) && highlightSet.has(edge.target);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: isConnectedToHighlight,
        data: { statement: edge.statement },
        style: {
          stroke: isConnectedToHighlight ? '#eab308' : '#94a3b8',
          strokeWidth: isConnectedToHighlight ? 2.5 : 1.5,
        },
      };
    });

    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [graph, highlightSet, selectedFile, showFlowOnly, flowSet, flowFiles]);

  const [nodes, setNodes] = React.useState<Node<FileNodeData>[]>(initialNodes);
  const [edges, setEdges] = React.useState<Edge[]>(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodesChange: OnNodesChange<Node<FileNodeData>> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onSelect) {
        onSelect(node.id);
      }
    },
    [onSelect]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const stmt = (edge.data as { statement?: string })?.statement;
      if (onEdgeClick) {
        onEdgeClick(stmt || `${edge.source} -> ${edge.target}`);
      }
    },
    [onEdgeClick]
  );

  return (
    <div className="w-full h-full min-h-[400px] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Controls className="!bg-white dark:!bg-zinc-800 !border-zinc-200 dark:!border-zinc-700 !shadow-sm" />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as FileNodeData;
            return data.isHighlighted ? '#eab308' : '#cbd5e1';
          }}
          className="!bg-white/80 dark:!bg-zinc-900/80 !border-zinc-200 dark:!border-zinc-800 !rounded-lg"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#94a3b8" />
      </ReactFlow>
    </div>
  );
}

