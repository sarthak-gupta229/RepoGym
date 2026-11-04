'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    setStatusMessage('Validating repository URL...');

    try {
      setTimeout(() => setStatusMessage('Fetching repository files...'), 800);
      setTimeout(() => setStatusMessage('Mapping imports & dependency graph...'), 2000);
      setTimeout(() => setStatusMessage('Detecting request flows...'), 3500);

      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze repository');
      }

      setStatusMessage('Analysis ready! Loading workspace...');
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
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-sm shadow-blue-500/20">
            RG
          </span>
          <span className="font-bold text-base tracking-tight">RepoGym</span>
        </div>

        <nav className="flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <a
            href="/dashboard"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            Dashboard
          </a>
          <a
            href="/repos/demo"
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-800 dark:text-zinc-200"
          >
            Explore Demo Graph
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 flex flex-col items-center text-center gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Interactive Code Tracing & Comprehension Engine
        </div>

        <div className="flex flex-col gap-3 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
            Stop generating code you can&apos;t explain. Master any codebase.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Paste any public GitHub repository. RepoGym maps its architecture, traces real request flows, and tests your understanding with AI-graded questions cited directly to source lines.
          </p>
        </div>

        {/* Input Box Card */}
        <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-lg shadow-zinc-200/50 dark:shadow-none">
          <form onSubmit={handleAnalyze} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                disabled={loading}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition"
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  'Analyze Repo →'
                )}
              </button>
            </div>

            {loading && statusMessage && (
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-2 animate-pulse pt-1">
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="text-xs p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-left">
                <strong>Error: </strong> {errorMessage}
              </div>
            )}
          </form>

          {/* Quick Demo Option */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>Or try our sample repository:</span>
            <a
              href="/repos/demo"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition flex items-center gap-1"
            >
              Demo: Auth Login Service →
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl pt-8 text-left">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5">
            <div className="text-blue-600 font-bold text-sm">01 · Visual Graph</div>
            <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
              Interactive Dependency Graph
            </div>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Explore left-to-right import relations, export symbols, and inspect source files with a single click.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5">
            <div className="text-blue-600 font-bold text-sm">02 · Flow Tracing</div>
            <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
              Request Flow Challenges
            </div>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Detects API routes across Express, Next.js, and FastAPI. Asks sequential questions tracing the call chain.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5">
            <div className="text-blue-600 font-bold text-sm">03 · Verified Citations</div>
            <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
              Zero-Hallucination Grading
            </div>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Every fact and grade is backed by exact file and line citations you can inspect directly in the code.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        RepoGym MVP · Built with Next.js, React Flow, Dagre & OpenRouter
      </footer>
    </div>
  );
}
