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
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isLoading) return;
    await onSubmit(answer);
  };

  const handleApplyTemplate = () => {
    const template = `1. First, the endpoint receives the request and checks: \n2. Then, it validates/queries: \n3. Finally, it responds with: `;
    setAnswer(template);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
      {/* Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            flow: {flowTag}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Beginner Friendly
          </span>
        </div>

        {/* Hint button */}
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 flex items-center gap-1 font-medium bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800/60 transition cursor-pointer"
        >
          💡 {showHint ? 'Hide Hint' : 'Need a Hint?'}
        </button>
      </div>

      {/* Question Prompt */}
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
        {questionText}
      </h2>

      {/* Expandable Hint Box */}
      {showHint && (
        <div className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex flex-col gap-2">
          <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <span>💡 Helpful Guide:</span>
          </div>
          <p className="leading-relaxed">
            Inspect the highlighted code file for <span className="font-mono font-medium">{flowTag}</span> on the left. Trace the execution flow in simple steps:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-800/90 dark:text-amber-300/90">
            <li>What request parameters or input does the handler receive?</li>
            <li>What condition is checked first (e.g. user lookup or input validation)?</li>
            <li>What response or HTTP status code is returned on error vs success?</li>
          </ul>
          <p className="text-[11px] italic text-amber-700 dark:text-amber-400 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
            ✨ Remember: Plain conversational English is 100% fine! You do not need to memorize exact code syntax.
          </p>
        </div>
      )}

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Your Explanation
          </label>
          <button
            type="button"
            onClick={handleApplyTemplate}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 font-medium transition cursor-pointer"
          >
            ✨ Use Answer Template
          </button>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Explain in simple terms: e.g. 1) It checks if user exists... 2) It compares password... 3) It returns a response..."
          rows={5}
          maxLength={2000}
          disabled={isLoading}
          className="w-full text-xs p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans resize-y transition disabled:opacity-60"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>{answer.length} / 2,000 characters</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-[11px] text-zinc-400">Plain English explanations welcome</span>
          </div>

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
