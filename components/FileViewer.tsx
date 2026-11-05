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
    <div className="flex flex-col h-full bg-[#171717] border border-[#262626] overflow-hidden">
      {/* Editorial Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#171717] border-b border-[#262626] font-mono text-[10px] text-[#A1A1A1] uppercase tracking-wider">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDED]" />
          <span className="font-semibold text-[#EDEDED] truncate">
            {filePath}
          </span>
          <span className="text-[#555555]">
            [{lines.length} lines]
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-[#A1A1A1] hover:text-[#EDEDED] px-1.5 py-0.5 border border-[#333333] hover:border-[#EDEDED] transition-colors"
            aria-label="Close viewer"
          >
            &times;
          </button>
        )}
      </div>

      {/* Code Table Area */}
      <div className="flex-1 overflow-auto font-mono text-xs py-2 bg-[#000000]">
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
                  className={`leading-5 transition-colors ${
                    isHighlighted
                      ? 'bg-[#241c10] text-[#FFF0D1] font-medium'
                      : 'hover:bg-[#111111] text-[#EDEDED]'
                  }`}
                >
                  <td
                    className={`w-12 select-none text-right pr-4 text-[10px] border-r font-mono align-top ${
                      isHighlighted
                        ? 'text-[#E6A360] border-[#E6A360] font-bold'
                        : 'text-[#555555] border-[#262626]'
                    }`}
                  >
                    {lineNum}
                  </td>
                  <td
                    className={`pl-4 pr-4 whitespace-pre font-mono text-xs ${
                      isHighlighted ? 'border-l-2 border-[#E6A360] pl-3.5' : ''
                    }`}
                  >
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
