import React, { useState } from 'react';
import { ReportVersion } from '../types';
import { VersionTimeline } from './VersionTimeline';
import { ChevronRight, ChevronLeft, History, Download, AlertCircle } from 'lucide-react';

interface VersionHistoryPanelProps {
  versions: ReportVersion[];
  isLoading?: boolean;
  error?: Error | null;
  onSelectVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
  onExport?: () => void;
  selectedVersionId?: string;
  isCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

/**
 * Collapsible sidebar panel for version history
 * Shows timeline with quick actions
 */
export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  versions,
  isLoading = false,
  error = null,
  onSelectVersion,
  onDeleteVersion,
  onRestoreVersion,
  onExport,
  selectedVersionId,
  isCollapsed = false,
  onToggleCollapsed,
}) => {
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const handleDeleteWithConfirm = async (versionId: string) => {
    setShowConfirm(versionId);
  };

  const confirmDelete = async (versionId: string) => {
    await onDeleteVersion(versionId);
    setShowConfirm(null);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => onToggleCollapsed?.(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-l-lg shadow-lg z-40"
        title="Open version history"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Versions</h2>
          {versions.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-semibold rounded-full h-6 w-6">
              {versions.length}
            </span>
          )}
        </div>

        <button
          onClick={() => onToggleCollapsed?.(true)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="Collapse panel"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        )}

        {/* Version Timeline */}
        <div className="flex-1 overflow-hidden">
          <VersionTimeline
            versions={versions}
            selectedVersionId={selectedVersionId}
            onSelectVersion={onSelectVersion}
            onDeleteVersion={handleDeleteWithConfirm}
            onRestoreVersion={onRestoreVersion}
            isLoading={isLoading}
            height={600}
            maxWidth={384}
          />
        </div>
      </div>

      {/* Footer with Actions */}
      {versions.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex gap-2">
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            title="Export all versions as JSON"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Version?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The version will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(showConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryPanel;
