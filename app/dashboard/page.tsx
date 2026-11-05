'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavbarAuth } from '@/components/NavbarAuth';

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

  const handleStartSession = async (analysisId = 'demo', flowTag?: string, totalQuestions = 5) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, flowTag, totalQuestions }),
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
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-[10px] font-mono uppercase tracking-wider text-[#A1A1A1]">
        Loading performance dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#EDEDED]">
      {/* Top Navbar */}
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
          <span className="text-[#333333]">/</span>
          <span className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
            Student Performance Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3 py-1 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] font-mono uppercase tracking-wider font-semibold transition-all duration-140"
          >
            + Analyze Repo
          </Link>
          <NavbarAuth />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-8">
        {/* Metric Cells Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#171717] border border-[#262626] p-5 flex flex-col gap-1">
            <div className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
              01 // Repositories Tracked
            </div>
            <div className="text-3xl font-bold uppercase text-[#EDEDED]">
              {repos.length}
            </div>
          </div>

          <div className="bg-[#171717] border border-[#262626] p-5 flex flex-col gap-1">
            <div className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
              02 // Total Sessions Run
            </div>
            <div className="text-3xl font-bold uppercase text-[#EDEDED]">
              {dashboard?.sessionsCount || 0}
            </div>
          </div>

          <div className="bg-[#171717] border border-[#262626] p-5 flex flex-col gap-1">
            <div className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
              03 // Completed Runs
            </div>
            <div className="text-3xl font-bold uppercase text-[#EDEDED]">
              {dashboard?.completedSessionsCount || 0}
            </div>
          </div>

          <div className="bg-[#171717] border border-[#262626] p-5 flex flex-col gap-1">
            <div className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
              04 // Target Focus
            </div>
            <div className="text-xl font-bold uppercase text-[#E6A360] truncate">
              {dashboard?.suggestedFocus ? dashboard.suggestedFocus : 'NOMINAL // CAUGHT UP'}
            </div>
          </div>
        </div>

        {/* Suggested Focus Banner */}
        {dashboard?.suggestedFocus && (
          <div className="bg-[#171717] border border-[#E6A360] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#E6A360] uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6A360] animate-pulse" />
                <span>Recommended Action</span>
              </div>
              <h3 className="text-sm font-bold text-[#EDEDED] uppercase tracking-tight">
                Review &ldquo;{dashboard.suggestedFocus}&rdquo; Flow
              </h3>
              <p className="text-xs text-[#A1A1A1] mt-0.5">
                Targeted practice on this flow will reinforce verified code execution order.
              </p>
            </div>
            <button
              onClick={() => handleStartSession('demo', dashboard.suggestedFocus || undefined)}
              className="px-4 py-2 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] font-mono uppercase tracking-wider font-semibold transition-all duration-140 shrink-0 cursor-pointer"
            >
              Start Targeted Session &rarr;
            </button>
          </div>
        )}

        {/* My Repositories Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-tight text-[#EDEDED]">
              Repositories Under Comprehension
            </h2>
            <span className="font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
              {repos.length} Repositories Indexed
            </span>
          </div>

          <div className="bg-[#000000] border border-[#262626]">
            <div className="divide-y divide-[#262626]">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="p-4 bg-[#171717] hover:bg-[#1a1a1a] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#EDEDED]">
                        {repo.owner}/{repo.name}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 border border-[#333333] text-[#A1A1A1] bg-[#000000]">
                        INDEXED
                      </span>
                    </div>
                    <div className="text-[10px] text-[#A1A1A1] font-mono uppercase tracking-wider">
                      Branch: {repo.default_branch} &bull; {repo.sessionsCount || 0} Sessions Run
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                    <Link
                      href={`/repos/${repo.owner === 'demo' ? 'demo' : repo.id}`}
                      className="px-3 py-1.5 bg-transparent border border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED] transition-colors"
                    >
                      Explore Graph
                    </Link>
                    <button
                      onClick={() => handleStartSession(repo.owner === 'demo' ? 'demo' : repo.id)}
                      className="px-3 py-1.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white font-semibold transition-colors cursor-pointer"
                    >
                      Start Session &rarr;
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
            <h2 className="text-sm font-bold uppercase tracking-tight text-[#EDEDED]">
              Historical Session Traces
            </h2>
            <div className="bg-[#171717] border border-[#262626] p-4">
              <div className="flex flex-col gap-2">
                {dashboard.scoreTrend.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-[#000000] border border-[#262626] gap-2 font-mono text-[10px] uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#555555]">#{idx + 1}</span>
                      <span className="font-semibold text-[#EDEDED]">
                        Flow: {s.flowTag}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#EDEDED]">
                        {s.score} / {s.maxScore} ({s.percentage}%)
                      </span>
                      <span
                        className={`px-2 py-0.5 border ${
                          s.percentage >= 80
                            ? 'border-[#EDEDED] text-[#EDEDED] bg-[#171717]'
                            : s.percentage >= 50
                            ? 'border-[#E6A360] text-[#E6A360] bg-[#171717]'
                            : 'border-[#DC8381] text-[#DC8381] bg-[#171717]'
                        }`}
                      >
                        {s.percentage >= 80 ? 'MASTERED' : s.percentage >= 50 ? 'PARTIAL' : 'NEEDS REVIEW'}
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
    <Suspense fallback={<div className="p-8 text-center text-[10px] font-mono uppercase text-[#A1A1A1]">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
