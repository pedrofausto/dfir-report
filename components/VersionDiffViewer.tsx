import React, { useMemo } from 'react';
import { diffLines, Change } from 'diff';
import { X } from 'lucide-react';

interface VersionDiffViewerProps {
  oldContent: string;
  newContent: string;
  title?: string;
  onClose?: () => void;
}

/**
 * Calculate highlighted HTML diff between two versions
 */
function calculateDiff(oldContent: string, newContent: string): Change[] {
  return diffLines(oldContent, newContent, { ignoreWhitespace: false });
}

/**
 * Render a single diff line
 */
const DiffLine: React.FC<{ change: Change; lineNumber: number }> = ({
  change,
  lineNumber,
}) => {
  let bgColor = 'bg-white';
  let prefix = '  ';
  let textColor = 'text-gray-700';

  if (change.added) {
    bgColor = 'bg-green-50';
    prefix = '+ ';
    textColor = 'text-green-700';
  } else if (change.removed) {
    bgColor = 'bg-red-50';
    prefix = '- ';
    textColor = 'text-red-700';
  }

  const lines = change.value.split('\n').filter(l => l);

  return (
    <>
      {lines.map((line, idx) => (
        <div key={`${lineNumber}-${idx}`} className={`${bgColor} px-4 py-1 border-l-4 ${
          change.added ? 'border-green-400' : change.removed ? 'border-red-400' : 'border-gray-300'
        }`}>
          <span className="text-gray-400 text-xs mr-2 inline-block w-6">{lineNumber + idx}</span>
          <span className={`font-mono ${textColor}`}>
            {prefix}
            {line}
          </span>
        </div>
      ))}
    </>
  );
};

/**
 * Custom side-by-side diff viewer for comparing report versions
 */
export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  oldContent,
  newContent,
  title = 'Version Comparison',
  onClose,
}) => {
  const diffs = useMemo(() => calculateDiff(oldContent, newContent), [oldContent, newContent]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;

    diffs.forEach(diff => {
      const lineCount = diff.value.split('\n').filter(l => l).length;
      if (diff.added) additions += lineCount;
      if (diff.removed) deletions += lineCount;
    });

    return { additions, deletions };
  }, [diffs]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl flex flex-col max-w-4xl w-full max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <div className="flex gap-4 mt-2">
              <span className="text-sm">
                <span className="text-green-600 font-semibold">{stats.additions}</span>
                {' '}additions
              </span>
              <span className="text-sm">
                <span className="text-red-600 font-semibold">{stats.deletions}</span>
                {' '}deletions
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="font-mono text-sm">
            {diffs.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {diffs.map((diff, idx) => (
                  <DiffLine key={idx} change={diff} lineNumber={idx + 1} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No differences between versions
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionDiffViewer;
