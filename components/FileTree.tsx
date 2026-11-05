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

// Icon renderer styled identically to modern VS Code / IDE explorers
function FileOrFolderIcon({
  node,
  isOpen,
}: {
  node: FileTreeNode;
  isOpen?: boolean;
}) {
  if (node.isFolder) {
    return (
      <svg
        className={`w-4 h-4 shrink-0 transition-colors ${
          isOpen
            ? 'text-amber-400 dark:text-amber-300'
            : 'text-amber-500 dark:text-amber-400'
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        {isOpen ? (
          <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v2H2V6zM2 10h16v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z" />
        ) : (
          <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        )}
      </svg>
    );
  }

  const name = node.name.toLowerCase();
  const ext = node.extension?.toLowerCase() || '';

  // .env files
  if (name.startsWith('.env')) {
    return (
      <span className="shrink-0 px-1 py-0.2 text-[9px] font-black rounded bg-amber-400/90 text-zinc-950 font-mono tracking-tight leading-tight">
        .ENV
      </span>
    );
  }

  // Git files
  if (name.startsWith('.git')) {
    return (
      <svg className="w-3.5 h-3.5 shrink-0 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M2.6 10.59L8.38 4.8a2.53 2.53 0 013.58 0l1.24 1.24-2.88 2.88a1.76 1.76 0 00-.77 2.37l-2.07 2.07a1.76 1.76 0 00-1.89.47 1.76 1.76 0 000 2.49 1.76 1.76 0 002.49 0 1.76 1.76 0 00.47-1.89l2.02-2.02a1.76 1.76 0 001.37.04l2.83 2.83a1.76 1.76 0 00-.04 1.37 1.76 1.76 0 102.37-2.37l-2.83-2.83a1.76 1.76 0 00-.04-1.37l2.87-2.87 5.79 5.79a2.53 2.53 0 010 3.58l-8.68 8.68a2.53 2.53 0 01-3.58 0L2.6 14.17a2.53 2.53 0 010-3.58z" />
      </svg>
    );
  }

  // package.json / npm lock
  if (name === 'package.json' || name === 'package-lock.json') {
    return (
      <span className="shrink-0 px-1 py-0.2 text-[9px] font-black rounded bg-red-600 text-white font-mono tracking-tighter leading-tight">
        npm
      </span>
    );
  }

  // TypeScript
  if (ext === 'ts' || ext === 'tsx') {
    return (
      <span className="shrink-0 px-1 py-0.2 text-[9px] font-bold rounded bg-blue-600 text-white font-mono leading-tight">
        TS
      </span>
    );
  }

  // JavaScript
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
    return (
      <span className="shrink-0 px-1 py-0.2 text-[9px] font-bold rounded bg-yellow-400 text-zinc-950 font-mono leading-tight">
        JS
      </span>
    );
  }

  // JSON / skills-lock
  if (ext === 'json') {
    return (
      <span className="shrink-0 text-amber-500 font-bold font-mono text-[11px] leading-none px-0.5">
        {'{ }'}
      </span>
    );
  }

  // Prisma
  if (ext === 'prisma') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0 text-teal-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3 19.5h18L12 2zm0 3.8l5.8 11.7H6.2L12 5.8z" />
      </svg>
    );
  }

  // Python
  if (ext === 'py') {
    return (
      <span className="shrink-0 px-1 py-0.2 text-[9px] font-bold rounded bg-sky-600 text-white font-mono leading-tight">
        PY
      </span>
    );
  }

  // Markdown
  if (ext === 'md' || ext === 'mdx') {
    return (
      <span className="shrink-0 px-1 py-0.2 text-[8px] font-bold rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
        MD
      </span>
    );
  }

  // Default File Icon
  return (
    <svg className="w-3.5 h-3.5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
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
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        className={`group flex items-center justify-between py-1 px-2 rounded-md cursor-pointer text-xs font-mono select-none transition-colors ${
          isSelected
            ? 'bg-zinc-800 text-white dark:bg-zinc-800 dark:text-zinc-100 font-medium'
            : isHighlighted
            ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Chevron for folder */}
          {node.isFolder ? (
            <span
              className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[10px] text-zinc-400 transition-transform ${
                isOpen ? 'rotate-90 text-zinc-600 dark:text-zinc-200' : ''
              }`}
            >
              ▶
            </span>
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}

          {/* Icon */}
          <FileOrFolderIcon node={node} isOpen={isOpen} />

          {/* Name */}
          <span className="truncate text-xs tracking-tight">{node.name}</span>
        </div>

        {/* Badges / indicators */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {stats && stats.imports > 0 && (
            <span
              className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-blue-500'
              }`}
              title={`Imports ${stats.imports} file(s)`}
            >
              ↗{stats.imports}
            </span>
          )}

          {isHighlighted && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0"
              title="Active Flow / Verified Citation"
            />
          )}
        </div>
      </div>

      {/* Render children if folder is open */}
      {node.isFolder && isOpen && node.children && (
        <div className="relative">
          {/* Subtle indentation guideline */}
          <div
            style={{ left: `${depth * 14 + 12}px` }}
            className="absolute top-0 bottom-0 w-px bg-zinc-200/80 dark:bg-zinc-800 pointer-events-none"
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

  // By default, open all top-level and first-level folders so the user immediately sees the file structure
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Collect all folder paths
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
      {/* Top action bar: Root folder + Expand/Collapse All buttons */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-1 border-b border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500">
        <button
          onClick={() => setIsRootOpen(!isRootOpen)}
          className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200 hover:text-blue-600 transition truncate"
        >
          <span
            className={`w-3.5 h-3.5 flex items-center justify-center text-[9px] transition-transform ${
              isRootOpen ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
          <span className="truncate">{rootName}</span>
        </button>

        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={expandAll}
            className="px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            title="Expand All Folders"
          >
            Expand
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <button
            onClick={collapseAll}
            className="px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            title="Collapse All Folders"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* Hierarchical Folder & File Nodes */}
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
