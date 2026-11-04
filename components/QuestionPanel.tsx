'use client';

import React, { useState } from 'react';

interface QuestionPanelProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  flowTag: string;
  onSubmit: (answer: string) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function QuestionPanel({
  questionNumber,
  totalQuestions,
  questionText,
  flowTag,
  onSubmit,
  isLoading,
  errorMessage,
  onRetry,
}: QuestionPanelProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isLoading) return;
    await onSubmit(answer);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            flow: {flowTag}
          </span>
        </div>
      </div>

      {/* Question Prompt */}
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
        {questionText}
      </h2>

      {/* Error state */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-3 px-2 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Your Explanation
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Explain how the code executes, which functions are called, and how data flows..."
          rows={5}
          maxLength={2000}
          disabled={isLoading}
          className="w-full text-xs p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans resize-y transition disabled:opacity-60"
        />

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{answer.length} / 2,000 characters</span>

          <button
            type="submit"
            disabled={!answer.trim() || isLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Evaluating Answer...
              </>
            ) : (
              'Submit Answer'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

