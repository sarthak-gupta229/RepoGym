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
      className={`px-3 py-2 text-left transition-all duration-140 min-w-[210px] max-w-[280px] bg-[#171717] ${
        isSelected
          ? 'border border-[#EDEDED] ring-1 ring-[#EDEDED] bg-[#222222]'
          : isSelectedSource
          ? 'border border-[#E6A360] bg-[#1a1712]'
          : isSelectedTarget
          ? 'border border-[#CE7762] bg-[#1a1412]'
          : isHighlighted
          ? 'border border-[#E6A360] ring-1 ring-[#E6A360] bg-[#1a1610]'
          : 'border border-[#333333] hover:border-[#555555]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !rounded-none !bg-[#555555] hover:!bg-[#EDEDED] !border-0 transition"
      />

      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[9px] font-mono font-medium uppercase px-1 py-0.2 bg-[#262626] border border-[#333333] text-[#EDEDED]">
          {langBadge}
        </span>
        {dirPath && (
          <span className="text-[9px] text-[#A1A1A1] font-mono truncate max-w-[150px]">
            {dirPath}/
          </span>
        )}
      </div>

      <div className="font-mono text-xs font-semibold text-[#EDEDED] truncate">
        {fileName}
      </div>

      {/* Connection counts */}
      <div className="mt-1.5 flex items-center gap-3 text-[9px] text-[#A1A1A1] font-mono">
        <span className="flex items-center gap-1" title="Outgoing imports">
          <span className="text-[#E6A360]">&nearr;</span> {outgoingCount} IMP
        </span>
        <span className="flex items-center gap-1" title="Incoming callers">
          <span className="text-[#CE7762]">&swarr;</span> {incomingCount} CAL
        </span>
      </div>

      {/* Export symbols */}
      {exports && exports.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {exports.slice(0, 3).map((exp) => (
            <span
              key={exp}
              className="text-[9px] px-1 py-0.2 bg-[#000000] border border-[#262626] text-[#A1A1A1] font-mono truncate max-w-[120px]"
            >
              {exp}
            </span>
          ))}
          {exports.length > 3 && (
            <span className="text-[9px] text-[#555555] font-mono">
              +{exports.length - 3}
            </span>
          )}
        </div>
      )}

      {isHighlighted && (
        <div className="mt-1.5 text-[9px] font-mono uppercase tracking-wider text-[#E6A360] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E6A360] animate-pulse" />
          <span>Active Flow Citation</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !rounded-none !bg-[#555555] hover:!bg-[#EDEDED] !border-0 transition"
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

  // Compute nodes and edges
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
          ? '#E6A360' // Amber for outgoing imports
          : '#CE7762' // Coral for incoming callers
        : isConnectedToHighlight
        ? '#E6A360' // Amber for flow citations
        : '#333333'; // Minimal dark border

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
          width: 12,
          height: 12,
          color: strokeColor,
        },
        style: {
          stroke: strokeColor,
          strokeWidth: isConnectedToSelected ? 2 : isConnectedToHighlight ? 1.75 : 1,
          opacity: isDimmed ? 0.2 : 1,
        },
        label: isConnectedToSelected
          ? isSelectedSource
            ? 'IMPORTS'
            : 'CALLER'
          : undefined,
        labelStyle: {
          fill: strokeColor,
          fontWeight: 600,
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
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
    <div className="w-full h-full min-h-[400px] border border-[#262626] bg-[#000000] relative overflow-hidden">
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
        <Controls className="!bg-[#171717] !border-[#262626]" />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as FileNodeData;
            if (data.isSelected) return '#EDEDED';
            if (data.isHighlighted) return '#E6A360';
            return '#262626';
          }}
          className="!bg-[#000000] !border-[#262626]"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#262626" />
      </ReactFlow>
    </div>
  );
}
