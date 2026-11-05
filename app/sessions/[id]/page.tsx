'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DependencyGraph } from '@/components/DependencyGraph';
import { FileViewer } from '@/components/FileViewer';
import { QuestionPanel } from '@/components/QuestionPanel';
import { GradeCard } from '@/components/GradeCard';
import { Session, Question, Attempt, Analysis } from '@/lib/store';
import { Citation } from '@/lib/schemas';
import { NavbarAuth } from '@/components/NavbarAuth';

function SessionPageContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<string>('');

  const [selectedFile, setSelectedFile] = useState<string>('');
  const [highlightRange, setHighlightRange] = useState<[number, number] | undefined>(undefined);
  const [highlightFiles, setHighlightFiles] = useState<string[]>([]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const loadSession = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load session');
      const data = await res.json();
      setSession(data.session);
      setCurrentQuestion(data.currentQuestion);
      setQuestions(data.questions || []);
      setAttempts(data.attempts || []);
      setAnalysis(data.analysis);

      if (data.currentQuestion && data.analysis) {
        const flow = data.analysis.flows?.find(
          (f: any) => f.tag === data.currentQuestion.flow_tag
        );
        if (flow) {
          setHighlightFiles([flow.routeFile]);
          setSelectedFile(flow.routeFile);
        }
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Could not load session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const currentAttempt = useMemo(() => {
    if (!currentQuestion) return null;
    return attempts.find((a) => a.question_id === currentQuestion.id) || null;
  }, [attempts, currentQuestion]);

  const handleAnswerSubmit = async (answer: string) => {
    if (!currentQuestion) return;
    setSubmitting(true);
    setSubmitError(null);
    setLastSubmittedAnswer(answer);

    try {
      const res = await fetch(`/api/questions/${currentQuestion.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Grading failed');
      }

      setAttempts((prev) => [...prev, data.attempt]);
      if (data.sessionCompleted) {
        setSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
      }

      if (data.attempt.citations && data.attempt.citations.length > 0) {
        const citedFiles = Array.from(
          new Set(data.attempt.citations.map((c: Citation) => c.file))
        ) as string[];
        setHighlightFiles(citedFiles);
        setSelectedFile(citedFiles[0]);
        setHighlightRange([
          data.attempt.citations[0].startLine,
          data.attempt.citations[0].endLine,
        ]);
      }
    } catch (err) {
      console.error(err);
      setSubmitError(err instanceof Error ? err.message : 'Evaluation failed. Answer preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    setSelectedFile(citation.file);
    setHighlightRange([citation.startLine, citation.endLine]);
    setHighlightFiles((prev) => Array.from(new Set([...prev, citation.file])));
  };

  const handleNextQuestion = async () => {
    if (!session) return;
    setIsLoadingNext(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/next`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate next question');

      if (data.completed) {
        setSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
      } else {
        setSession(data.session);
        setCurrentQuestion(data.question);
        setQuestions((prev) => [...prev, data.question]);

        if (analysis && data.question) {
          const flow = analysis.flows?.find((f) => f.tag === data.question.flow_tag);
          if (flow) {
            setHighlightFiles([flow.routeFile]);
            setSelectedFile(flow.routeFile);
            setHighlightRange(undefined);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert('Could not generate next question. Please try again.');
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handleFeedbackSubmit = async (helpful: boolean, note?: string) => {
    if (!currentAttempt) return;
    try {
      await fetch(`/api/attempts/${currentAttempt.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful, note }),
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-[10px] font-mono uppercase tracking-wider text-[#A1A1A1]">
        Loading interactive training session...
      </div>
    );
  }

  if (!session || !analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#000000] p-6 text-center font-mono">
        <p className="text-xs text-[#A1A1A1] uppercase tracking-wider">Session not found.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-[#EDEDED] text-[#000000] font-mono text-[10px] uppercase font-semibold hover:bg-white"
        >
          Return Home &rarr;
        </button>
      </div>
    );
  }

  const isCompleted = session.status === 'completed';

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
            Flow Tracing
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#171717] border border-[#262626] text-[#EDEDED] uppercase">
            {isCompleted ? 'COMPLETED' : `QUESTION ${session.current_index} OF ${session.total_questions}`}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
          <Link
            href="/dashboard"
            className="text-[#A1A1A1] hover:text-[#EDEDED] transition-colors hidden sm:inline-block"
          >
            Dashboard
          </Link>
          <div className="h-4 w-px bg-[#262626] hidden sm:block" />
          <NavbarAuth />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-60px)]">
        {/* Left Pane: Interactive Dependency Graph */}
        <div className="lg:col-span-6 flex flex-col h-full bg-[#171717] border border-[#262626] p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#262626] text-[10px] font-mono uppercase tracking-wider text-[#A1A1A1]">
            <span>Code Structure & Traced Flow</span>
            <span className="text-[#E6A360]">
              Citations in Amber
            </span>
          </div>

          <div className="flex-1 relative">
            <DependencyGraph
              graph={analysis.graph}
              highlight={highlightFiles}
              selectedFile={selectedFile}
              onSelect={(file) => {
                setSelectedFile(file);
                setHighlightRange(undefined);
              }}
            />
          </div>
        </div>

        {/* Right Pane: Question / Grade / Code Viewer */}
        <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-y-auto pr-1">
          {/* If Session is Completed: Show Summary */}
          {isCompleted ? (
            <div className="bg-[#171717] border border-[#262626] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-[#EDEDED] text-[#000000] font-mono font-bold text-xs">
                  ✓ DONE
                </span>
                <div>
                  <h2 className="text-base font-bold uppercase tracking-tight text-[#EDEDED]">
                    Session Completed
                  </h2>
                  <p className="text-xs text-[#A1A1A1]">
                    You completed all {session.total_questions} questions for this repository execution flow.
                  </p>
                </div>
              </div>

              {/* Score calculation */}
              {(() => {
                const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
                const maxPossible =
                  attempts.reduce((acc, a) => acc + a.max_score, 0) ||
                  (session.total_questions ? session.total_questions * 10 : 50);
                const pct = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

                return (
                  <div className="p-4 bg-[#000000] border border-[#262626] flex items-center justify-between font-mono">
                    <div>
                      <div className="text-[10px] text-[#A1A1A1] uppercase tracking-wider">Total Score</div>
                      <div className="text-2xl font-bold text-[#EDEDED]">
                        {totalScore} / {maxPossible} ({pct}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#A1A1A1] uppercase tracking-wider">Breakdown</div>
                      <div className="text-xs font-semibold text-[#EDEDED]">
                        {attempts.filter((a) => a.verdict === 'correct').length} CORRECT &bull;{' '}
                        {attempts.filter((a) => a.verdict === 'partial').length} PARTIAL
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white text-[10px] font-mono uppercase tracking-wider font-semibold transition-all duration-140"
                >
                  View Performance on Dashboard &rarr;
                </Link>
              </div>
            </div>
          ) : (
            /* Active Question State */
            currentQuestion && (
              <>
                {currentAttempt ? (
                  <GradeCard
                    grade={{
                      score: currentAttempt.score,
                      maxScore: currentAttempt.max_score,
                      verdict: currentAttempt.verdict,
                      covered: currentAttempt.covered,
                      missed: currentAttempt.missed,
                      feedback: currentAttempt.feedback,
                      citations: currentAttempt.citations,
                      followUpQuestion: currentAttempt.follow_up_question,
                    }}
                    studentAnswer={currentAttempt.answer}
                    onCitationClick={handleCitationClick}
                    onNextQuestion={handleNextQuestion}
                    isLastQuestion={currentQuestion.position >= session.total_questions}
                    onFeedbackSubmit={handleFeedbackSubmit}
                    isLoadingNext={isLoadingNext}
                  />
                ) : (
                  <QuestionPanel
                    questionNumber={currentQuestion.position}
                    totalQuestions={session.total_questions}
                    questionText={currentQuestion.question}
                    flowTag={currentQuestion.flow_tag}
                    onSubmit={handleAnswerSubmit}
                    isLoading={submitting}
                    errorMessage={submitError}
                    onRetry={() => handleAnswerSubmit(lastSubmittedAnswer)}
                  />
                )}
              </>
            )
          )}

          {/* Active File Inspection Viewer */}
          <div className="flex-1 min-h-[300px]">
            {selectedFile && analysis.file_map[selectedFile] ? (
              <FileViewer
                filePath={selectedFile}
                content={analysis.file_map[selectedFile]}
                highlightRange={highlightRange}
              />
            ) : (
              <div className="h-full border border-[#262626] bg-[#171717] flex items-center justify-center text-[#555555] font-mono text-[10px] uppercase tracking-wider">
                Select a cited file or click any node to view source code
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[10px] font-mono uppercase text-[#A1A1A1]">Loading session...</div>}>
      <SessionPageContent />
    </Suspense>
  );
}
