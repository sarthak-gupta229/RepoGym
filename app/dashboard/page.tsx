'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  sessionsCount: number;
  completedSessionsCount: number;
  scoreTrend: Array<{
    sessionId: string;
    flowTag: string;
    date: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  missesByTag: Record<string, number>;
  suggestedFocus: string | null;
  feedbackCount: number;
}

interface RepoData {
  id: string;
  owner: string;
  name: string;
  default_branch: string;
  sessionsCount: number;
}

function DashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [repos, setRepos] = useState<RepoData[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const [dashRes, reposRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/repos'),
        ]);

        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setDashboard(dashData);
        }

        if (reposRes.ok) {
          const reposData = await reposRes.json();
          setRepos(reposData.repos || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const handleStartSession = async (analysisId = 'demo', flowTag?: string) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, flowTag }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start session');
        return;
      }
      router.push(`/sessions/${data.session.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start session');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
        Loading performance dashboard...
      </div>
    );
  }

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
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Student Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            + Analyze New Repo
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-8">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Repositories Tracked</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {repos.length}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Total Sessions</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {dashboard?.sessionsCount || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Completed Sessions</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {dashboard?.completedSessionsCount || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-zinc-500 mb-1">Suggested Focus Area</div>
            <div className="text-base font-bold text-yellow-600 dark:text-yellow-400 truncate">
              {dashboard?.suggestedFocus ? `${dashboard.suggestedFocus}` : 'All caught up!'}
            </div>
          </div>
        </div>

        {/* Suggested Focus Banner */}
        {dashboard?.suggestedFocus && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-blue-950 dark:text-blue-100">
                Recommended Focus: Review &ldquo;{dashboard.suggestedFocus}&rdquo; Flow
              </h3>
              <p className="text-xs text-blue-800/80 dark:text-blue-200/80 mt-0.5">
                Based on your recent attempts, practicing questions on this flow will maximize your code comprehension.
              </p>
            </div>
            <button
              onClick={() => handleStartSession('demo', dashboard.suggestedFocus || undefined)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition"
            >
              Start Targeted Session →
            </button>
          </div>
        )}

        {/* My Repositories Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              My Repositories
            </h2>
            <span className="text-xs text-zinc-500">{repos.length} repos</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {repo.owner}/{repo.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                        Ready
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">
                      branch: {repo.default_branch} · {repo.sessionsCount || 0} sessions
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/repos/${repo.owner === 'demo' ? 'demo' : repo.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      Explore Graph
                    </a>
                    <button
                      onClick={() => handleStartSession(repo.owner === 'demo' ? 'demo' : repo.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer"
                    >
                      Start Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Performance Breakdown */}
        {dashboard?.scoreTrend && dashboard.scoreTrend.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Recent Session Scores
            </h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col gap-2">
                {dashboard.scoreTrend.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-500">#{idx + 1}</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Flow: {s.flowTag}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {s.score} / {s.maxScore} ({s.percentage}%)
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.percentage >= 80
                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                            : s.percentage >= 50
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {s.percentage >= 80 ? 'Mastered' : s.percentage >= 50 ? 'Good' : 'Needs Review'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

