'use client';

import React from 'react';

interface FileViewerProps {
  filePath: string;
  content: string;
  highlightRange?: [number, number];
  onClose?: () => void;
}

export function FileViewer({
  filePath,
  content,
  highlightRange,
  onClose,
}: FileViewerProps) {
  const lines = React.useMemo(() => content.split('\n'), [content]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <svg
            className="w-4 h-4 text-zinc-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {filePath}
          </span>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
            ({lines.length} lines)
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            aria-label="Close viewer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto font-mono text-xs py-2 bg-zinc-50 dark:bg-zinc-950">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted =
                highlightRange &&
                lineNum >= highlightRange[0] &&
                lineNum <= highlightRange[1];

              return (
                <tr
                  key={lineNum}
                  className={`leading-5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${
                    isHighlighted
                      ? 'bg-yellow-100/70 dark:bg-yellow-950/40 text-yellow-950 dark:text-yellow-100 font-medium'
                      : 'text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <td className="w-12 select-none text-right pr-4 text-zinc-600 dark:text-zinc-300 text-[11px] border-r border-zinc-200 dark:border-zinc-800/60 align-top">
                    {lineNum}
                  </td>
                  <td className="pl-4 pr-4 whitespace-pre font-mono">
                    {line || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

