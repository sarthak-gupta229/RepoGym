'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DependencyGraph } from '@/components/DependencyGraph';
import { FileViewer } from '@/components/FileViewer';
import { NavbarAuth } from '@/components/NavbarAuth';
import { FileTree } from '@/components/FileTree';
import { buildGraph, DependencyGraph as GraphData } from '@/lib/graph';
import loginFixture from '@/tests/fixtures/login.json';

interface RepoInfo {
  id: string;
  owner: string;
  name: string;
  default_branch: string;
}

interface FlowInfo {
  id: string;
  label: string;
  routeFile: string;
  tag: string;
}

function RepoPageContent() {
  const params = useParams();
  const router = useRouter();
  const repoId = (params?.id as string) || 'demo';

  const [loading, setLoading] = useState(repoId !== 'demo');
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(
    repoId === 'demo'
      ? {
          id: 'demo',
          owner: 'demo',
          name: 'login-service',
          default_branch: 'main',
        }
      : null
  );
  const [analysisId, setAnalysisId] = useState<string>('demo');
  const [files, setFiles] = useState<Record<string, string>>(loginFixture);
  const [flows, setFlows] = useState<FlowInfo[]>([
    {
      id: 'demo-login',
      label: 'POST /login',
      routeFile: 'routes/login.js',
      tag: 'auth',
    },
  ]);

  const [selectedFile, setSelectedFile] = useState<string>('routes/login.js');
  const [highlightFiles, setHighlightFiles] = useState<string[]>([
    'routes/login.js',
    'models/user.js',
  ]);
  const [edgeInfo, setEdgeInfo] = useState<string | null>(null);
  const [showFlowOnly, setShowFlowOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'graph' | 'connections'>('graph');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Load real repository data from /api/repos/[id]
  useEffect(() => {
    async function loadRepoData() {
      try {
        setLoading(true);
        if (repoId === 'demo') {
          setRepoInfo({
            id: 'demo',
            owner: 'demo',
            name: 'login-service',
            default_branch: 'main',
          });
          setFiles(loginFixture);
          setSelectedFile('routes/login.js');
          setHighlightFiles(['routes/login.js', 'models/user.js']);
          return;
        }

        const res = await fetch(`/api/repos/${repoId}`);
        if (!res.ok) {
          throw new Error('Could not load repository');
        }

        const data = await res.json();
        if (data.repo) {
          setRepoInfo(data.repo);
        }
        if (data.analysis) {
          setAnalysisId(data.analysis.id || 'demo');
          if (data.analysis.file_map && Object.keys(data.analysis.file_map).length > 0) {
            setFiles(data.analysis.file_map);
            const firstFile = Object.keys(data.analysis.file_map)[0];
            setSelectedFile(firstFile);
          }
          if (data.analysis.flows && data.analysis.flows.length > 0) {
            setFlows(data.analysis.flows);
            const firstFlow = data.analysis.flows[0];
            setHighlightFiles([firstFlow.routeFile]);
          }
        }
      } catch (err) {
        console.error('Failed to load repo files:', err);
        // Fall back gracefully to demo fixture
        setFiles(loginFixture);
      } finally {
        setLoading(false);
      }
    }

    loadRepoData();
  }, [repoId]);

  // Compute dependency graph for ALL files
  const graph: GraphData = useMemo(() => {
    return buildGraph(files);
  }, [files]);

  // All files list sorted alphabetically
  const allFilePaths = useMemo(() => Object.keys(files).sort(), [files]);

  // Filtered files for search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return allFilePaths;
    const q = searchQuery.toLowerCase();
    return allFilePaths.filter((f) => f.toLowerCase().includes(q));
  }, [allFilePaths, searchQuery]);

  // Current selected file node in graph
  const selectedNode = useMemo(() => {
    return graph.nodes.find((n) => n.file === selectedFile) || null;
  }, [graph.nodes, selectedFile]);

  // Connections for selected file
  const fileConnections = useMemo(() => {
    if (!selectedFile) return { imports: [], callers: [] };
    const imports = graph.edges
      .filter((e) => e.source === selectedFile)
      .map((e) => ({ target: e.target, statement: e.statement }));

    const callers = graph.edges
      .filter((e) => e.target === selectedFile)
      .map((e) => ({ source: e.source, statement: e.statement }));

    return { imports, callers };
  }, [graph.edges, selectedFile]);

  // Active flow files
  const activeFlowFiles = useMemo(() => {
    const activeFlow = flows[0];
    if (!activeFlow) return highlightFiles;
    const connectedToFlow = graph.edges
      .filter((e) => e.source === activeFlow.routeFile || e.target === activeFlow.routeFile)
      .map((e) => (e.source === activeFlow.routeFile ? e.target : e.source));
    return Array.from(new Set([activeFlow.routeFile, ...connectedToFlow]));
  }, [flows, graph.edges, highlightFiles]);

  // Connection counts per file for tree badges
  const fileConnectionCounts = useMemo(() => {
    const counts: Record<string, { imports: number; callers: number }> = {};
    for (const f of allFilePaths) {
      counts[f] = { imports: 0, callers: 0 };
    }
    for (const e of graph.edges) {
      if (counts[e.source]) counts[e.source].imports++;
      if (counts[e.target]) counts[e.target].callers++;
    }
    return counts;
  }, [allFilePaths, graph.edges]);

  const toggleHighlight = () => {
    if (highlightFiles.length > 0) {
      setHighlightFiles([]);
    } else {
      setHighlightFiles(activeFlowFiles);
    }
  };

  const handleStartSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysisId,
          flowTag: flows[0]?.tag || 'auth',
          totalQuestions: questionCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start session');
      router.push(`/sessions/${data.session.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start training session');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Mapping repository architecture and connections...
      </div>
    );
  }

  const repoTitle = repoInfo ? `${repoInfo.owner}/${repoInfo.name}` : repoId;

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
          <span className="text-zinc-400">/</span>
          <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold">
            {repoTitle}
          </span>
          <span className="text-xs text-zinc-500 font-mono hidden md:inline">
            {graph.nodes.length} files · {graph.edges.length} connections
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 text-xs">
          <button
            onClick={toggleHighlight}
            className={`px-3 py-1.5 rounded-lg font-medium border transition cursor-pointer ${
              highlightFiles.length > 0
                ? 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-400 text-yellow-800 dark:text-yellow-200'
                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {highlightFiles.length > 0 ? 'Clear Flow Highlight' : 'Highlight Flow'}
          </button>

          <button
            onClick={() => setShowFlowOnly(!showFlowOnly)}
            className={`px-3 py-1.5 rounded-lg font-medium border transition cursor-pointer ${
              showFlowOnly
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-800 dark:text-blue-200'
                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {showFlowOnly ? 'Showing Flow Only' : `All Files (${allFilePaths.length})`}
          </button>

          <div className="flex items-center gap-1.5">
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer"
              title="Number of questions in session"
            >
              <option value={5}>5 Questions (Default)</option>
              <option value={7}>7 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={3}>3 Questions</option>
            </select>

            <button
              onClick={handleStartSession}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer shadow-sm shadow-blue-500/20 whitespace-nowrap"
            >
              Start Quiz Session &rarr;
            </button>
          </div>

          <NavbarAuth />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-65px)]">
        {/* Left Column: File Explorer & Connection Inspector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm overflow-hidden">
          {/* Subheader & Search */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('graph')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeTab === 'graph'
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Files ({allFilePaths.length})
              </button>
              <button
                onClick={() => setActiveTab('connections')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeTab === 'connections'
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Connection Details
              </button>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              {graph.edges.length} edges
            </span>
          </div>

          {activeTab === 'graph' ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search Box */}
              <div className="mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repository files..."
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Hierarchical Folder-File Explorer Tree */}
              <div className="flex-1 overflow-y-auto pr-1">
                <FileTree
                  files={filteredFiles}
                  selectedFile={selectedFile}
                  onSelectFile={(f) => setSelectedFile(f)}
                  highlightFiles={highlightFiles}
                  rootName={repoInfo?.name || 'project'}
                  connectionCounts={fileConnectionCounts}
                />
              </div>
            </div>
          ) : (
            /* Connection Inspector View */
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              <div>
                <span className="text-[11px] text-zinc-500 font-mono block mb-1">
                  Selected File
                </span>
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono font-semibold break-all text-blue-600 dark:text-blue-400">
                  {selectedFile}
                </div>
              </div>

              {/* Outgoing: What this file imports */}
              <div>
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="text-blue-500 font-bold">↗</span> Imports ({fileConnections.imports.length})
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">outgoing dependencies</span>
                </span>
                {fileConnections.imports.length > 0 ? (
                  <div className="space-y-1.5">
                    {fileConnections.imports.map((imp, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedFile(imp.target)}
                        className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 cursor-pointer hover:bg-blue-100/50 transition font-mono text-[11px]"
                      >
                        <div className="font-semibold text-blue-800 dark:text-blue-300 truncate">
                          {imp.target}
                        </div>
                        {imp.statement && (
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                            <code>{imp.statement}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-400 italic p-2 rounded border border-dashed border-zinc-200 dark:border-zinc-800">
                    Does not import any local repository files.
                  </div>
                )}
              </div>

              {/* Incoming: Who imports this file */}
              <div>
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="text-purple-500 font-bold">↙</span> Imported By ({fileConnections.callers.length})
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">incoming callers</span>
                </span>
                {fileConnections.callers.length > 0 ? (
                  <div className="space-y-1.5">
                    {fileConnections.callers.map((cal, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedFile(cal.source)}
                        className="p-2 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 cursor-pointer hover:bg-purple-100/50 transition font-mono text-[11px]"
                      >
                        <div className="font-semibold text-purple-800 dark:text-purple-300 truncate">
                          {cal.source}
                        </div>
                        {cal.statement && (
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                            <code>{cal.statement}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-400 italic p-2 rounded border border-dashed border-zinc-200 dark:border-zinc-800">
                    No files in the repo import this file directly.
                  </div>
                )}
              </div>

              {/* Exported symbols */}
              {selectedNode?.exports && selectedNode.exports.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Exports ({selectedNode.exports.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.exports.map((exp) => (
                      <span
                        key={exp}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved / External Packages */}
              {selectedNode?.unresolvedImports && selectedNode.unresolvedImports.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    External Packages ({selectedNode.unresolvedImports.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.unresolvedImports.map((pkg) => (
                      <span
                        key={pkg}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      >
                        {pkg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center/Right Column: Interactive Graph & Code Viewer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full gap-3">
          {/* Top Half: Graph */}
          <div className="h-3/5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm flex flex-col relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Dependency Graph
                </span>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  Click any file node to inspect its code & connections
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Selected
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  Flow
                </span>
              </div>
            </div>

            <div className="flex-1 relative">
              <DependencyGraph
                graph={graph}
                highlight={highlightFiles}
                selectedFile={selectedFile}
                onSelect={(file) => {
                  setSelectedFile(file);
                  setActiveTab('connections');
                }}
                onEdgeClick={(statement) => setEdgeInfo(statement || null)}
                showFlowOnly={showFlowOnly}
                flowFiles={activeFlowFiles}
              />
            </div>

            {edgeInfo && (
              <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 px-3 py-1.5 rounded-lg flex items-center justify-between shrink-0">
                <span className="truncate">
                  Import Statement: <code className="font-semibold">{edgeInfo}</code>
                </span>
                <button
                  onClick={() => setEdgeInfo(null)}
                  className="text-xs text-blue-500 hover:underline ml-2 shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Bottom Half: Source Code Viewer */}
          <div className="h-2/5 min-h-0">
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
              <div className="h-full border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 text-xs">
                Select a file from the graph or file list to view source code
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RepoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500">Loading repository graph...</div>}>
      <RepoPageContent />
    </Suspense>
  );
}
