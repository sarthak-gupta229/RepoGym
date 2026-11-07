'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavbarAuth } from '@/components/NavbarAuth';
import { HACKATHON_CRITERIA, PROJECT_EVALUATION_METRICS } from '@/lib/hackathon';

export interface CompletedHackathonItem {
  id: string;
  repoId: string;
  repoName: string;
  analysisId: string;
  status: 'in_progress' | 'completed';
  totalScore: number;
  totalCriteria: number;
  currentCriterionIndex: number;
  resultsCount: number;
  createdAt: string;
  updatedAt: string;
  criterionResults: Array<{
    criterion_id: string;
    criterion_title: string;
    weight: number;
    question: string;
    rubric_points: string[];
    user_answer: string;
    score: number;
    weighted_score: number;
    verdict: 'exceptional' | 'strong' | 'needs_work' | 'weak';
    strengths: string[];
    gaps: string[];
    feedback: string;
    judge_tips: string;
    suggested_files?: string[];
  }>;
}

export interface CompletedProjectSessionItem {
  id: string;
  repoId: string;
  repoName: string;
  flowTag: string;
  status: 'in_progress' | 'completed' | 'paused';
  totalQuestions: number;
  currentIndex: number;
  score: number;
  maxScore: number;
  percentage: number;
  createdAt: string;
  updatedAt: string;
  answeredCount: number;
  questions: Array<{
    id: string;
    position: number;
    question: string;
    expectedFacts: Array<{ id: string; fact: string; file: string; startLine: number; endLine: number }>;
    attempt?: {
      id: string;
      answer: string;
      score: number;
      maxScore: number;
      verdict: 'correct' | 'partial' | 'incorrect';
      covered: string[];
      missed: string[];
      feedback: string;
      citations: Array<{ file: string; startLine: number; endLine: number }>;
      followUpQuestion?: string | null;
      createdAt: string;
    } | null;
  }>;
}

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
  hackathonEvaluations?: CompletedHackathonItem[];
  projectSessions?: CompletedProjectSessionItem[];
  summaryStats?: {
    totalCompletedHackathons: number;
    totalCompletedProjectSessions: number;
    avgHackathonScore: number;
    avgProjectScore: number;
  };
}

interface RepoData {
  id: string;
  owner: string;
  name: string;
  default_branch: string;
  sessionsCount: number;
  last_visited_at?: string;
  latestCommitSha?: string | null;
  analysisId?: string | null;
  latestSession?: {
    id: string;
    status: 'in_progress' | 'completed' | 'paused';
    current_index: number;
    total_questions: number;
    created_at: string;
  } | null;
  latestHackathonEvaluation?: {
    id: string;
    status: 'in_progress' | 'completed';
    total_score: number;
    current_criterion_index: number;
    total_criteria: number;
    created_at: string;
  } | null;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'RECENT';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'JUST NOW';
    if (diffMinutes < 60) return `${diffMinutes}M AGO`;
    if (diffHours < 24) return `${diffHours}H AGO`;
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays < 7) return `${diffDays}D AGO`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  } catch {
    return 'RECENT';
  }
}

function DashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [repos, setRepos] = useState<RepoData[]>([]);

  // Project evaluation vs Hackathon evaluation selection state
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [activeEvaluationSection, setActiveEvaluationSection] = useState<'hackathon' | 'project'>('hackathon');
  const [startingEvaluation, setStartingEvaluation] = useState(false);

  // Archive filter & expanded marks/corrections view state
  const [evalFilterTab, setEvalFilterTab] = useState<'all' | 'hackathon' | 'project'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed'>('all');
  const [expandedEvalId, setExpandedEvalId] = useState<string | null>(null);

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
          const repoList: RepoData[] = reposData.repos || [];
          setRepos(repoList);
          if (repoList.length > 0) {
            setSelectedRepoId(repoList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const selectedRepo = repos.find((r) => r.id === selectedRepoId) || repos[0] || null;

  const handleStartProjectSession = async (
    analysisId = 'demo',
    flowTag?: string,
    totalQuestions = 5,
    repoId?: string
  ) => {
    try {
      setStartingEvaluation(true);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          flowTag,
          totalQuestions,
          repoId: repoId || selectedRepo?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start project evaluation session');
        return;
      }
      router.push(`/sessions/${data.session.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start session');
    } finally {
      setStartingEvaluation(false);
    }
  };

  const handleStartHackathonEvaluation = async (targetRepo: RepoData) => {
    try {
      setStartingEvaluation(true);
      const targetId = targetRepo.owner === 'demo' ? 'demo' : targetRepo.id;
      const targetAnalysisId = targetRepo.analysisId || targetId;

      const res = await fetch('/api/hackathon/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: targetAnalysisId,
          repoId: targetRepo.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start hackathon evaluation');
        return;
      }

      router.push(`/hackathon/${data.evaluation.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to start hackathon evaluation');
    } finally {
      setStartingEvaluation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-[10px] font-mono uppercase tracking-wider text-[#A1A1A1]">
        Loading performance dashboard & evaluation suites...
      </div>
    );
  }

  const selectedTargetId = selectedRepo ? (selectedRepo.owner === 'demo' ? 'demo' : selectedRepo.id) : 'demo';
  const selectedAnalysisId = selectedRepo?.analysisId || selectedTargetId;

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'exceptional':
      case 'correct':
        return 'text-[#4EBA6F] border-[#4EBA6F] bg-[#0c1f13]';
      case 'strong':
      case 'partial':
        return 'text-[#E6A360] border-[#E6A360] bg-[#1a150e]';
      case 'needs_work':
        return 'text-[#E5B54F] border-[#E5B54F] bg-[#1c1809]';
      default:
        return 'text-[#DC8381] border-[#DC8381] bg-[#220d0d]';
    }
  };

  const getHackathonPlacement = (score: number) => {
    if (score >= 85) return { label: 'TOP CONTENDER // 1ST PLACE', color: 'border-[#4EBA6F] text-[#4EBA6F] bg-[#0c1f13]' };
    if (score >= 70) return { label: 'FINALIST // RUNNER UP', color: 'border-[#E6A360] text-[#E6A360] bg-[#1a150e]' };
    if (score >= 50) return { label: 'FUNCTIONAL MVP', color: 'border-[#E5B54F] text-[#E5B54F] bg-[#1c1809]' };
    return { label: 'NEEDS IMPROVEMENT', color: 'border-[#DC8381] text-[#DC8381] bg-[#220d0d]' };
  };

  const getProjectMastery = (percentage: number) => {
    if (percentage >= 80) return { label: 'MASTERED', color: 'border-[#4EBA6F] text-[#4EBA6F] bg-[#0c1f13]' };
    if (percentage >= 50) return { label: 'PARTIAL', color: 'border-[#E6A360] text-[#E6A360] bg-[#1a150e]' };
    return { label: 'NEEDS REVIEW', color: 'border-[#DC8381] text-[#DC8381] bg-[#220d0d]' };
  };

  // Archive items combining Hackathon evaluations and Project sessions
  const hackathonItems = (dashboard?.hackathonEvaluations || []).map((h) => ({
    type: 'hackathon' as const,
    id: h.id,
    repoName: h.repoName,
    repoId: h.repoId,
    status: h.status,
    totalScore: h.totalScore,
    maxScore: 100,
    percentage: Math.round(h.totalScore),
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
    data: h,
  }));

  const projectItems = (dashboard?.projectSessions || []).map((p) => ({
    type: 'project' as const,
    id: p.id,
    repoName: p.repoName,
    repoId: p.repoId,
    status: p.status,
    totalScore: p.score,
    maxScore: p.maxScore,
    percentage: p.percentage,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    flowTag: p.flowTag,
    data: p,
  }));

  const allArchiveItems = [...hackathonItems, ...projectItems].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  const completedCount = allArchiveItems.filter((i) => i.status === 'completed').length;

  const filteredArchiveItems = allArchiveItems.filter((item) => {
    if (evalFilterTab === 'hackathon' && item.type !== 'hackathon') return false;
    if (evalFilterTab === 'project' && item.type !== 'project') return false;
    if (statusFilter === 'completed' && item.status !== 'completed') return false;
    return true;
  });

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
            Evaluation & Performance Dashboard
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

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-8">
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
              02 // Flow Sessions Run
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
              04 // Target Flow Focus
            </div>
            <div className="text-xl font-bold uppercase text-[#E6A360] truncate">
              {dashboard?.suggestedFocus ? dashboard.suggestedFocus : 'NOMINAL // CAUGHT UP'}
            </div>
          </div>
        </div>

        {/* DEDICATED PROJECT EVALUATION & HACKATHON EVALUATION SECTION */}
        {selectedRepo && (
          <section className="bg-[#121212] border border-[#262626] p-5 sm:p-7 flex flex-col gap-6 font-mono">
            {/* Project Header & Section Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#262626]">
              <div>
                <div className="flex items-center gap-2 text-[10px] text-[#A1A1A1] uppercase tracking-wider mb-1">
                  <span>Selected Project:</span>
                  <select
                    value={selectedRepo.id}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    className="bg-[#000000] border border-[#333333] text-[#EDEDED] px-2 py-0.5 text-xs font-bold uppercase focus:outline-none focus:border-[#EDEDED] cursor-pointer"
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.owner}/{r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <h2 className="text-lg font-bold uppercase tracking-tight text-[#EDEDED]">
                  Project Evaluation & Defense Suite
                </h2>
                <p className="text-xs text-[#888888] mt-0.5">
                  Select an evaluation mode below to test this repository against specialized judging rubrics.
                </p>
              </div>

              {/* The Two Distinct Sections Toggle */}
              <div className="flex items-center p-1 bg-[#000000] border border-[#333333] shrink-0">
                <button
                  onClick={() => setActiveEvaluationSection('hackathon')}
                  className={`px-4 py-2 text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                    activeEvaluationSection === 'hackathon'
                      ? 'bg-[#E6A360] text-[#000000] shadow-sm'
                      : 'bg-transparent text-[#A1A1A1] hover:text-[#EDEDED]'
                  }`}
                >
                  <span>⚡</span>
                  <span>Hackathon Evaluation</span>
                </button>

                <button
                  onClick={() => setActiveEvaluationSection('project')}
                  className={`px-4 py-2 text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                    activeEvaluationSection === 'project'
                      ? 'bg-[#EDEDED] text-[#000000] shadow-sm'
                      : 'bg-transparent text-[#A1A1A1] hover:text-[#EDEDED]'
                  }`}
                >
                  <span>🔍</span>
                  <span>Project Evaluation</span>
                </button>
              </div>
            </div>

            {/* SECTION 1: HACKATHON EVALUATION UI */}
            {activeEvaluationSection === 'hackathon' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1a150e] border border-[#E6A360]/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#E6A360] text-[#000000] flex items-center justify-center font-bold text-lg shrink-0">
                      ⚡
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#E6A360] uppercase tracking-wider">
                        <span>Hackathon Jury & Defense Mode</span>
                        <span>&bull;</span>
                        <span>6 Weighted Criteria (100% Total)</span>
                      </div>
                      <h3 className="text-sm font-bold uppercase text-[#EDEDED] mt-0.5">
                        Evaluating: {selectedRepo.owner}/{selectedRepo.name}
                      </h3>
                      <p className="text-xs text-[#A1A1A1] mt-0.5">
                        Simulates an official hackathon judging defense evaluating problem understanding (25%), solution approach (25%), project clarity (20%), innovation (15%), feasibility (10%), and prototype implementation (5%).
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {selectedRepo.latestHackathonEvaluation?.status === 'in_progress' ? (
                      <Link
                        href={`/hackathon/${selectedRepo.latestHackathonEvaluation.id}`}
                        className="px-5 py-2.5 bg-[#E6A360] text-[#000000] font-bold text-xs uppercase hover:bg-[#f0b070] transition-all cursor-pointer"
                      >
                        Resume Defense &rarr;
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleStartHackathonEvaluation(selectedRepo)}
                        disabled={startingEvaluation}
                        className="px-5 py-2.5 bg-[#E6A360] text-[#000000] font-bold text-xs uppercase hover:bg-[#f0b070] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {startingEvaluation ? 'Starting...' : 'Start Hackathon Evaluation &rarr;'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 6 Hackathon Evaluation Metrics Display */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1A1]">
                      Official Hackathon Evaluation Criteria & Weightings
                    </span>
                    <span className="text-[10px] text-[#E6A360] uppercase">
                      Questions are generated across all 6 criteria
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {HACKATHON_CRITERIA.map((criterion, idx) => (
                      <div
                        key={criterion.id}
                        className="p-4 bg-[#000000] border border-[#262626] hover:border-[#E6A360]/50 transition-colors flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-[#A1A1A1] uppercase tracking-wider">
                              CRITERION 0{idx + 1}
                            </span>
                            <span className="px-1.5 py-0.5 bg-[#1a150e] border border-[#E6A360] text-[#E6A360] text-[9px] font-bold uppercase">
                              {criterion.weight}% Weight
                            </span>
                          </div>
                          <h4 className="text-xs font-bold uppercase text-[#EDEDED] leading-tight">
                            {criterion.title}
                          </h4>
                          <div className="mt-2 space-y-1">
                            {criterion.subcriteria.map((item, subIdx) => (
                              <div key={subIdx} className="text-[10px] text-[#777777] flex items-start gap-1.5 leading-snug">
                                <span className="text-[#E6A360]">&bull;</span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#1f1f1f] text-[9px] text-[#A1A1A1] italic">
                          Judge Focus: {criterion.judgeFocus}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Past Hackathon Defense Performance */}
                {selectedRepo.latestHackathonEvaluation && (
                  <div className="p-4 bg-[#000000] border border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider">Latest Hackathon Jury Result</span>
                      <div className="text-sm font-bold uppercase text-[#EDEDED] mt-0.5">
                        Score: {selectedRepo.latestHackathonEvaluation.total_score} / 100 PTS
                        <span className="text-xs text-[#E6A360] ml-2">
                          ({selectedRepo.latestHackathonEvaluation.status.toUpperCase()})
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/hackathon/${selectedRepo.latestHackathonEvaluation.id}`}
                      className="px-4 py-1.5 bg-[#EDEDED] text-[#000000] text-[10px] uppercase font-bold hover:bg-white transition-all"
                    >
                      View Hackathon Scorecard &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: PROJECT EVALUATION UI */}
            {activeEvaluationSection === 'project' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171717] border border-[#333333] p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#EDEDED] text-[#000000] flex items-center justify-center font-bold text-lg shrink-0">
                      🔍
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#EDEDED] uppercase tracking-wider">
                        <span>Code Architecture & Flow Tracing Mode</span>
                        <span>&bull;</span>
                        <span>5 Verified Metrics</span>
                      </div>
                      <h3 className="text-sm font-bold uppercase text-[#EDEDED] mt-0.5">
                        Evaluating: {selectedRepo.owner}/{selectedRepo.name}
                      </h3>
                      <p className="text-xs text-[#A1A1A1] mt-0.5">
                        Tests code comprehension, execution order, relative imports, and line citations against topological dependency graphs.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Link
                      href={`/repos/${selectedTargetId}`}
                      className="px-4 py-2.5 bg-transparent border border-[#333333] hover:border-[#EDEDED] text-[#EDEDED] text-xs uppercase font-semibold transition-all"
                    >
                      Explore Graph
                    </Link>
                    <button
                      onClick={() => handleStartProjectSession(selectedAnalysisId, undefined, 5, selectedRepo.id)}
                      disabled={startingEvaluation}
                      className="px-5 py-2.5 bg-[#EDEDED] text-[#000000] font-bold text-xs uppercase hover:bg-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      {startingEvaluation ? 'Starting...' : 'Start Flow Evaluation &rarr;'}
                    </button>
                  </div>
                </div>

                {/* 5 Project Evaluation Metrics Display */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1A1]">
                      Project Architecture & Comprehension Metrics
                    </span>
                    <span className="text-[10px] text-[#A1A1A1] uppercase">
                      Assessed with line-level code citations
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PROJECT_EVALUATION_METRICS.map((metric, idx) => (
                      <div
                        key={metric.id}
                        className="p-4 bg-[#000000] border border-[#262626] hover:border-[#EDEDED]/40 transition-colors flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-[#A1A1A1] uppercase tracking-wider">
                              METRIC 0{idx + 1}
                            </span>
                            <span className="px-1.5 py-0.5 bg-[#171717] border border-[#333333] text-[#EDEDED] text-[9px] font-bold uppercase">
                              {metric.weight}% Weight
                            </span>
                          </div>
                          <h4 className="text-xs font-bold uppercase text-[#EDEDED] leading-tight">
                            {metric.title}
                          </h4>
                          <p className="text-[11px] text-[#888888] mt-2 leading-relaxed">
                            {metric.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#1f1f1f] text-[9px] text-[#A1A1A1] italic">
                          Focus: {metric.focus}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Past Flow Session Status */}
                {selectedRepo.latestSession && (
                  <div className="p-4 bg-[#000000] border border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-[#A1A1A1] uppercase tracking-wider">Latest Session Status</span>
                      <div className="text-sm font-bold uppercase text-[#EDEDED] mt-0.5">
                        Status: {selectedRepo.latestSession.status.toUpperCase()}
                        <span className="text-xs text-[#A1A1A1] ml-2">
                          (Question {selectedRepo.latestSession.current_index}/{selectedRepo.latestSession.total_questions})
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/sessions/${selectedRepo.latestSession.id}`}
                      className="px-4 py-1.5 bg-[#EDEDED] text-[#000000] text-[10px] uppercase font-bold hover:bg-white transition-all"
                    >
                      {selectedRepo.latestSession.status === 'in_progress' ? 'Resume Session &rarr;' : 'Review Session &rarr;'}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ======================================================== */}
        {/* COMPLETED EVALUATION MARKS & CORRECTIONS ARCHIVE */}
        {/* ======================================================== */}
        <section className="bg-[#121212] border border-[#262626] p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#E6A360] uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6A360] animate-pulse" />
                <span>Permanent Database Archive</span>
                <span className="text-[#333333]">&bull;</span>
                <span className="text-[#A1A1A1]">Stored & Persistent Across Sessions</span>
              </div>
              <h2 className="text-base font-bold uppercase tracking-tight text-[#EDEDED]">
                Evaluation Marks & Corrections Archive
              </h2>
              <p className="text-xs text-[#A1A1A1] mt-0.5">
                Every completed Hackathon Defense and Project Comprehension evaluation is permanently stored with full marks, judge corrections, questions, your answers, and line citations.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#000000] p-1 border border-[#262626]">
                <button
                  onClick={() => setEvalFilterTab('all')}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                    evalFilterTab === 'all'
                      ? 'bg-[#EDEDED] text-[#000000] font-bold'
                      : 'text-[#A1A1A1] hover:text-[#EDEDED]'
                  }`}
                >
                  All ({allArchiveItems.length})
                </button>
                <button
                  onClick={() => setEvalFilterTab('hackathon')}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                    evalFilterTab === 'hackathon'
                      ? 'bg-[#E6A360] text-[#000000] font-bold'
                      : 'text-[#A1A1A1] hover:text-[#E6A360]'
                  }`}
                >
                  <span>⚡</span>
                  <span>Hackathon ({hackathonItems.length})</span>
                </button>
                <button
                  onClick={() => setEvalFilterTab('project')}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                    evalFilterTab === 'project'
                      ? 'bg-[#EDEDED] text-[#000000] font-bold'
                      : 'text-[#A1A1A1] hover:text-[#EDEDED]'
                  }`}
                >
                  <span>🔍</span>
                  <span>Project ({projectItems.length})</span>
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[#000000] p-1 border border-[#262626]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[#262626] text-[#EDEDED] font-bold'
                      : 'text-[#888888] hover:text-[#EDEDED]'
                  }`}
                >
                  All Statuses
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'completed'
                      ? 'bg-[#0c1f13] text-[#4EBA6F] border border-[#4EBA6F]/50 font-bold'
                      : 'text-[#888888] hover:text-[#4EBA6F]'
                  }`}
                >
                  <span>✓</span>
                  <span>Completed Only ({completedCount})</span>
                </button>
              </div>
            </div>
          </div>

          {filteredArchiveItems.length === 0 ? (
            <div className="p-8 text-center bg-[#000000] border border-[#262626] flex flex-col items-center justify-center gap-3">
              <span className="text-2xl">📋</span>
              <p className="text-xs font-mono text-[#A1A1A1] uppercase tracking-wider">
                No evaluations found in this category yet.
              </p>
              <p className="text-[11px] text-[#777777] max-w-md">
                Launch a Hackathon Jury Defense or Project Code Comprehension session above. Once submitted, your scores, judge feedback, strengths, and corrections will be permanently archived here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredArchiveItems.map((item) => {
                const isExpanded = expandedEvalId === item.id;
                const isHackathon = item.type === 'hackathon';
                const hackData = isHackathon ? (item.data as CompletedHackathonItem) : null;
                const projectData = !isHackathon ? (item.data as CompletedProjectSessionItem) : null;
                const placement = isHackathon ? getHackathonPlacement(item.totalScore) : null;
                const mastery = !isHackathon ? getProjectMastery(item.percentage) : null;

                return (
                  <div
                    key={item.id}
                    className="bg-[#000000] border border-[#262626] transition-all hover:border-[#3a3a3a]"
                  >
                    {/* Header Bar */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 flex items-center justify-center font-bold text-base shrink-0 ${
                            isHackathon
                              ? 'bg-[#E6A360] text-[#000000]'
                              : 'bg-[#EDEDED] text-[#000000]'
                          }`}
                        >
                          {isHackathon ? '⚡' : '🔍'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className={`text-[9px] font-mono uppercase px-2 py-0.5 border font-bold ${
                                isHackathon
                                  ? 'border-[#E6A360] text-[#E6A360] bg-[#1a150e]'
                                  : 'border-[#EDEDED] text-[#EDEDED] bg-[#1a1a1a]'
                              }`}
                            >
                              {isHackathon ? 'HACKATHON DEFENSE' : `PROJECT COMPREHENSION • ${projectData?.flowTag || 'FLOW'}`}
                            </span>
                            <span
                              className={`text-[9px] font-mono uppercase px-2 py-0.5 border ${
                                item.status === 'completed'
                                  ? 'border-[#4EBA6F] text-[#4EBA6F] bg-[#0c1f13]'
                                  : 'border-[#E5B54F] text-[#E5B54F] bg-[#1c1809]'
                              }`}
                            >
                              {item.status === 'completed' ? 'EVALUATION COMPLETED' : 'IN PROGRESS'}
                            </span>
                            {placement && (
                              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border font-bold ${placement.color}`}>
                                {placement.label}
                              </span>
                            )}
                            {mastery && (
                              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border font-bold ${mastery.color}`}>
                                {mastery.label}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-mono text-sm font-bold text-[#EDEDED]">
                              {item.repoName}
                            </h3>
                            <span className="text-[#333333]">&bull;</span>
                            <span className="font-mono text-[10px] text-[#888888]">
                              ID: {item.id}
                            </span>
                            <span className="text-[#333333]">&bull;</span>
                            <span className="font-mono text-[10px] text-[#888888]">
                              {new Date(item.updatedAt || item.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score & Toggle Actions */}
                      <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                        <div className="text-right">
                          <div className="font-mono text-base font-bold text-[#EDEDED]">
                            {item.totalScore}
                            <span className="text-xs text-[#888888]"> / {item.maxScore} PTS</span>
                          </div>
                          <div className="text-[10px] font-mono text-[#A1A1A1] uppercase">
                            {isHackathon
                              ? `${hackData?.criterionResults?.length || 0} / 6 Criteria Scored`
                              : `${projectData?.answeredCount || 0} / ${projectData?.totalQuestions || 0} Questions Evaluated`}
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedEvalId(isExpanded ? null : item.id)}
                          className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            isExpanded
                              ? 'bg-[#262626] border-[#444444] text-[#EDEDED]'
                              : isHackathon
                              ? 'bg-[#1a150e] border-[#E6A360] text-[#E6A360] hover:bg-[#E6A360] hover:text-[#000000]'
                              : 'bg-[#171717] border-[#EDEDED] text-[#EDEDED] hover:bg-white hover:text-black'
                          }`}
                        >
                          <span>{isExpanded ? '▲ Hide Details' : '▼ View Marks & Corrections'}</span>
                        </button>

                        <Link
                          href={isHackathon ? `/hackathon/${item.id}` : `/sessions/${item.id}`}
                          className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider font-semibold border border-[#333333] text-[#A1A1A1] hover:text-[#EDEDED] hover:border-[#EDEDED] transition-colors"
                        >
                          Open &rarr;
                        </Link>
                      </div>
                    </div>

                    {/* EXPANDED DETAILED MARKS & CORRECTIONS */}
                    {isExpanded && (
                      <div className="border-t border-[#262626] bg-[#0d0d0d] p-5 flex flex-col gap-6">
                        {/* HACKATHON CRITERION DETAILS */}
                        {isHackathon && hackData && (
                          <div className="flex flex-col gap-5">
                            <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#E6A360]">
                                Official Hackathon Jury Scorecard & Detailed Corrections
                              </span>
                              <span className="text-[10px] font-mono text-[#888888] uppercase">
                                Overall Score: {hackData.totalScore} / 100
                              </span>
                            </div>

                            {(!hackData.criterionResults || hackData.criterionResults.length === 0) ? (
                              <p className="text-xs font-mono text-[#888888]">
                                No answers evaluated for this defense yet.
                              </p>
                            ) : (
                              <div className="flex flex-col gap-4">
                                {hackData.criterionResults.map((cr, cIdx) => (
                                  <div
                                    key={cr.criterion_id || cIdx}
                                    className="border border-[#262626] bg-[#121212] p-4 flex flex-col gap-3"
                                  >
                                    {/* Criterion Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-[#888888]">
                                          CRITERION {cIdx + 1}
                                        </span>
                                        <h4 className="text-xs font-bold uppercase text-[#EDEDED]">
                                          {cr.criterion_title}
                                        </h4>
                                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#000000] border border-[#333333] text-[#A1A1A1]">
                                          {cr.weight}% WEIGHT
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border font-bold ${getVerdictBadge(cr.verdict)}`}>
                                          {cr.verdict.toUpperCase()}
                                        </span>
                                        <span className="font-mono text-xs font-bold text-[#EDEDED]">
                                          Score: {cr.score}/100 &bull; Weighted: {cr.weighted_score} pts
                                        </span>
                                      </div>
                                    </div>

                                    {/* Question */}
                                    <div>
                                      <span className="text-[9px] font-mono text-[#888888] uppercase tracking-wider block mb-1">
                                        Judging Panel Question:
                                      </span>
                                      <div className="p-2.5 bg-[#000000] border border-[#222222] text-xs font-mono text-[#EDEDED] leading-relaxed">
                                        {cr.question}
                                      </div>
                                    </div>

                                    {/* Candidate's Submitted Defense */}
                                    <div>
                                      <span className="text-[9px] font-mono text-[#888888] uppercase tracking-wider block mb-1">
                                        Your Team&apos;s Submitted Defense:
                                      </span>
                                      <div className="p-2.5 bg-[#000000] border border-[#222222] text-xs font-mono text-[#A1A1A1] leading-relaxed whitespace-pre-wrap">
                                        {cr.user_answer || '(No answer provided)'}
                                      </div>
                                    </div>

                                    {/* Strengths & Judge Corrections */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                      {/* Recognized Strengths */}
                                      <div className="p-3 bg-[#0c1f13] border border-[#4EBA6F]/30">
                                        <span className="text-[10px] font-mono font-bold uppercase text-[#4EBA6F] block mb-1.5 flex items-center gap-1.5">
                                          <span>✓</span>
                                          <span>Recognized Strengths ({cr.strengths?.length || 0})</span>
                                        </span>
                                        {cr.strengths && cr.strengths.length > 0 ? (
                                          <ul className="list-disc list-inside text-xs font-mono text-[#EDEDED] space-y-1">
                                            {cr.strengths.map((s, sIdx) => (
                                              <li key={sIdx}>{s}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-[11px] font-mono text-[#888888]">No significant strengths identified.</p>
                                        )}
                                      </div>

                                      {/* Judge Corrections & Missing Gaps */}
                                      <div className="p-3 bg-[#220d0d] border border-[#DC8381]/30">
                                        <span className="text-[10px] font-mono font-bold uppercase text-[#DC8381] block mb-1.5 flex items-center gap-1.5">
                                          <span>✕</span>
                                          <span>Judge Corrections & Identified Gaps ({cr.gaps?.length || 0})</span>
                                        </span>
                                        {cr.gaps && cr.gaps.length > 0 ? (
                                          <ul className="list-disc list-inside text-xs font-mono text-[#EDEDED] space-y-1">
                                            {cr.gaps.map((g, gIdx) => (
                                              <li key={gIdx}>{g}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-[11px] font-mono text-[#888888]">No critical gaps flagged by judges.</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Judge Feedback & Tip */}
                                    {cr.feedback && (
                                      <div className="p-3 bg-[#171717] border border-[#333333]">
                                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1A1] block mb-1">
                                          Judge Feedback & Evaluation Notes:
                                        </span>
                                        <p className="text-xs font-mono text-[#EDEDED] leading-relaxed">
                                          {cr.feedback}
                                        </p>
                                      </div>
                                    )}

                                    {cr.judge_tips && (
                                      <div className="p-3 bg-[#1a150e] border border-[#E6A360]/30 flex items-start gap-2">
                                        <span className="text-[#E6A360] font-bold text-xs shrink-0">💡 Tip:</span>
                                        <p className="text-xs font-mono text-[#E6A360] leading-relaxed">
                                          {cr.judge_tips}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* PROJECT COMPREHENSION TRACE DETAILS */}
                        {!isHackathon && projectData && (
                          <div className="flex flex-col gap-5">
                            <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#EDEDED]">
                                Code Comprehension Questions & Evaluated Attempts
                              </span>
                              <span className="text-[10px] font-mono text-[#888888] uppercase">
                                Flow: {projectData.flowTag} &bull; Score: {projectData.score} / {projectData.maxScore} ({projectData.percentage}%)
                              </span>
                            </div>

                            {(!projectData.questions || projectData.questions.length === 0) ? (
                              <p className="text-xs font-mono text-[#888888]">
                                No question records found for this session.
                              </p>
                            ) : (
                              <div className="flex flex-col gap-4">
                                {projectData.questions.map((q) => {
                                  const attempt = q.attempt;

                                  return (
                                    <div
                                      key={q.id}
                                      className="border border-[#262626] bg-[#121212] p-4 flex flex-col gap-3"
                                    >
                                      {/* Question Header */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono text-[#888888]">
                                            QUESTION #{q.position}
                                          </span>
                                          <span className="text-xs font-bold uppercase text-[#EDEDED]">
                                            Flow Step
                                          </span>
                                        </div>

                                        {attempt ? (
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border font-bold ${getVerdictBadge(attempt.verdict)}`}>
                                              {attempt.verdict.toUpperCase()}
                                            </span>
                                            <span className="font-mono text-xs font-bold text-[#EDEDED]">
                                              Marks: {attempt.score} / {attempt.maxScore} pts
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 border border-[#333333] text-[#888888]">
                                            NOT ATTEMPTED
                                          </span>
                                        )}
                                      </div>

                                      {/* Prompt */}
                                      <div>
                                        <span className="text-[9px] font-mono text-[#888888] uppercase tracking-wider block mb-1">
                                          Comprehension Question:
                                        </span>
                                        <div className="p-2.5 bg-[#000000] border border-[#222222] text-xs font-mono text-[#EDEDED] leading-relaxed">
                                          {q.question}
                                        </div>
                                      </div>

                                      {attempt ? (
                                        <>
                                          {/* Student Explanation */}
                                          <div>
                                            <span className="text-[9px] font-mono text-[#888888] uppercase tracking-wider block mb-1">
                                              Your Mental Model Explanation:
                                            </span>
                                            <div className="p-2.5 bg-[#000000] border border-[#222222] text-xs font-mono text-[#A1A1A1] leading-relaxed whitespace-pre-wrap">
                                              {attempt.answer}
                                            </div>
                                          </div>

                                          {/* Covered vs Missed Facts */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                            {/* Covered */}
                                            <div className="p-3 bg-[#0c1f13] border border-[#4EBA6F]/30">
                                              <span className="text-[10px] font-mono font-bold uppercase text-[#4EBA6F] block mb-1.5 flex items-center gap-1.5">
                                                <span>✓</span>
                                                <span>Covered Execution Facts ({attempt.covered.length})</span>
                                              </span>
                                              {attempt.covered.length > 0 ? (
                                                <ul className="list-disc list-inside text-xs font-mono text-[#EDEDED] space-y-1">
                                                  {attempt.covered.map((factId, fIdx) => {
                                                    const matchFact = q.expectedFacts.find((f) => f.id === factId);
                                                    return (
                                                      <li key={fIdx}>
                                                        {matchFact ? matchFact.fact : factId}
                                                      </li>
                                                    );
                                                  })}
                                                </ul>
                                              ) : (
                                                <p className="text-[11px] font-mono text-[#888888]">No verified execution facts covered.</p>
                                              )}
                                            </div>

                                            {/* Missed / Corrections */}
                                            <div className="p-3 bg-[#220d0d] border border-[#DC8381]/30">
                                              <span className="text-[10px] font-mono font-bold uppercase text-[#DC8381] block mb-1.5 flex items-center gap-1.5">
                                                <span>✕</span>
                                                <span>Missed Code Facts & Corrections ({attempt.missed.length})</span>
                                              </span>
                                              {attempt.missed.length > 0 ? (
                                                <ul className="list-disc list-inside text-xs font-mono text-[#EDEDED] space-y-1">
                                                  {attempt.missed.map((factId, fIdx) => {
                                                    const matchFact = q.expectedFacts.find((f) => f.id === factId);
                                                    return (
                                                      <li key={fIdx}>
                                                        <span>{matchFact ? matchFact.fact : factId}</span>
                                                        {matchFact && (
                                                          <span className="text-[10px] text-[#DC8381] ml-1">
                                                            [{matchFact.file} L{matchFact.startLine}-L{matchFact.endLine}]
                                                          </span>
                                                        )}
                                                      </li>
                                                    );
                                                  })}
                                                </ul>
                                              ) : (
                                                <p className="text-[11px] font-mono text-[#888888]">All expected code facts were covered!</p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Citations */}
                                          {attempt.citations && attempt.citations.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                              <span className="text-[9px] font-mono text-[#888888] uppercase">Code Citations:</span>
                                              {attempt.citations.map((c, cIdx) => (
                                                <span
                                                  key={cIdx}
                                                  className="text-[9px] font-mono px-2 py-0.5 bg-[#000000] border border-[#333333] text-[#A1A1A1]"
                                                >
                                                  {c.file} (Lines {c.startLine}-{c.endLine})
                                                </span>
                                              ))}
                                            </div>
                                          )}

                                          {/* Feedback */}
                                          {attempt.feedback && (
                                            <div className="p-3 bg-[#171717] border border-[#333333]">
                                              <span className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1A1] block mb-1">
                                                System Correction & Explanation:
                                              </span>
                                              <p className="text-xs font-mono text-[#EDEDED] leading-relaxed">
                                                {attempt.feedback}
                                              </p>
                                            </div>
                                          )}
                                        </>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
              onClick={() => handleStartProjectSession('demo', dashboard.suggestedFocus || undefined)}
              className="px-4 py-2 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] font-mono uppercase tracking-wider font-semibold transition-all duration-140 shrink-0 cursor-pointer"
            >
              Start Targeted Session &rarr;
            </button>
          </div>
        )}

        {/* My Repositories Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#EDEDED]">
                Repositories Under Comprehension
              </h2>
              <p className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider mt-0.5">
                All previously indexed and analyzed repositories in your database
              </p>
            </div>
            <span className="font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
              {repos.length} Repositories Indexed
            </span>
          </div>

          <div className="bg-[#000000] border border-[#262626]">
            {repos.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <p className="text-xs font-mono text-[#A1A1A1] uppercase tracking-wider">
                  No repositories visited yet.
                </p>
                <Link
                  href="/"
                  className="px-4 py-2 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] font-mono uppercase tracking-wider font-semibold transition-all"
                >
                  + Analyze First Repository
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#262626]">
                {repos.map((repo) => {
                  const targetId = repo.owner === 'demo' ? 'demo' : repo.id;
                  const targetAnalysisId = repo.analysisId || targetId;
                  const hasInProgressSession = repo.latestSession?.status === 'in_progress';
                  const isSelected = selectedRepo?.id === repo.id;

                  return (
                    <div
                      key={repo.id}
                      className={`p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isSelected ? 'bg-[#1c1c1c] border-l-2 border-l-[#E6A360]' : 'bg-[#171717] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedRepoId(repo.id)}
                            className="font-mono text-xs font-bold text-[#EDEDED] hover:underline text-left cursor-pointer"
                          >
                            {repo.owner}/{repo.name}
                          </button>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 border border-[#333333] text-[#A1A1A1] bg-[#000000]">
                            INDEXED
                          </span>
                          {hasInProgressSession && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 border border-[#E6A360] text-[#E6A360] bg-[#1a150e] animate-pulse">
                              SESSION IN PROGRESS (Q{repo.latestSession?.current_index || 1}/{repo.latestSession?.total_questions || 5})
                            </span>
                          )}
                          {repo.latestHackathonEvaluation && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 border border-[#E6A360] text-[#E6A360] bg-[#1a150e]">
                              HACKATHON: {repo.latestHackathonEvaluation.total_score}/100 PTS
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-[#A1A1A1] font-mono uppercase tracking-wider flex flex-wrap items-center gap-2">
                          <span>Branch: {repo.default_branch}</span>
                          <span className="text-[#333333]">&bull;</span>
                          <span>{repo.sessionsCount || 0} Sessions Run</span>
                          {repo.last_visited_at && (
                            <>
                              <span className="text-[#333333]">&bull;</span>
                              <span className="text-[#888888]">Visited {formatRelativeTime(repo.last_visited_at)}</span>
                            </>
                          )}
                          {repo.latestCommitSha && (
                            <>
                              <span className="text-[#333333]">&bull;</span>
                              <span className="text-[#555555]">SHA: {repo.latestCommitSha.slice(0, 7)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider shrink-0">
                        {/* Quick Hackathon Evaluation Button */}
                        <button
                          onClick={() => {
                            setSelectedRepoId(repo.id);
                            setActiveEvaluationSection('hackathon');
                            handleStartHackathonEvaluation(repo);
                          }}
                          className="px-3 py-1.5 bg-[#1a150e] text-[#E6A360] border border-[#E6A360] hover:bg-[#E6A360] hover:text-[#000000] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>⚡</span>
                          <span>Hackathon Eval</span>
                        </button>

                        {/* Quick Project Evaluation Button */}
                        <button
                          onClick={() => {
                            setSelectedRepoId(repo.id);
                            setActiveEvaluationSection('project');
                            handleStartProjectSession(targetAnalysisId, undefined, 5, repo.id);
                          }}
                          className="px-3 py-1.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white font-semibold transition-colors cursor-pointer"
                        >
                          Project Eval &rarr;
                        </button>

                        <Link
                          href={`/repos/${targetId}`}
                          className="px-3 py-1.5 bg-transparent border border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED] transition-colors"
                        >
                          Graph
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
