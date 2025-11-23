import React, { useMemo } from 'react';
import { ReportVersion } from '../types';
import { FixedSizeList as List } from 'react-window';
import { formatVersionTimeRelative, formatVersionTime, getVersionSummary } from '../services/versionUtils';
import { Clock, Trash2, Copy, Share2 } from 'lucide-react';

interface VersionTimelineProps {
  versions: ReportVersion[];
  selectedVersionId?: string;
  onSelectVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
  isLoading?: boolean;
  height?: number;
  maxWidth?: number;
}

interface VersionItemData {
  versions: ReportVersion[];
  selectedVersionId?: string;
  onSelectVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
}

/**
 * Single version item renderer for the virtual list
 */
const VersionItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: VersionItemData;
}> = ({ index, style, data }) => {
  const version = data.versions[index];
  const isSelected = version.id === data.selectedVersionId;

  return (
    <div
      style={style}
      className={`
        px-4 py-3 border-b border-gray-200 cursor-pointer
        transition-colors hover:bg-blue-50
        ${isSelected ? 'bg-blue-100 border-blue-300' : 'bg-white'}
      `}
      onClick={() => data.onSelectVersion(version.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">
              {getVersionSummary(version)}
            </span>
          </div>
          <div className="ml-6 text-xs text-gray-500 mt-1">
            {formatVersionTimeRelative(version.timestamp)}
          </div>
          <div className="ml-6 text-xs text-gray-400 mt-0.5">
            by {version.createdBy.username}
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRestoreVersion(version.id);
            }}
            title="Restore this version"
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteVersion(version.id);
            }}
            title="Delete this version"
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Virtualized timeline of report versions
 * Uses react-window for efficient rendering of large lists
 */
export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  selectedVersionId,
  onSelectVersion,
  onDeleteVersion,
  onRestoreVersion,
  isLoading = false,
  height = 400,
  maxWidth = 400,
}) => {
  const itemData: VersionItemData = useMemo(
    () => ({
      versions,
      selectedVersionId,
      onSelectVersion,
      onDeleteVersion,
      onRestoreVersion,
    }),
    [versions, selectedVersionId, onSelectVersion, onDeleteVersion, onRestoreVersion]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading versions...
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <div className="text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No versions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" style={{ maxWidth }}>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Version History ({versions.length})</h3>
      </div>
      <List
        height={height}
        itemCount={versions.length}
        itemSize={70}
        width="100%"
        itemData={itemData}
      >
        {VersionItem}
      </List>
    </div>
  );
};

export default VersionTimeline;
