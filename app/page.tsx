'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavbarAuth } from '@/components/NavbarAuth';

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('VALIDATING REPOSITORY URL...');

    try {
      setTimeout(() => setStatusMessage('FETCHING REPO TREE & FILES...'), 800);
      setTimeout(() => setStatusMessage('PARSING AST & RESOLVING LOCAL IMPORTS...'), 2000);
      setTimeout(() => setStatusMessage('DETECTING REQUEST FLOWS & API ROUTES...'), 3500);

      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze repository');
      }

      setStatusMessage('ANALYSIS READY. INITIALIZING WORKSPACE...');
      router.push(`/repos/${data.repo.id}`);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to analyze repository'
      );
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#EDEDED]">
      {/* Editorial Top Navigation Header */}
      <header className="border-b border-[#262626] bg-[#000000] px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="px-1.5 py-0.5 bg-[#EDEDED] text-[#000000] font-mono font-bold text-xs">
              RG
            </span>
            <span className="font-bold text-sm tracking-tight uppercase">
              RepoGym
            </span>
          </Link>
          <span className="text-[#333333] hidden sm:inline">/</span>
          <span className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider hidden sm:inline">
            Code Comprehension Engine
          </span>
        </div>

        <nav className="flex items-center gap-3 font-mono text-[10px] uppercase">
          <Link
            href="/dashboard"
            className="px-2.5 py-1 text-[#A1A1A1] hover:text-[#EDEDED] transition-colors hidden sm:inline-block tracking-wider"
          >
            Dashboard
          </Link>
          <Link
            href="/repos/demo"
            className="px-2.5 py-1 bg-transparent border border-[#333333] text-[#A1A1A1] hover:text-[#EDEDED] hover:border-[#EDEDED] transition-colors hidden sm:inline-block tracking-wider"
          >
            Demo Graph
          </Link>
          <div className="h-4 w-px bg-[#262626] hidden sm:block" />
          <NavbarAuth />
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 flex flex-col items-center text-center gap-10">
        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#171717] border border-[#262626] font-mono text-[10px] uppercase tracking-wider text-[#A1A1A1]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDED] animate-pulse" />
          <span>Interactive Architecture & Flow Tracing</span>
        </div>

        {/* Hero Headline */}
        <div className="flex flex-col gap-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-bold uppercase tracking-tight text-[#EDEDED] leading-[1.05]">
            Stop generating code you can&apos;t explain.
          </h1>
          <p className="text-sm sm:text-base text-[#A1A1A1] max-w-2xl mx-auto leading-relaxed">
            Ingest any public GitHub repository. RepoGym maps local import DAGs, isolates real endpoint flows, and tests your mental model with line-cited AI evaluation.
          </p>
        </div>

        {/* Repository Input Cell */}
        <div className="w-full max-w-2xl bg-[#171717] border border-[#262626] p-6 text-left">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262626] text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
            <span>Repository Ingestion</span>
            <span className="text-[#555555]">github.com/owner/repo</span>
          </div>

          <form onSubmit={handleAnalyze} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/expressjs/express"
                disabled={loading}
                className="flex-1 text-xs px-3.5 py-2.5 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED] font-mono transition-colors"
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className="px-5 py-2.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] font-mono uppercase tracking-wider font-medium transition-all duration-140 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-black" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Analyze Repo &rarr;</span>
                )}
              </button>
            </div>

            {loading && statusMessage && (
              <div className="text-[10px] font-mono text-[#EDEDED] bg-[#000000] border border-[#262626] px-3 py-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDED] animate-ping" />
                <span className="tracking-wider">{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="text-xs p-3 bg-[#171717] border border-[#DC8381] text-[#DC8381] font-mono">
                <strong className="uppercase">Error: </strong> {errorMessage}
              </div>
            )}
          </form>

          {/* Sample repo quick link */}
          <div className="mt-4 pt-3 border-t border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
            <span>Or test with a pre-indexed fixture:</span>
            <Link
              href="/repos/demo"
              className="text-[#EDEDED] hover:underline flex items-center gap-1 font-medium"
            >
              Demo: Express Auth Service &rarr;
            </Link>
          </div>
        </div>

        {/* 3-Column Architectural Spec Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 w-full max-w-4xl border border-[#262626] bg-[#000000] text-left">
          <div className="p-6 bg-[#171717] border-b sm:border-b-0 sm:border-r border-[#262626] flex flex-col gap-2">
            <span className="font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
              01 // Visual Topology
            </span>
            <h3 className="font-bold text-sm text-[#EDEDED] uppercase tracking-tight">
              Left-to-Right DAG
            </h3>
            <p className="text-xs text-[#A1A1A1] leading-relaxed">
              Dagre-laid React Flow graph mapping exact relative imports, exported symbols, and incoming/outgoing call edges.
            </p>
          </div>

          <div className="p-6 bg-[#171717] border-b sm:border-b-0 sm:border-r border-[#262626] flex flex-col gap-2">
            <span className="font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
              02 // Execution Tracing
            </span>
            <h3 className="font-bold text-sm text-[#EDEDED] uppercase tracking-tight">
              Request Flow Scenarios
            </h3>
            <p className="text-xs text-[#A1A1A1] leading-relaxed">
              Automated route detection for Express, Next.js, and FastAPI. Tests execution order step-by-step through the call chain.
            </p>
          </div>

          <div className="p-6 bg-[#171717] flex flex-col gap-2">
            <span className="font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
              03 // Ground Truth
            </span>
            <h3 className="font-bold text-sm text-[#EDEDED] uppercase tracking-tight">
              Line-Cited Grading
            </h3>
            <p className="text-xs text-[#A1A1A1] leading-relaxed">
              Zero hallucinations. Every grading verdict and fact is verified against exact file bounds and source lines you can inspect.
            </p>
          </div>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#262626] py-5 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
        <div>
          <span>RepoGym // Code Comprehension & Verification Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[#555555]">
          <span>Next.js App Router</span>
          <span>&bull;</span>
          <span>React Flow</span>
          <span>&bull;</span>
          <span>Dagre</span>
          <span>&bull;</span>
          <span>OpenRouter</span>
        </div>
      </footer>
    </div>
  );
}
