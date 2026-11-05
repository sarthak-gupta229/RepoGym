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
  MarkerType,
} from '@xyflow/react';
import { DependencyGraph as GraphData, GraphNode } from '@/lib/graph';
import { layout } from '@/lib/layout';

interface FileNodeData extends Record<string, unknown> {
  file: string;
  exports: string[];
  importsCount: number;
  incomingCount: number;
  outgoingCount: number;
  language: string;
  isHighlighted: boolean;
  isSelected: boolean;
  isSelectedSource?: boolean;
  isSelectedTarget?: boolean;
}

function FileNodeComponent({ data }: NodeProps<Node<FileNodeData>>) {
  const {
    file,
    exports,
    incomingCount,
    outgoingCount,
    language,
    isHighlighted,
    isSelected,
    isSelectedSource,
    isSelectedTarget,
  } = data;

  const fileName = file.split('/').pop() || file;
  const dirPath = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';

  const langBadge =
    language === 'typescript'
      ? 'TS'
      : language === 'typescriptreact'
      ? 'TSX'
      : language === 'javascriptreact'
      ? 'JSX'
      : language === 'python'
      ? 'PY'
      : 'JS';

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl border text-left shadow-sm transition-all duration-150 min-w-[210px] max-w-[280px] bg-white dark:bg-zinc-900 ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-blue-500/20 shadow-md dark:border-blue-400'
          : isSelectedSource
          ? 'border-blue-400 ring-1 ring-blue-400/30 bg-blue-50/40 dark:bg-blue-950/20'
          : isSelectedTarget
          ? 'border-purple-400 ring-1 ring-purple-400/30 bg-purple-50/40 dark:bg-purple-950/20'
          : isHighlighted
          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 ring-2 ring-yellow-400 shadow-yellow-200'
          : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-zinc-400 hover:!bg-blue-500 transition"
      />

      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          {langBadge}
        </span>
        {dirPath && (
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[150px]">
            {dirPath}/
          </span>
        )}
      </div>

      <div className="font-semibold text-xs font-mono text-zinc-900 dark:text-zinc-100 truncate">
        {fileName}
      </div>

      {/* Connection counts */}
      <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
        <span className="flex items-center gap-1" title="Files imported by this file">
          <span className="text-blue-500 font-bold">↗</span> {outgoingCount} imports
        </span>
        <span className="flex items-center gap-1" title="Files that import this file">
          <span className="text-purple-500 font-bold">↙</span> {incomingCount} callers
        </span>
      </div>

      {/* Exports */}
      {exports && exports.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {exports.slice(0, 3).map((exp) => (
            <span
              key={exp}
              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono truncate max-w-[120px]"
            >
              {exp}
            </span>
          ))}
          {exports.length > 3 && (
            <span className="text-[9px] text-zinc-500 font-mono">
              +{exports.length - 3}
            </span>
          )}
        </div>
      )}

      {isHighlighted && (
        <div className="mt-1 text-[10px] font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Active Flow / Citation
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-zinc-400 hover:!bg-blue-500 transition"
      />
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
  // Stable primitive string keys to prevent unnecessary re-computations
  const highlightKey = (highlight || []).join(';');
  const flowFilesKey = (flowFiles || []).join(';');
  const nodesCount = graph?.nodes?.length || 0;
  const edgesCount = graph?.edges?.length || 0;

  const highlightSet = useMemo(() => new Set(highlight || []), [highlightKey]);
  const flowSet = useMemo(() => new Set(flowFiles || []), [flowFilesKey]);

  // Compute incoming and outgoing connection maps
  const { incomingMap, outgoingMap, directTargets, directSources } = useMemo(() => {
    const inc = new Map<string, number>();
    const out = new Map<string, number>();
    const targets = new Set<string>();
    const sources = new Set<string>();

    const safeEdges = graph?.edges || [];
    for (const e of safeEdges) {
      inc.set(e.target, (inc.get(e.target) || 0) + 1);
      out.set(e.source, (out.get(e.source) || 0) + 1);

      if (selectedFile) {
        if (e.source === selectedFile) targets.add(e.target);
        if (e.target === selectedFile) sources.add(e.source);
      }
    }

    return { incomingMap: inc, outgoingMap: out, directTargets: targets, directSources: sources };
  }, [graph?.edges, selectedFile, edgesCount]);

  // Compute nodes and edges directly with useMemo
  const { computedNodes, computedEdges } = useMemo(() => {
    let filteredNodes = graph?.nodes || [];
    let filteredEdges = graph?.edges || [];

    if (showFlowOnly && flowFiles && flowFiles.length > 0) {
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
        exports: node.exports || [],
        importsCount: node.importsCount || 0,
        incomingCount: incomingMap.get(node.file) || 0,
        outgoingCount: outgoingMap.get(node.file) || 0,
        language: node.language || 'javascript',
        isHighlighted: highlightSet.has(node.file),
        isSelected: selectedFile === node.file,
        isSelectedSource: directTargets.has(node.file),
        isSelectedTarget: directSources.has(node.file),
      },
    }));

    const rfEdges: Edge[] = filteredEdges.map((edge) => {
      const isConnectedToSelected =
        selectedFile && (edge.source === selectedFile || edge.target === selectedFile);
      const isSelectedSource = selectedFile && edge.source === selectedFile;
      const isConnectedToHighlight =
        highlightSet.has(edge.source) && highlightSet.has(edge.target);

      const strokeColor = isConnectedToSelected
        ? isSelectedSource
          ? '#3b82f6' // Blue for outgoing imports
          : '#a855f7' // Purple for incoming callers
        : isConnectedToHighlight
        ? '#eab308' // Yellow for flow citations
        : '#94a3b8'; // Default slate

      const isDimmed = Boolean(
        selectedFile && !isConnectedToSelected && !isConnectedToHighlight
      );

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: isConnectedToSelected || isConnectedToHighlight,
        data: {
          statement: edge.statement,
          source: edge.source,
          target: edge.target,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: strokeColor,
        },
        style: {
          stroke: strokeColor,
          strokeWidth: isConnectedToSelected ? 2.5 : isConnectedToHighlight ? 2 : 1.5,
          opacity: isDimmed ? 0.25 : 1,
        },
        label: isConnectedToSelected
          ? isSelectedSource
            ? 'imports'
            : 'imported by'
          : undefined,
        labelStyle: {
          fill: strokeColor,
          fontWeight: 600,
          fontSize: 10,
        },
      };
    });

    return { computedNodes: rfNodes, computedEdges: rfEdges };
  }, [
    graph?.nodes,
    graph?.edges,
    nodesCount,
    edgesCount,
    highlightSet,
    selectedFile,
    showFlowOnly,
    flowSet,
    incomingMap,
    outgoingMap,
    directTargets,
    directSources,
  ]);

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
        onEdgeClick(stmt || `${edge.source} imports ${edge.target}`);
      }
    },
    [onEdgeClick]
  );

  return (
    <div className="w-full h-full min-h-[400px] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 relative">
      <ReactFlow
        nodes={computedNodes}
        edges={computedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2}
      >
        <Controls className="!bg-white dark:!bg-zinc-800 !border-zinc-200 dark:!border-zinc-700 !shadow-sm" />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as FileNodeData;
            if (data.isSelected) return '#3b82f6';
            if (data.isHighlighted) return '#eab308';
            return '#cbd5e1';
          }}
          className="!bg-white/80 dark:!bg-zinc-900/80 !border-zinc-200 dark:!border-zinc-800 !rounded-lg"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#94a3b8" />
      </ReactFlow>
    </div>
  );
}
