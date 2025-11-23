import React, { useState } from 'react';
import { ReportVersion } from '../types';
import { AlertCircle, X, Check } from 'lucide-react';
import { formatVersionTime } from '../services/versionUtils';
import { sanitizeHtml } from '../services/sanitizationService';

interface VersionRestorationModalProps {
  version: ReportVersion | null;
  currentVersion?: ReportVersion | null;
  onConfirm: (description: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Modal for confirming version restoration with sanitization
 */
export const VersionRestorationModal: React.FC<VersionRestorationModalProps> = ({
  version,
  currentVersion,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [restoreDescription, setRestoreDescription] = useState(
    `Restored to version ${version?.versionNumber || ''}`
  );

  if (!version) return null;

  const sanitizationResult = sanitizeHtml(version.htmlContent);

  const handleRestore = () => {
    onConfirm(restoreDescription);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl flex flex-col w-full max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Restore Version?</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              This will restore the report to the selected version. The current version will be
              saved as a new auto-save backup.
            </p>
          </div>

          {/* Version Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Version to Restore</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-600">Version</dt>
                  <dd className="font-semibold text-gray-900">v{version.versionNumber}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Created By</dt>
                  <dd className="font-semibold text-gray-900">{version.createdBy.username}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Date</dt>
                  <dd className="font-semibold text-gray-900">
                    {formatVersionTime(version.timestamp)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-600">Type</dt>
                  <dd className="font-semibold text-gray-900">
                    {version.isAutoSave ? 'Auto-save' : 'Manual'}
                  </dd>
                </div>
              </dl>
            </div>

            {currentVersion && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Version</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600">Version</dt>
                    <dd className="font-semibold text-gray-900">
                      v{currentVersion.versionNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Created By</dt>
                    <dd className="font-semibold text-gray-900">
                      {currentVersion.createdBy.username}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Date</dt>
                    <dd className="font-semibold text-gray-900">
                      {formatVersionTime(currentVersion.timestamp)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Size</dt>
                    <dd className="font-semibold text-gray-900">
                      {(currentVersion.htmlContent.length / 1024).toFixed(1)} KB
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Sanitization Notice */}
          {sanitizationResult.removed > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">{sanitizationResult.removed}</span> dangerous
                element(s) will be removed for security during restoration.
              </p>
            </div>
          )}

          {/* Change Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Save Current as (Optional)
            </label>
            <textarea
              value={restoreDescription}
              onChange={(e) => setRestoreDescription(e.target.value)}
              placeholder="Describe why you're restoring this version..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current version will be saved with this description for future reference.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Restoring...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Restore
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionRestorationModal;
