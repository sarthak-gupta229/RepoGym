'use client';

import React, { useState } from 'react';
import { Grade, Citation } from '@/lib/schemas';

interface GradeCardProps {
  grade: Grade;
  studentAnswer: string;
  onCitationClick: (citation: Citation) => void;
  onNextQuestion: () => void;
  isLastQuestion: boolean;
  onFeedbackSubmit?: (helpful: boolean, note?: string) => Promise<void>;
  isLoadingNext?: boolean;
}

export function GradeCard({
  grade,
  studentAnswer,
  onCitationClick,
  onNextQuestion,
  isLastQuestion,
  onFeedbackSubmit,
  isLoadingNext,
}: GradeCardProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const verdictStyles = {
    correct: {
      badge: 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800',
      label: 'Correct',
    },
    partial: {
      badge: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800',
      label: 'Partial Understanding',
    },
    incorrect: {
      badge: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
      label: 'Needs Review',
    },
  }[grade.verdict] || {
    badge: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    label: grade.verdict,
  };

  const handleFeedback = async (helpful: boolean) => {
    setFeedbackGiven(helpful ? 'up' : 'down');
    if (!helpful) {
      setShowNoteInput(true);
    }
    if (onFeedbackSubmit) {
      await onFeedbackSubmit(helpful);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onFeedbackSubmit) {
      await onFeedbackSubmit(false, note);
    }
    setShowNoteInput(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
      {/* Grade Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${verdictStyles.badge}`}
          >
            {verdictStyles.label}
          </span>
          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            Score: {grade.score} / {grade.maxScore}
          </span>
        </div>

        {/* Feedback thumbs up/down */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-600 dark:text-zinc-300">Was this feedback helpful?</span>
          <button
            onClick={() => handleFeedback(true)}
            className={`p-1.5 rounded transition ${
              feedbackGiven === 'up'
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'text-zinc-600 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Helpful"
          >
            👍
          </button>
          <button
            onClick={() => handleFeedback(false)}
            className={`p-1.5 rounded transition ${
              feedbackGiven === 'down'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'text-zinc-600 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Not helpful"
          >
            👎
          </button>
        </div>
      </div>

      {showNoteInput && (
        <form onSubmit={handleNoteSubmit} className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tell us what was inaccurate (optional)..."
            className="flex-1 text-xs px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-medium"
          >
            Save Note
          </button>
        </form>
      )}

      {/* Tutor Explanation */}
      <div className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
        <span className="font-semibold block mb-1 text-zinc-900 dark:text-zinc-100">
          Evaluation:
        </span>
        {grade.feedback}
      </div>

      {/* Code Citations (Clickable Verification) */}
      {grade.citations && grade.citations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
            Verified In Code (Click to inspect):
          </span>
          <div className="flex flex-wrap gap-2">
            {grade.citations.map((cite, idx) => (
              <button
                key={idx}
                onClick={() => onCitationClick(cite)}
                className="text-xs font-mono px-2.5 py-1 rounded bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/60 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>
                  {cite.file}#L{cite.startLine}
                  {cite.startLine !== cite.endLine ? `-L${cite.endLine}` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up question if applicable */}
      {grade.followUpQuestion && (
        <div className="text-xs p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200">
          <span className="font-semibold block mb-1">Follow-up Reflection:</span>
          {grade.followUpQuestion}
        </div>
      )}

      {/* Next Question / Finish Action */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onNextQuestion}
          disabled={isLoadingNext}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoadingNext ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Preparing Next Question...
            </>
          ) : isLastQuestion ? (
            'Complete Session & View Summary →'
          ) : (
            'Next Question →'
          )}
        </button>
      </div>
    </div>
  );
}

