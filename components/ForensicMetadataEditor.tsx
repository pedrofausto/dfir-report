import React, { useState } from 'react';
import { ForensicContext } from '../types';
import { X, Save } from 'lucide-react';

interface ForensicMetadataEditorProps {
  initialData?: ForensicContext;
  onSave: (data: ForensicContext) => void;
  onCancel: () => void;
  isOpen?: boolean;
  title?: string;
}

/**
 * Form editor for forensic context metadata
 */
export const ForensicMetadataEditor: React.FC<ForensicMetadataEditorProps> = ({
  initialData,
  onSave,
  onCancel,
  isOpen = true,
  title = 'Edit Forensic Context',
}) => {
  const [formData, setFormData] = useState<ForensicContext>(
    initialData || {
      caseId: '',
      incidentType: '',
      evidenceTags: [],
      investigationPhase: '',
      priority: 'medium',
      assignedTo: '',
      notes: '',
    }
  );

  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && formData.evidenceTags) {
      setFormData({
        ...formData,
        evidenceTags: [...formData.evidenceTags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      evidenceTags: formData.evidenceTags?.filter(t => t !== tag) || [],
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl flex flex-col w-full max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Case ID */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Case ID
            </label>
            <input
              type="text"
              value={formData.caseId || ''}
              onChange={(e) =>
                setFormData({ ...formData, caseId: e.target.value })
              }
              placeholder="e.g., INC-2025-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Incident Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Incident Type
            </label>
            <select
              value={formData.incidentType || ''}
              onChange={(e) =>
                setFormData({ ...formData, incidentType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select incident type...</option>
              <option value="Malware">Malware</option>
              <option value="Data Breach">Data Breach</option>
              <option value="APT">APT</option>
              <option value="Insider Threat">Insider Threat</option>
              <option value="Ransomware">Ransomware</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Investigation Phase */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Investigation Phase
            </label>
            <select
              value={formData.investigationPhase || ''}
              onChange={(e) =>
                setFormData({ ...formData, investigationPhase: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select phase...</option>
              <option value="Initial Response">Initial Response</option>
              <option value="Evidence Collection">Evidence Collection</option>
              <option value="Analysis">Analysis</option>
              <option value="Reporting">Reporting</option>
              <option value="Remediation">Remediation</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Priority
            </label>
            <select
              value={formData.priority || 'medium'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as 'low' | 'medium' | 'high' | 'critical',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={formData.assignedTo || ''}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.target.value })
              }
              placeholder="Analyst name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Evidence Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Evidence Tags
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.evidenceTags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional investigation notes..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForensicMetadataEditor;
