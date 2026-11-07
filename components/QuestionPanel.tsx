'use client';

import React, { useState } from 'react';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { SpeakerButton } from '@/components/SpeakerButton';

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
    const template = `1. The route handler receives: \n2. It verifies/calls: \n3. The return response is: `;
    setAnswer(template);
  };

  return (
    <div className="bg-[#171717] border border-[#262626] p-5 flex flex-col gap-4">
      {/* Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] pb-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
          <span className="px-2 py-0.5 bg-[#000000] border border-[#333333] text-[#EDEDED] font-semibold">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="px-2 py-0.5 bg-[#000000] border border-[#262626] text-[#A1A1A1]">
            Flow: {flowTag}
          </span>
          <span className="px-2 py-0.5 bg-[#000000] border border-[#262626] text-[#A1A1A1] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDED]" />
            Active Trace
          </span>
        </div>

        {/* Hint toggle */}
        <button
          type="button"
          data-tour="practice-hint"
          onClick={() => setShowHint(!showHint)}
          className="font-mono text-[10px] uppercase tracking-wider text-[#A1A1A1] hover:text-[#EDEDED] bg-transparent border border-[#333333] hover:border-[#EDEDED] px-2.5 py-1 transition-colors cursor-pointer"
        >
          {showHint ? '[ Hide Hint ]' : '[ Guide Hint ]'}
        </button>
      </div>

      {/* Question Prompt */}
      <div data-tour="practice-question" className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-[#EDEDED] uppercase tracking-tight leading-snug flex-1">
          {questionText}
        </h2>
        <SpeakerButton text={questionText} className="shrink-0 pt-0.5" />
      </div>

      {/* Expandable Hint Box */}
      {showHint && (
        <div className="p-3.5 bg-[#000000] border border-[#333333] text-xs font-mono flex flex-col gap-2 text-[#A1A1A1]">
          <div className="font-semibold text-[#EDEDED] uppercase tracking-wider text-[10px]">
            &bull; Trace Guide:
          </div>
          <p className="leading-relaxed">
            Inspect the highlighted file for <span className="text-[#EDEDED]">{flowTag}</span>. Outline the sequential mechanics:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-[#A1A1A1]">
            <li>What request parameters or input does the handler receive?</li>
            <li>What condition is checked first (e.g. user lookup or input validation)?</li>
            <li>What response or HTTP status code is returned on error vs success?</li>
          </ul>
          <p className="text-[10px] text-[#555555] uppercase pt-1 border-t border-[#262626]">
            Plain English explanations are fully accepted. Exact syntax memorization is not required.
          </p>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="p-3 bg-[#000000] border border-[#DC8381] text-[#DC8381] font-mono text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-3 px-2 py-1 bg-[#DC8381] text-[#000000] uppercase font-semibold hover:bg-white transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Answer Form */}
      <form data-tour="practice-answer" onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
          <label className="text-[#A1A1A1]">
            Your Mental Model / Explanation
          </label>
          <button
            type="button"
            onClick={handleApplyTemplate}
            className="text-[#A1A1A1] hover:text-[#EDEDED] hover:underline cursor-pointer"
          >
            [ + Template ]
          </button>
        </div>

        <div className="relative">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Explain in simple sequential steps: 1) It checks if user exists... 2) It verifies credentials... 3) It responds with..."
            rows={5}
            maxLength={2000}
            disabled={isLoading}
            className="w-full text-xs p-3 pr-36 pb-14 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED] font-mono resize-y transition-colors disabled:opacity-50"
          />

          {/* Embedded mic button inside the bottom-right corner of the input box */}
          <div className="absolute right-3 bottom-3 z-10 flex items-center gap-2">
            <VoiceInputButton
              variant="inside-input"
              onTranscript={(spokenText) =>
                setAnswer((prev) => (prev.trim() ? `${prev.trim()} ${spokenText}` : spokenText))
              }
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-[#555555]">
          <div>
            <span>{answer.length} / 2,000 characters</span>
          </div>

          <button
            type="submit"
            disabled={!answer.trim() || isLoading}
            className="px-5 py-2.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white font-mono text-[10px] uppercase tracking-wider font-semibold transition-all duration-140 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-black" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Evaluating...</span>
              </>
            ) : (
              <span>Submit Answer &rarr;</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
