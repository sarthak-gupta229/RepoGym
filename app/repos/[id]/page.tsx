'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { DependencyGraph } from '@/components/DependencyGraph';
import { FileViewer } from '@/components/FileViewer';
import { buildGraph } from '@/lib/graph';
import loginFixture from '@/tests/fixtures/login.json';

function RepoPageContent() {
  const params = useParams();
  const repoId = (params?.id as string) || 'demo';

  // For Phase 2, load the login fixture files
  const files: Record<string, string> = loginFixture;

  const graph = useMemo(() => buildGraph(files), [files]);

  const [selectedFile, setSelectedFile] = useState<string>('routes/login.js');
  const [highlightFiles, setHighlightFiles] = useState<string[]>([
    'routes/login.js',
    'models/user.js',
  ]);
  const [edgeInfo, setEdgeInfo] = useState<string | null>(null);
  const [showFlowOnly, setShowFlowOnly] = useState<boolean>(false);

  const flowFiles = ['routes/login.js', 'models/user.js'];

  const toggleHighlight = () => {
    if (highlightFiles.length > 0) {
      setHighlightFiles([]);
    } else {
      setHighlightFiles(['routes/login.js', 'models/user.js']);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-mono">
              RG
            </span>
            RepoGym
          </a>
          <span className="text-zinc-600 dark:text-zinc-300">/</span>
          <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {repoId === 'demo' ? 'demo/login-service' : repoId}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={toggleHighlight}
            className={`px-3 py-1.5 rounded-md font-medium border transition ${
              highlightFiles.length > 0
                ? 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-400 text-yellow-800 dark:text-yellow-200'
                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {highlightFiles.length > 0 ? 'Clear Highlight' : 'Highlight Flow (/login)'}
          </button>

          <button
            onClick={() => setShowFlowOnly(!showFlowOnly)}
            className={`px-3 py-1.5 rounded-md font-medium border transition ${
              showFlowOnly
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-800 dark:text-blue-200'
                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {showFlowOnly ? 'Show All Files' : 'Flow Filter: On'}
          </button>
        </div>
      </header>

      {/* Main Workspace: Left Graph, Right File Viewer */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-60px)]">
        {/* Graph Pane */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
            <span className="font-medium">Dependency Graph</span>
            <span>
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </span>
          </div>

          <div className="flex-1 relative">
            <DependencyGraph
              graph={graph}
              highlight={highlightFiles}
              selectedFile={selectedFile}
              onSelect={(file) => setSelectedFile(file)}
              onEdgeClick={(statement) => setEdgeInfo(statement || null)}
              showFlowOnly={showFlowOnly}
              flowFiles={flowFiles}
            />
          </div>

          {edgeInfo && (
            <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 px-3 py-2 rounded-lg flex items-center justify-between">
              <span>Import: <code>{edgeInfo}</code></span>
              <button
                onClick={() => setEdgeInfo(null)}
                className="text-xs text-blue-500 hover:underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* File Viewer Pane */}
        <div className="lg:col-span-5 h-full">
          {selectedFile && files[selectedFile] ? (
            <FileViewer
              filePath={selectedFile}
              content={files[selectedFile]}
              highlightRange={
                selectedFile === 'routes/login.js' && highlightFiles.includes('routes/login.js')
                  ? [7, 16]
                  : undefined
              }
            />
          ) : (
            <div className="h-full border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xs">
              Click a node on the graph to inspect code
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RepoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading repository...</div>}>
      <RepoPageContent />
    </Suspense>
  );
}
