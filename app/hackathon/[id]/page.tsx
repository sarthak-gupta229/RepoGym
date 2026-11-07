'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavbarAuth } from '@/components/NavbarAuth';
import { FileViewer } from '@/components/FileViewer';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { SpeakerButton } from '@/components/SpeakerButton';
import { HACKATHON_CRITERIA, HackathonCriterion } from '@/lib/hackathon';
import { HackathonQuestion } from '@/lib/schemas';
import { HackathonEvaluation, HackathonCriterionResult } from '@/lib/store';

function HackathonPageContent() {
  const params = useParams();
  const router = useRouter();
  const evaluationId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<HackathonEvaluation | null>(null);
  const [analysis, setAnalysis] = useState<{
    id: string;
    file_map: Record<string, string>;
    graph?: any;
    flows?: any[];
  } | null>(null);
  const [repo, setRepo] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<HackathonQuestion | null>(null);

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedResult, setLastSubmittedResult] = useState<HackathonCriterionResult | null>(null);

  // File structure viewer state - hidden under button by default
  const [showFileTree, setShowFileTree] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hackathon/evaluations/${evaluationId}`);
      if (!res.ok) {
        throw new Error('Failed to load hackathon evaluation');
      }
      const data = await res.json();
      setEvaluation(data.evaluation);
      setAnalysis(data.analysis);
      setRepo(data.repo);
      setCurrentQuestion(data.currentQuestion);

      // If there are previous results, show the latest one or prepare question
      if (data.evaluation?.criterion_results?.length > 0) {
        const lastIdx = data.evaluation.criterion_results.length - 1;
        setLastSubmittedResult(data.evaluation.criterion_results[lastIdx]);
      }

      if (data.analysis?.file_map) {
        const firstFile = Object.keys(data.analysis.file_map)[0];
        setSelectedFile(firstFile || null);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Could not load evaluation session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (evaluationId) {
      loadEvaluation();
    }
  }, [evaluationId]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !currentQuestion || !evaluation) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/hackathon/evaluations/${evaluation.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answer.trim(),
          question: currentQuestion,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to evaluate answer');
      }

      setEvaluation(data.evaluation);
      setLastSubmittedResult(data.result);
      setCurrentQuestion(data.nextQuestion || null);
      setAnswer('');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextCriterion = () => {
    setLastSubmittedResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-[10px] font-mono uppercase tracking-wider text-[#A1A1A1]">
        Initializing Hackathon Jury Evaluation & Metrics Engine...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#000000] p-6 text-center font-mono text-[#EDEDED]">
        <p className="text-xs text-[#DC8381] uppercase tracking-wider">Hackathon evaluation session not found.</p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-[#EDEDED] text-[#000000] text-[10px] uppercase font-semibold hover:bg-white"
        >
          Return to Dashboard &rarr;
        </Link>
      </div>
    );
  }

  const isCompleted = evaluation.status === 'completed';
  const repoTitle = repo ? `${repo.owner}/${repo.name}` : 'demo/login-service';
  const allFiles = analysis?.file_map ? Object.keys(analysis.file_map).sort() : [];
  const filteredFiles = allFiles.filter((f) =>
    f.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const currentCriterionIdx = evaluation.current_criterion_index;
  const activeCriterion: HackathonCriterion | undefined = HACKATHON_CRITERIA[currentCriterionIdx];

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'exceptional':
        return 'text-[#4EBA6F] border-[#4EBA6F] bg-[#0c1f13]';
      case 'strong':
        return 'text-[#E6A360] border-[#E6A360] bg-[#1a150e]';
      case 'needs_work':
        return 'text-[#E5B54F] border-[#E5B54F] bg-[#1c1809]';
      default:
        return 'text-[#DC8381] border-[#DC8381] bg-[#220d0d]';
    }
  };

  const getPlacementBadge = (score: number) => {
    if (score >= 85) return { label: 'TOP CONTENDER // 1ST PLACE BRACKET', color: 'border-[#4EBA6F] text-[#4EBA6F]' };
    if (score >= 70) return { label: 'FINALIST // HIGH IMPACT RUNNER', color: 'border-[#E6A360] text-[#E6A360]' };
    if (score >= 50) return { label: 'FUNCTIONAL MVP // HONORABLE MENTION', color: 'border-[#E5B54F] text-[#E5B54F]' };
    return { label: 'EARLY PROTOTYPE // NEEDS WORK', color: 'border-[#DC8381] text-[#DC8381]' };
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#EDEDED]">
      {/* Top Header */}
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
          <span className="px-2 py-0.5 bg-[#1a150e] border border-[#E6A360] text-[#E6A360] font-mono text-[10px] uppercase font-bold tracking-wider">
            Hackathon Jury Mode
          </span>
          <span className="text-[#333333]">/</span>
          <span className="font-mono text-xs text-[#EDEDED] font-semibold">
            {repoTitle}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
          <div className="px-3 py-1 bg-[#171717] border border-[#262626] text-[#A1A1A1]">
            Live Score:{' '}
            <span className="text-[#EDEDED] font-bold">
              {evaluation.total_score} / 100 PTS
            </span>
          </div>

          <button
            onClick={() => setShowFileTree(!showFileTree)}
            className={`px-3 py-1 border text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
              showFileTree
                ? 'border-[#E6A360] bg-[#1a150e] text-[#E6A360]'
                : 'border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED]'
            }`}
            title="Toggle Repository Files"
          >
            <span>📁</span>
            <span>{showFileTree ? '[ Hide Repository Files ]' : `[ View Repository Files (${allFiles.length}) ]`}</span>
          </button>

          <Link
            href="/dashboard"
            className="px-3 py-1 bg-transparent border border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED] transition-colors"
          >
            Dashboard
          </Link>
          <NavbarAuth />
        </div>
      </header>

      {/* Criteria Progress Tracker Bar */}
      <div className="border-b border-[#262626] bg-[#0d0d0d] px-6 py-2.5 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 min-w-[700px]">
          {HACKATHON_CRITERIA.map((criterion, idx) => {
            const result = evaluation.criterion_results.find(
              (r) => r.criterion_id === criterion.id
            );
            const isCurrent = !isCompleted && currentCriterionIdx === idx && !lastSubmittedResult;
            const isDone = Boolean(result);

            return (
              <div
                key={criterion.id}
                className={`flex-1 flex flex-col p-2 border font-mono text-[10px] uppercase tracking-wider transition-all ${
                  isCurrent
                    ? 'border-[#E6A360] bg-[#1a150e] text-[#FFF0D1]'
                    : isDone
                    ? 'border-[#262626] bg-[#171717] text-[#EDEDED]'
                    : 'border-[#1f1f1f] bg-[#000000] text-[#555555]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    0{idx + 1} // {criterion.weight}%
                  </span>
                  {isDone ? (
                    <span className="text-[#4EBA6F] font-bold">
                      {result?.weighted_score} pts
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[#E6A360] animate-pulse">EVALUATING</span>
                  ) : (
                    <span>QUEUED</span>
                  )}
                </div>
                <div className="text-[9px] truncate mt-0.5 text-[#A1A1A1]">
                  {criterion.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Workspace - 100% Focused on Question & Answer Defense */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Repository Files Drawer / Modal (Hidden under button by default) */}
        {showFileTree && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Dark Backdrop */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
              onClick={() => setShowFileTree(false)}
            />

            {/* Slide-over Drawer Panel */}
            <div className="relative w-full max-w-2xl sm:max-w-3xl h-full bg-[#121212] border-l border-[#262626] shadow-2xl flex flex-col font-mono z-10 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#262626] bg-[#171717] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📁</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#EDEDED] flex items-center gap-2">
                      <span>Repository Files</span>
                      <span className="px-1.5 py-0.5 bg-[#262626] text-[#A1A1A1] text-[10px]">
                        {allFiles.length} files
                      </span>
                    </div>
                    <div className="text-[10px] text-[#A1A1A1] truncate">
                      {repoTitle}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowFileTree(false)}
                  className="px-3 py-1 bg-[#262626] hover:bg-[#333333] text-[#EDEDED] text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer border border-[#333333]"
                >
                  ✕ Close Files
                </button>
              </div>

              {/* Filter input */}
              <div className="p-3 border-b border-[#262626] bg-[#0d0d0d]">
                <input
                  type="text"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Filter repository files (e.g. app.js, routes)..."
                  className="w-full text-xs px-3 py-1.5 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED]"
                />
              </div>

              {/* Drawer Content */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#262626] overflow-hidden">
                {/* File List */}
                <div className="md:col-span-5 overflow-y-auto p-2 space-y-1 text-xs">
                  {filteredFiles.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFile(f)}
                      className={`w-full text-left px-2.5 py-2 truncate border transition-colors cursor-pointer text-xs ${
                        selectedFile === f
                          ? 'border-[#E6A360] bg-[#1a150e] text-[#FFF0D1] font-semibold'
                          : 'border-transparent hover:border-[#333333] text-[#A1A1A1] hover:text-[#EDEDED]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                  {filteredFiles.length === 0 && (
                    <div className="p-4 text-center text-xs text-[#555555]">
                      No files match &quot;{fileSearch}&quot;
                    </div>
                  )}
                </div>

                {/* File Code Viewer */}
                <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-[#0a0a0a]">
                  {selectedFile && analysis?.file_map?.[selectedFile] ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="p-2 border-b border-[#262626] bg-[#141414] text-[10px] text-[#A1A1A1] uppercase truncate flex items-center justify-between">
                        <span>File: <strong className="text-[#EDEDED]">{selectedFile}</strong></span>
                        <span className="text-[9px] text-[#777777]">
                          {Math.round((analysis.file_map[selectedFile].length / 100) / 10)} KB
                        </span>
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <FileViewer
                          filePath={selectedFile}
                          content={analysis.file_map[selectedFile]}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-[#555555]">
                      Select a file from the list to view its contents
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Question & Answer Stage */}
        <div className="flex flex-col gap-6">
          {/* State A: Final Hackathon Scorecard when all criteria completed */}
          {isCompleted ? (
            <div className="bg-[#171717] border border-[#262626] p-6 sm:p-8 flex flex-col gap-6 font-mono">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-[#E6A360] uppercase tracking-wider mb-1 font-bold">
                    <span>★ Final Hackathon Jury Defense Scorecard</span>
                  </div>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-[#EDEDED]">
                    {repoTitle} Evaluation Complete
                  </h2>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#A1A1A1] uppercase tracking-wider">Weighted Total</div>
                  <div className="text-3xl font-bold text-[#EDEDED]">
                    {evaluation.total_score} <span className="text-base text-[#A1A1A1]">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Placement Tier Banner */}
              {(() => {
                const placement = getPlacementBadge(evaluation.total_score);
                return (
                  <div className={`p-4 border ${placement.color} bg-[#000000] flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏆</span>
                      <div>
                        <div className="text-[10px] text-[#A1A1A1] uppercase">Judge Placement Verdict</div>
                        <div className="text-sm font-bold uppercase tracking-tight">{placement.label}</div>
                      </div>
                    </div>
                    <span className="text-xs uppercase px-2 py-0.5 border border-current">Official Verdict</span>
                  </div>
                );
              })()}

              {/* Breakdown Matrix of all 6 Criteria */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">
                  Criteria Scoring Breakdown
                </h3>
                <div className="divide-y divide-[#262626] border border-[#262626] bg-[#000000]">
                  {evaluation.criterion_results.map((result, idx) => (
                    <div key={idx} className="p-4 flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[#A1A1A1] text-xs">#{idx + 1}</span>
                          <span className="text-xs font-bold uppercase text-[#EDEDED]">
                            {result.criterion_title} ({result.weight}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`px-2 py-0.5 border text-[10px] uppercase font-bold ${getVerdictColor(result.verdict)}`}>
                            {result.verdict}
                          </span>
                          <span className="text-[#EDEDED] font-bold">
                            {result.score}/100 &bull; {result.weighted_score}/{result.weight} pts
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#A1A1A1] mt-1">
                        <span className="text-[#EDEDED] font-semibold">Judge Feedback: </span>
                        {result.feedback}
                      </div>

                      {result.judge_tips && (
                        <div className="text-[10px] text-[#E6A360] bg-[#1a150e] border border-[#3a2810] p-2 mt-1">
                          <span className="font-bold">Pitch Table Tip: </span>
                          {result.judge_tips}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 bg-[#EDEDED] text-[#000000] hover:bg-white text-[10px] uppercase font-bold transition-all"
                >
                  Return to Dashboard &rarr;
                </Link>
                <Link
                  href={`/repos/${repo?.id === 'repo-demo' ? 'demo' : repo?.id || 'demo'}`}
                  className="px-5 py-2.5 bg-transparent border border-[#333333] hover:border-[#EDEDED] text-[#EDEDED] text-[10px] uppercase transition-all"
                >
                  Explore Code Flow Graph &rarr;
                </Link>
              </div>
            </div>
          ) : lastSubmittedResult ? (
            /* State B: Grade & Feedback view for the just-answered criterion */
            <div className="bg-[#171717] border border-[#262626] p-6 sm:p-8 flex flex-col gap-6 font-mono">
              <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
                <div>
                  <div className="text-[10px] text-[#E6A360] uppercase tracking-wider mb-1">
                    Criterion 0{evaluation.current_criterion_index} Graded
                  </div>
                  <h2 className="text-base font-bold uppercase tracking-tight text-[#EDEDED]">
                    {lastSubmittedResult.criterion_title} ({lastSubmittedResult.weight}% Weight)
                  </h2>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#A1A1A1] uppercase tracking-wider">Criterion Score</div>
                  <div className="text-2xl font-bold text-[#EDEDED]">
                    {lastSubmittedResult.score} <span className="text-sm text-[#A1A1A1]">/ 100</span>
                    <span className="text-xs text-[#E6A360] ml-2">
                      ({lastSubmittedResult.weighted_score} pts)
                    </span>
                  </div>
                </div>
              </div>

              {/* Verdict Badge */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#A1A1A1] uppercase">Jury Assessment:</span>
                <span className={`px-2.5 py-1 border text-[10px] uppercase font-bold ${getVerdictColor(lastSubmittedResult.verdict)}`}>
                  {lastSubmittedResult.verdict}
                </span>
              </div>

              {/* Strengths & Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0c1f13] border border-[#4EBA6F]/40 flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-[#4EBA6F] uppercase tracking-wider flex items-center gap-1.5">
                    <span>✓</span>
                    <span>Strengths Recognized by Jury</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-[#EDEDED]">
                    {lastSubmittedResult.strengths?.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#4EBA6F]">&bull;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-[#1a150e] border border-[#E6A360]/40 flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-[#E6A360] uppercase tracking-wider flex items-center gap-1.5">
                    <span>▲</span>
                    <span>Judge Inquiries & Gaps</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-[#EDEDED]">
                    {lastSubmittedResult.gaps?.map((g, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#E6A360]">&bull;</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Judge Feedback */}
              <div className="p-4 bg-[#000000] border border-[#262626]">
                <div className="text-[10px] text-[#A1A1A1] uppercase tracking-wider mb-1">
                  Official Judge Feedback
                </div>
                <p className="text-xs text-[#EDEDED] leading-relaxed">
                  {lastSubmittedResult.feedback}
                </p>
              </div>

              {/* Pitch Table Tip */}
              {lastSubmittedResult.judge_tips && (
                <div className="p-4 bg-[#1a150e] border border-[#E6A360] flex flex-col gap-1">
                  <div className="text-[10px] font-bold text-[#E6A360] uppercase tracking-wider flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Live Hackathon Demo Table Tip</span>
                  </div>
                  <p className="text-xs text-[#FFF0D1] leading-relaxed">
                    {lastSubmittedResult.judge_tips}
                  </p>
                </div>
              )}

              {/* Proceed Button */}
              <div className="pt-2">
                <button
                  onClick={handleNextCriterion}
                  className="px-6 py-2.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] uppercase font-bold transition-all cursor-pointer"
                >
                  Proceed to Next Criterion &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* State C: Active Question & Answer flow for current criterion */
            activeCriterion && currentQuestion && (
              <div className="bg-[#171717] border border-[#262626] p-6 sm:p-8 flex flex-col gap-6 font-mono">
                {/* Active Criterion Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#262626]">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] text-[#E6A360] uppercase tracking-wider mb-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#E6A360] animate-pulse" />
                      <span>Criterion 0{currentCriterionIdx + 1} of 06</span>
                      <span>&bull;</span>
                      <span>{activeCriterion.weight}% Total Weight</span>
                    </div>
                    <h2 className="text-lg font-bold uppercase tracking-tight text-[#EDEDED]">
                      {activeCriterion.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFileTree(true)}
                      className="px-2.5 py-1 bg-[#000000] hover:bg-[#1a1a1a] border border-[#333333] hover:border-[#E6A360] text-[#A1A1A1] hover:text-[#EDEDED] text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📁</span>
                      <span>View Repository Files ({allFiles.length})</span>
                    </button>
                    <span className="px-2.5 py-1 bg-[#000000] border border-[#333333] text-[10px] text-[#A1A1A1] uppercase">
                      Hackathon Jury Defense
                    </span>
                  </div>
                </div>

                {/* Subcriteria Checklist Box */}
                <div className="p-3.5 bg-[#000000] border border-[#262626] flex flex-col gap-1.5">
                  <span className="text-[9px] text-[#A1A1A1] uppercase font-bold tracking-wider">
                    Official Judging Evaluation Metrics:
                  </span>
                  <div className="space-y-1 text-[11px] text-[#888888]">
                    {activeCriterion.subcriteria.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-[#E6A360]">&bull;</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Judge's Question Card */}
                <div className="p-5 bg-[#121212] border-l-2 border-l-[#E6A360] border-y border-r border-[#262626] flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-[#E6A360] uppercase tracking-wider font-bold">
                      <span>⚡ Head Judge Inquiry</span>
                    </div>
                    <SpeakerButton text={currentQuestion.question} />
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-[#EDEDED] leading-relaxed">
                    &ldquo;{currentQuestion.question}&rdquo;
                  </p>

                  {/* Rubric Points */}
                  {currentQuestion.rubricPoints?.length > 0 && (
                    <div className="pt-2 border-t border-[#262626]">
                      <span className="text-[9px] text-[#A1A1A1] uppercase tracking-wider block mb-1">
                        Judges will look for:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {currentQuestion.rubricPoints.map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 bg-[#000000] border border-[#333333] text-[#A1A1A1]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Defense Input Area */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] text-[#A1A1A1] uppercase tracking-wider">
                    <span>Your Team&apos;s Defense / Answer</span>
                    <span>{answer.length} / 4000 chars</span>
                  </div>

                  <div className="relative">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Provide your defense for the judging panel. Articulate the root problem, solution reasoning, user workflow, and prototype functionality..."
                      rows={6}
                      className="w-full p-4 pr-36 pb-14 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] text-xs leading-relaxed focus:outline-none focus:border-[#E6A360] resize-y"
                    />

                    {/* Prominent mic button directly inside the bottom-right corner of the input box */}
                    <div className="absolute right-3 bottom-3 z-10 flex items-center gap-2">
                      <VoiceInputButton
                        variant="inside-input"
                        onTranscript={(spokenText) =>
                          setAnswer((prev) => (prev.trim() ? `${prev.trim()} ${spokenText}` : spokenText))
                        }
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-[#1f0d0d] border border-[#DC8381] text-[#DC8381] text-xs">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-[#555555] uppercase hidden sm:inline">
                      Tip: Focus on problem understanding, solution reasoning, and workflow clarity over technical jargon.
                    </span>

                    <button
                      onClick={handleSubmitAnswer}
                      disabled={submitting || !answer.trim()}
                      className="px-6 py-2.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] uppercase font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {submitting ? 'Submitting to Jury...' : 'Submit Defense to Jury &rarr;'}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

export default function HackathonEvaluationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[10px] font-mono uppercase text-[#A1A1A1]">Loading Hackathon Evaluation...</div>}>
      <HackathonPageContent />
    </Suspense>
  );
}
