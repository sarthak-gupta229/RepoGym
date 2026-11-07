'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DependencyGraph } from '@/components/DependencyGraph';
import { FileViewer } from '@/components/FileViewer';
import { NavbarAuth } from '@/components/NavbarAuth';
import { Tutorial } from '@/components/Tutorial';
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
        setFiles(loginFixture);
      } finally {
        setLoading(false);
      }
    }

    loadRepoData();
  }, [repoId]);

  const graph: GraphData = useMemo(() => {
    return buildGraph(files);
  }, [files]);

  const allFilePaths = useMemo(() => Object.keys(files).sort(), [files]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return allFilePaths;
    const q = searchQuery.toLowerCase();
    return allFilePaths.filter((f) => f.toLowerCase().includes(q));
  }, [allFilePaths, searchQuery]);

  const selectedNode = useMemo(() => {
    return graph.nodes.find((n) => n.file === selectedFile) || null;
  }, [graph.nodes, selectedFile]);

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

  const activeFlowFiles = useMemo(() => {
    const activeFlow = flows[0];
    if (!activeFlow) return highlightFiles;
    const connectedToFlow = graph.edges
      .filter((e) => e.source === activeFlow.routeFile || e.target === activeFlow.routeFile)
      .map((e) => (e.source === activeFlow.routeFile ? e.target : e.source));
    return Array.from(new Set([activeFlow.routeFile, ...connectedToFlow]));
  }, [flows, graph.edges, highlightFiles]);

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

  const handleStartHackathon = async () => {
    try {
      const res = await fetch('/api/hackathon/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysisId,
          repoId: repoInfo?.id || repoId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start hackathon evaluation');
      router.push(`/hackathon/${data.evaluation.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start hackathon evaluation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-[10px] font-mono uppercase tracking-wider text-[#A1A1A1]">
        Mapping repository architecture and local import graph...
      </div>
    );
  }

  const repoTitle = repoInfo ? `${repoInfo.owner}/${repoInfo.name}` : repoId;

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#EDEDED]">
      {/* Top Navbar */}
      <header className="border-b border-[#262626] bg-[#000000] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="px-1.5 py-0.5 bg-[#EDEDED] text-[#000000] font-mono font-bold text-xs">
              RG
            </span>
            <span className="font-bold text-sm tracking-tight uppercase">
              RepoGym
            </span>
          </Link>
          <span className="text-[#333333]">/</span>
          <span className="font-mono text-xs px-2 py-0.5 bg-[#171717] border border-[#262626] text-[#EDEDED] font-semibold">
            {repoTitle}
          </span>
          <span className="text-[10px] text-[#A1A1A1] font-mono uppercase tracking-wider hidden md:inline">
            {graph.nodes.length} files &bull; {graph.edges.length} edges
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px] uppercase tracking-wider">
          <button
            data-tour="repo-highlight"
            onClick={toggleHighlight}
            className={`px-3 py-1.5 border transition-colors cursor-pointer ${
              highlightFiles.length > 0
                ? 'bg-[#1a1610] border-[#E6A360] text-[#FFF0D1]'
                : 'bg-transparent border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED]'
            }`}
          >
            {highlightFiles.length > 0 ? '[ Clear Flow Highlight ]' : '[ Highlight Flow ]'}
          </button>

          <button
            data-tour="repo-filter"
            onClick={() => setShowFlowOnly(!showFlowOnly)}
            className={`px-3 py-1.5 border transition-colors cursor-pointer ${
              showFlowOnly
                ? 'bg-[#1a1610] border-[#E6A360] text-[#FFF0D1]'
                : 'bg-transparent border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED]'
            }`}
          >
            {showFlowOnly ? 'FLOW ONLY' : `ALL FILES (${allFilePaths.length})`}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              data-tour="repo-defense"
              onClick={handleStartHackathon}
              className="px-3 py-1.5 bg-[#1a150e] text-[#E6A360] border border-[#E6A360] hover:bg-[#E6A360] hover:text-[#000000] font-bold transition-all duration-140 cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <span>⚡</span>
              <span>Hackathon Eval</span>
            </button>

            <div data-tour="repo-practice" className="flex flex-wrap items-center gap-2">
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-[#000000] border border-[#333333] text-[#EDEDED] font-mono text-[10px] uppercase focus:outline-none focus:border-[#EDEDED] cursor-pointer"
                title="Number of questions in session"
              >
                <option value={5}>5 Questions (Standard)</option>
                <option value={7}>7 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={3}>3 Questions</option>
              </select>

              <button
                onClick={handleStartSession}
                className="px-4 py-1.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white font-semibold transition-all duration-140 cursor-pointer whitespace-nowrap"
              >
                Start Flow Session &rarr;
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-[#262626] mx-1" />
          <Tutorial chapter="repo" />
          <NavbarAuth />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-65px)]">
        {/* Left Column: File Explorer & Connection Inspector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full bg-[#171717] border border-[#262626] p-3 overflow-hidden">
          {/* Tabs */}
          <div data-tour="repo-files" className="flex items-center justify-between pb-2 mb-2 border-b border-[#262626]">
            <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-2.5 py-1 transition-colors cursor-pointer border ${
                  activeTab === 'graph'
                    ? 'bg-[#EDEDED] text-[#000000] border-[#EDEDED] font-semibold'
                    : 'bg-transparent text-[#A1A1A1] border-[#333333] hover:text-[#EDEDED]'
                }`}
              >
                Files ({allFilePaths.length})
              </button>
              <button
                data-tour="repo-connections"
                onClick={() => setActiveTab('connections')}
                className={`px-2.5 py-1 transition-colors cursor-pointer border ${
                  activeTab === 'connections'
                    ? 'bg-[#EDEDED] text-[#000000] border-[#EDEDED] font-semibold'
                    : 'bg-transparent text-[#A1A1A1] border-[#333333] hover:text-[#EDEDED]'
                }`}
              >
                Connections
              </button>
            </div>
            <span className="text-[10px] text-[#555555] font-mono">
              {graph.edges.length} EDGES
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
                  placeholder="Filter repository files..."
                  className="w-full text-xs px-3 py-1.5 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED] font-mono"
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
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider block mb-1">
                  Active File
                </span>
                <div className="p-2 bg-[#000000] border border-[#333333] font-semibold break-all text-[#EDEDED]">
                  {selectedFile}
                </div>
              </div>

              {/* Outgoing: What this file imports */}
              <div>
                <span className="text-[10px] font-semibold text-[#A1A1A1] uppercase tracking-wider flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1 text-[#E6A360]">
                    &nearr; Imports ({fileConnections.imports.length})
                  </span>
                  <span className="text-[#555555]">Outgoing</span>
                </span>
                {fileConnections.imports.length > 0 ? (
                  <div className="space-y-1.5">
                    {fileConnections.imports.map((imp, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedFile(imp.target)}
                        className="p-2 bg-[#000000] border border-[#262626] hover:border-[#E6A360] cursor-pointer transition-colors text-[11px]"
                      >
                        <div className="font-semibold text-[#EDEDED] truncate">
                          {imp.target}
                        </div>
                        {imp.statement && (
                          <div className="text-[10px] text-[#A1A1A1] truncate mt-0.5">
                            <code>{imp.statement}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-[#555555] p-2 bg-[#000000] border border-[#262626] uppercase">
                    Does not import any local repository files.
                  </div>
                )}
              </div>

              {/* Incoming: Who imports this file */}
              <div>
                <span className="text-[10px] font-semibold text-[#A1A1A1] uppercase tracking-wider flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1 text-[#CE7762]">
                    &swarr; Imported By ({fileConnections.callers.length})
                  </span>
                  <span className="text-[#555555]">Incoming</span>
                </span>
                {fileConnections.callers.length > 0 ? (
                  <div className="space-y-1.5">
                    {fileConnections.callers.map((cal, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedFile(cal.source)}
                        className="p-2 bg-[#000000] border border-[#262626] hover:border-[#CE7762] cursor-pointer transition-colors text-[11px]"
                      >
                        <div className="font-semibold text-[#EDEDED] truncate">
                          {cal.source}
                        </div>
                        {cal.statement && (
                          <div className="text-[10px] text-[#A1A1A1] truncate mt-0.5">
                            <code>{cal.statement}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-[#555555] p-2 bg-[#000000] border border-[#262626] uppercase">
                    No files import this file directly.
                  </div>
                )}
              </div>

              {/* Exported symbols */}
              {selectedNode?.exports && selectedNode.exports.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-[#A1A1A1] uppercase tracking-wider block mb-1">
                    Exports ({selectedNode.exports.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.exports.map((exp) => (
                      <span
                        key={exp}
                        className="text-[9px] px-1.5 py-0.5 bg-[#000000] border border-[#333333] text-[#EDEDED]"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* External Packages */}
              {selectedNode?.unresolvedImports && selectedNode.unresolvedImports.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-[#A1A1A1] uppercase tracking-wider block mb-1">
                    External Dependencies ({selectedNode.unresolvedImports.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.unresolvedImports.map((pkg) => (
                      <span
                        key={pkg}
                        className="text-[9px] px-1.5 py-0.5 bg-[#000000] border border-[#262626] text-[#A1A1A1]"
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
          <div data-tour="repo-graph" className="h-3/5 bg-[#171717] border border-[#262626] p-3 flex flex-col relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#262626] text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-[#EDEDED] text-[10px]">
                  Topological Dependency Graph
                </span>
                <span className="text-[#333333]">&bull;</span>
                <span className="text-[#A1A1A1] text-[10px] uppercase">
                  Click any node to inspect source & local call paths
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#A1A1A1]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#EDEDED]" />
                  Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#E6A360]" />
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
              <div className="mt-2 text-xs font-mono bg-[#000000] border border-[#333333] text-[#EDEDED] px-3 py-1.5 flex items-center justify-between shrink-0">
                <span className="truncate">
                  Import Statement: <code className="text-[#E6A360]">{edgeInfo}</code>
                </span>
                <button
                  onClick={() => setEdgeInfo(null)}
                  className="text-[10px] text-[#A1A1A1] hover:text-[#EDEDED] underline ml-2 shrink-0 cursor-pointer uppercase"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Bottom Half: Source Code Viewer */}
          <div data-tour="repo-source" className="h-2/5 min-h-0">
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
              <div className="h-full border border-[#262626] bg-[#171717] flex items-center justify-center text-[#555555] font-mono text-[10px] uppercase tracking-wider">
                Select a file from graph or file list to view source code
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
    <Suspense fallback={<div className="p-8 text-center text-[10px] font-mono uppercase text-[#A1A1A1]">Loading repository graph...</div>}>
      <RepoPageContent />
    </Suspense>
  );
}
