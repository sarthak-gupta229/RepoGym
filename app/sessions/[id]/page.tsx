'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DependencyGraph } from '@/components/DependencyGraph';
import { FileViewer } from '@/components/FileViewer';
import { QuestionPanel } from '@/components/QuestionPanel';
import { GradeCard } from '@/components/GradeCard';
import { Session, Question, Attempt, Analysis } from '@/lib/store';
import { Citation, Grade } from '@/lib/schemas';
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

  // Fetch session data
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

      // Default graph highlight to current flow or first file
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

  // Current question attempt if already graded
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

      // Update attempts
      setAttempts((prev) => [...prev, data.attempt]);
      if (data.sessionCompleted) {
        setSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
      }

      // Highlight citation files on graph
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
      setSubmitError(err instanceof Error ? err.message : 'Evaluation failed. Your answer is preserved.');
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

        // Highlight new question's route file
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
        Loading interactive training session...
      </div>
    );
  }

  if (!session || !analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Session not found.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg font-medium"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isCompleted = session.status === 'completed';

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
            Session Tracing
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            {isCompleted ? 'Completed' : `Question ${session.current_index} of ${session.total_questions}`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <a
            href="/dashboard"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition hidden sm:inline-block"
          >
            Dashboard
          </a>
          <NavbarAuth />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-60px)]">
        {/* Left Pane: Interactive Dependency Graph */}
        <div className="lg:col-span-6 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
            <span className="font-medium">Code Structure & Traced Flow</span>
            <span className="text-[11px] text-yellow-600 dark:text-yellow-400">
              Yellow = Verified Citations
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
          {/* If Session is Completed: Show Session Summary */}
          {isCompleted ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 flex items-center justify-center font-bold">
                  ✓
                </span>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Session Completed!
                  </h2>
                  <p className="text-xs text-zinc-500">
                    You answered all {session.total_questions} questions for this repository flow.
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
                  <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-zinc-500">Total Score</div>
                      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {totalScore} / {maxPossible} ({pct}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Verdict Summary</div>
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {attempts.filter((a) => a.verdict === 'correct').length} Correct ·{' '}
                        {attempts.filter((a) => a.verdict === 'partial').length} Partial
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-3 pt-2">
                <a
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
                >
                  View Performance on Dashboard →
                </a>
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
              <div className="h-full border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xs">
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
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading session...</div>}>
      <SessionPageContent />
    </Suspense>
  );
}

