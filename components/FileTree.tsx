'use client';

import React, { useState, useMemo } from 'react';

export interface FileTreeNode {
  id: string; // full path
  name: string; // file or folder name
  path: string; // full path
  isFolder: boolean;
  children?: FileTreeNode[];
  extension?: string;
}

interface FileTreeProps {
  files: string[]; // list of file paths
  selectedFile?: string;
  onSelectFile: (filePath: string) => void;
  highlightFiles?: string[];
  rootName?: string;
  connectionCounts?: Record<string, { imports: number; callers: number }>;
}

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: { children: FileTreeNode[] } = { children: [] };

  for (const p of paths) {
    const parts = p.split('/').filter(Boolean);
    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          id: currentPath,
          name: part,
          path: currentPath,
          isFolder: !isFile,
          children: isFile ? undefined : [],
          extension: isFile ? part.split('.').pop()?.toLowerCase() : undefined,
        };
        current.children.push(child);
      }
      current = child as { children: FileTreeNode[] };
    }
  }

  // Sort: folders first, then files alphabetically
  function sortNodes(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      return a.isFolder ? -1 : 1;
    });
    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  }

  sortNodes(root.children);
  return root.children;
}

function FileOrFolderIcon({
  node,
  isOpen,
}: {
  node: FileTreeNode;
  isOpen?: boolean;
}) {
  if (node.isFolder) {
    return (
      <span className="text-[10px] text-[#A1A1A1] font-mono select-none">
        {isOpen ? '[-]' : '[+]'}
      </span>
    );
  }

  const name = node.name.toLowerCase();
  const ext = node.extension?.toLowerCase() || '';

  if (name.startsWith('.env')) {
    return (
      <span className="px-1 py-0.2 text-[8px] font-mono uppercase bg-[#262626] border border-[#333333] text-[#E6A360]">
        ENV
      </span>
    );
  }

  if (name === 'package.json') {
    return (
      <span className="px-1 py-0.2 text-[8px] font-mono uppercase bg-[#262626] border border-[#333333] text-[#DC8381]">
        NPM
      </span>
    );
  }

  if (ext === 'ts' || ext === 'tsx') {
    return (
      <span className="px-1 py-0.2 text-[8px] font-mono uppercase bg-[#171717] border border-[#333333] text-[#EDEDED]">
        TS
      </span>
    );
  }

  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
    return (
      <span className="px-1 py-0.2 text-[8px] font-mono uppercase bg-[#171717] border border-[#333333] text-[#E6A360]">
        JS
      </span>
    );
  }

  if (ext === 'json') {
    return (
      <span className="px-1 py-0.2 text-[8px] font-mono uppercase bg-[#171717] border border-[#262626] text-[#A1A1A1]">
        JSON
      </span>
    );
  }

  if (ext === 'py') {
    return (
      <span className="px-1 py-0.2 text-[8px] font-mono uppercase bg-[#171717] border border-[#333333] text-[#EDEDED]">
        PY
      </span>
    );
  }

  return (
    <span className="px-1 py-0.2 text-[8px] font-mono uppercase bg-[#171717] border border-[#262626] text-[#555555]">
      FILE
    </span>
  );
}

interface TreeItemProps {
  node: FileTreeNode;
  depth: number;
  openFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  selectedFile?: string;
  onSelectFile: (filePath: string) => void;
  highlightFiles?: Set<string>;
  connectionCounts?: Record<string, { imports: number; callers: number }>;
}

function TreeItem({
  node,
  depth,
  openFolders,
  onToggleFolder,
  selectedFile,
  onSelectFile,
  highlightFiles,
  connectionCounts,
}: TreeItemProps) {
  const isOpen = openFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  const isHighlighted = highlightFiles?.has(node.path);
  const stats = connectionCounts?.[node.path];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isFolder) {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className={`group flex items-center justify-between py-1 px-2 cursor-pointer text-xs font-mono select-none transition-colors ${
          isSelected
            ? 'bg-[#262626] text-[#EDEDED] font-semibold border-l-2 border-[#EDEDED]'
            : isHighlighted
            ? 'bg-[#1e1912] text-[#FFF0D1] hover:bg-[#251e15]'
            : 'text-[#A1A1A1] hover:text-[#EDEDED] hover:bg-[#1a1a1a]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <FileOrFolderIcon node={node} isOpen={isOpen} />
          <span className="truncate text-xs tracking-tight">{node.name}</span>
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {stats && stats.imports > 0 && (
            <span
              className={`text-[8px] font-mono px-1 py-0.2 ${
                isSelected
                  ? 'bg-[#EDEDED] text-[#000000]'
                  : 'bg-[#171717] border border-[#262626] text-[#E6A360]'
              }`}
              title={`Imports ${stats.imports} file(s)`}
            >
              &nearr;{stats.imports}
            </span>
          )}

          {isHighlighted && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#E6A360] animate-pulse shrink-0"
              title="Active Flow / Verified Citation"
            />
          )}
        </div>
      </div>

      {/* Children */}
      {node.isFolder && isOpen && node.children && (
        <div className="relative">
          <div
            style={{ left: `${depth * 12 + 9}px` }}
            className="absolute top-0 bottom-0 w-px bg-[#262626] pointer-events-none"
          />
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              openFolders={openFolders}
              onToggleFolder={onToggleFolder}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              highlightFiles={highlightFiles}
              connectionCounts={connectionCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  files,
  selectedFile,
  onSelectFile,
  highlightFiles = [],
  rootName = 'project',
  connectionCounts,
}: FileTreeProps) {
  const tree = useMemo(() => buildFileTree(files), [files]);

  const [openFolders, setOpenFolders] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    function collectFolders(nodes: FileTreeNode[], depth = 0) {
      for (const n of nodes) {
        if (n.isFolder) {
          if (depth <= 2) initial.add(n.path);
          if (n.children) collectFolders(n.children, depth + 1);
        }
      }
    }
    collectFolders(tree);
    return initial;
  });

  const [isRootOpen, setIsRootOpen] = useState(true);
  const highlightSet = useMemo(() => new Set(highlightFiles), [highlightFiles]);

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    function collect(nodes: FileTreeNode[]) {
      for (const n of nodes) {
        if (n.isFolder) {
          all.add(n.path);
          if (n.children) collect(n.children);
        }
      }
    }
    collect(tree);
    setOpenFolders(all);
    setIsRootOpen(true);
  };

  const collapseAll = () => {
    setOpenFolders(new Set());
  };

  return (
    <div className="w-full flex flex-col font-mono text-xs select-none">
      {/* Action bar */}
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-[#262626] text-[10px] text-[#A1A1A1] uppercase tracking-wider">
        <button
          onClick={() => setIsRootOpen(!isRootOpen)}
          className="flex items-center gap-1.5 font-bold text-[#EDEDED] hover:underline truncate cursor-pointer"
        >
          <span>{isRootOpen ? '[-]' : '[+]'}</span>
          <span className="truncate">{rootName}</span>
        </button>

        <div className="flex items-center gap-1 text-[9px]">
          <button
            onClick={expandAll}
            className="px-1 py-0.5 border border-[#262626] hover:border-[#EDEDED] hover:text-[#EDEDED] transition-colors cursor-pointer"
            title="Expand All Folders"
          >
            EXPAND
          </button>
          <button
            onClick={collapseAll}
            className="px-1 py-0.5 border border-[#262626] hover:border-[#EDEDED] hover:text-[#EDEDED] transition-colors cursor-pointer"
            title="Collapse All Folders"
          >
            COLLAPSE
          </button>
        </div>
      </div>

      {/* Nodes */}
      {isRootOpen && (
        <div className="space-y-0.5">
          {tree.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              depth={0}
              openFolders={openFolders}
              onToggleFolder={toggleFolder}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              highlightFiles={highlightSet}
              connectionCounts={connectionCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
