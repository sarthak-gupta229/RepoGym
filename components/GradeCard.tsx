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
  studentAnswer: _studentAnswer,
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
      badge: 'border-[#EDEDED] text-[#EDEDED] bg-[#000000]',
      label: 'VERDICT: CORRECT',
    },
    partial: {
      badge: 'border-[#E6A360] text-[#E6A360] bg-[#000000]',
      label: 'VERDICT: PARTIAL UNDERSTANDING',
    },
    incorrect: {
      badge: 'border-[#DC8381] text-[#DC8381] bg-[#000000]',
      label: 'VERDICT: NEEDS REVIEW',
    },
  }[grade.verdict] || {
    badge: 'border-[#333333] text-[#A1A1A1] bg-[#000000]',
    label: `VERDICT: ${grade.verdict.toUpperCase()}`,
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
    <div className="bg-[#171717] border border-[#262626] p-5 flex flex-col gap-4">
      {/* Grade Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] font-mono font-semibold px-2.5 py-1 border ${verdictStyles.badge}`}
          >
            {verdictStyles.label}
          </span>
          <span className="text-xs font-mono font-bold text-[#EDEDED] uppercase">
            Score: {grade.score} / {grade.maxScore}
          </span>
        </div>

        {/* Feedback controls */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
          <span className="hidden sm:inline">Helpful?</span>
          <button
            onClick={() => handleFeedback(true)}
            className={`px-2 py-0.5 border transition-colors cursor-pointer ${
              feedbackGiven === 'up'
                ? 'bg-[#EDEDED] text-[#000000] border-[#EDEDED]'
                : 'border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED]'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => handleFeedback(false)}
            className={`px-2 py-0.5 border transition-colors cursor-pointer ${
              feedbackGiven === 'down'
                ? 'bg-[#DC8381] text-[#000000] border-[#DC8381]'
                : 'border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED]'
            }`}
          >
            NO
          </button>
        </div>
      </div>

      {showNoteInput && (
        <form onSubmit={handleNoteSubmit} className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Report discrepancy or inaccuracy (optional)..."
            className="flex-1 text-xs px-3 py-1.5 bg-[#000000] border border-[#333333] text-[#EDEDED] focus:outline-none focus:border-[#EDEDED] font-mono"
          />
          <button
            type="submit"
            className="text-[10px] font-mono uppercase px-3 py-1.5 bg-[#EDEDED] text-[#000000] font-semibold hover:bg-white transition-colors"
          >
            Save
          </button>
        </form>
      )}

      {/* Tutor Explanation */}
      <div className="text-xs text-[#EDEDED] leading-relaxed bg-[#000000] p-3.5 border border-[#262626]">
        <span className="font-mono text-[10px] font-semibold block mb-1 text-[#A1A1A1] uppercase tracking-wider">
          Evaluation & Critique:
        </span>
        {grade.feedback}
      </div>

      {/* Code Citations (Verified In Code) */}
      {grade.citations && grade.citations.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono font-semibold text-[#A1A1A1] uppercase tracking-wider">
            Verified Source Citations (Click to inspect line bounds):
          </span>
          <div className="flex flex-wrap gap-2">
            {grade.citations.map((cite, idx) => (
              <button
                key={idx}
                onClick={() => onCitationClick(cite)}
                className="text-[10px] font-mono px-2.5 py-1 bg-[#000000] border border-[#E6A360] text-[#FFF0D1] hover:bg-[#1a1610] transition-colors flex items-center gap-1.5 cursor-pointer uppercase"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#E6A360]" />
                <span>
                  {cite.file}#L{cite.startLine}
                  {cite.startLine !== cite.endLine ? `-L${cite.endLine}` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up reflection */}
      {grade.followUpQuestion && (
        <div className="text-xs p-3 bg-[#000000] border border-[#333333] text-[#EDEDED]">
          <span className="font-mono text-[10px] font-semibold text-[#A1A1A1] uppercase block mb-1 tracking-wider">
            Follow-up Reflection:
          </span>
          {grade.followUpQuestion}
        </div>
      )}

      {/* Next Question CTA */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onNextQuestion}
          disabled={isLoadingNext}
          className="px-5 py-2.5 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white font-mono text-[10px] uppercase tracking-wider font-semibold transition-all duration-140 flex items-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {isLoadingNext ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-black" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Generating Next Question...</span>
            </>
          ) : isLastQuestion ? (
            <span>Complete Session & Summary &rarr;</span>
          ) : (
            <span>Next Question &rarr;</span>
          )}
        </button>
      </div>
    </div>
  );
}
