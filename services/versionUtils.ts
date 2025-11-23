import { ReportVersion, DiffStats } from '../types';
import { diffLines } from 'diff';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Generate a unique version ID using UUID-like format
 */
export function generateVersionId(): string {
  return `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate diff statistics between two HTML contents
 */
export function calculateDiffStats(
  oldContent: string,
  newContent: string
): DiffStats {
  const differences = diffLines(oldContent, newContent);

  let additions = 0;
  let deletions = 0;
  let modifications = 0;

  differences.forEach(part => {
    const lines = part.value.split('\n').filter(line => line.trim());
    if (part.added) {
      additions += lines.length;
      if (deletions > 0) {
        modifications += Math.min(lines.length, deletions);
      }
    } else if (part.removed) {
      deletions += lines.length;
    }
  });

  return {
    additions,
    deletions,
    modifications,
  };
}

/**
 * Sort versions by timestamp (newest first)
 */
export function sortVersionsByTimestamp(
  versions: ReportVersion[],
  order: 'asc' | 'desc' = 'desc'
): ReportVersion[] {
  return [...versions].sort((a, b) => {
    if (order === 'desc') {
      return b.timestamp - a.timestamp;
    }
    return a.timestamp - b.timestamp;
  });
}

/**
 * Filter versions by various criteria
 */
export function filterVersions(
  versions: ReportVersion[],
  criteria: {
    isAutoSave?: boolean;
    createdById?: string;
    startDate?: number;
    endDate?: number;
    keyword?: string;
  }
): ReportVersion[] {
  return versions.filter(v => {
    // Filter by auto-save status
    if (criteria.isAutoSave !== undefined && v.isAutoSave !== criteria.isAutoSave) {
      return false;
    }

    // Filter by creator
    if (criteria.createdById && v.createdBy.userId !== criteria.createdById) {
      return false;
    }

    // Filter by date range
    if (criteria.startDate && v.timestamp < criteria.startDate) {
      return false;
    }
    if (criteria.endDate && v.timestamp > criteria.endDate) {
      return false;
    }

    // Filter by keyword in description or forensic context
    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      const matches =
        v.changeDescription.toLowerCase().includes(keyword) ||
        (v.forensicContext?.notes?.toLowerCase().includes(keyword) ?? false) ||
        (v.forensicContext?.caseId?.toLowerCase().includes(keyword) ?? false);
      if (!matches) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get the next version number for a report
 */
export function getNextVersionNumber(versions: ReportVersion[]): number {
  if (versions.length === 0) return 1;
  const max = Math.max(...versions.map(v => v.versionNumber));
  return max + 1;
}

/**
 * Format timestamp to human-readable string
 */
export function formatVersionTime(timestamp: number): string {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
export function formatVersionTimeRelative(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/**
 * Compare two versions and generate a summary
 */
export function compareVersions(
  oldVersion: ReportVersion,
  newVersion: ReportVersion
): {
  hasDifferences: boolean;
  stats: DiffStats;
  summary: string;
} {
  const stats = calculateDiffStats(oldVersion.htmlContent, newVersion.htmlContent);
  const hasDifferences =
    stats.additions > 0 || stats.deletions > 0 || stats.modifications > 0;

  const parts: string[] = [];
  if (stats.additions > 0) parts.push(`${stats.additions} additions`);
  if (stats.deletions > 0) parts.push(`${stats.deletions} deletions`);
  if (stats.modifications > 0) parts.push(`${stats.modifications} modifications`);

  const summary = parts.length > 0 ? parts.join(', ') : 'No changes';

  return {
    hasDifferences,
    stats,
    summary,
  };
}

/**
 * Get versions created in the last N minutes
 */
export function getRecentVersions(
  versions: ReportVersion[],
  minutes: number = 30
): ReportVersion[] {
  const cutoffTime = Date.now() - minutes * 60 * 1000;
  return versions.filter(v => v.timestamp > cutoffTime);
}

/**
 * Get all auto-save versions
 */
export function getAutoSaveVersions(versions: ReportVersion[]): ReportVersion[] {
  return versions.filter(v => v.isAutoSave);
}

/**
 * Get all manual (non-auto-save) versions
 */
export function getManualVersions(versions: ReportVersion[]): ReportVersion[] {
  return versions.filter(v => !v.isAutoSave);
}

/**
 * Get version by number
 */
export function getVersionByNumber(
  versions: ReportVersion[],
  versionNumber: number
): ReportVersion | undefined {
  return versions.find(v => v.versionNumber === versionNumber);
}

/**
 * Get the difference in lines between two HTML contents
 */
export function getLineDifference(
  oldContent: string,
  newContent: string
): { added: string[]; removed: string[]; modified: string[] } {
  const differences = diffLines(oldContent, newContent);
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  differences.forEach(part => {
    const lines = part.value.split('\n').filter(line => line.trim());
    if (part.added) {
      added.push(...lines);
    } else if (part.removed) {
      removed.push(...lines);
    }
  });

  // Simple heuristic for modifications: lines that were both added and removed
  const modCount = Math.min(added.length, removed.length);
  for (let i = 0; i < modCount; i++) {
    modified.push(`Modified: ${removed[i]} → ${added[i]}`);
  }

  return {
    added: added.slice(modCount),
    removed: removed.slice(modCount),
    modified,
  };
}

/**
 * Compact version data for storage (remove or compress large fields)
 */
export function compactVersion(version: ReportVersion): ReportVersion {
  // For now, just return as-is since we handle compression in the storage service
  return version;
}

/**
 * Check if a version is "significant" (has meaningful changes)
 */
export function isSignificantVersion(
  version: ReportVersion,
  threshold: number = 5
): boolean {
  if (!version.diffStats) {
    return !version.isAutoSave; // Manual saves are always significant
  }

  const totalChanges =
    version.diffStats.additions +
    version.diffStats.deletions +
    version.diffStats.modifications;
  return totalChanges >= threshold;
}

/**
 * Get a summary of version changes for display
 */
export function getVersionSummary(version: ReportVersion): string {
  const parts: string[] = [];

  if (version.diffStats) {
    if (version.diffStats.additions > 0)
      parts.push(`+${version.diffStats.additions}`);
    if (version.diffStats.deletions > 0)
      parts.push(`-${version.diffStats.deletions}`);
  }

  const changes = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  const typeLabel = version.isAutoSave ? '[Auto]' : '[Manual]';

  return `v${version.versionNumber} - ${version.changeDescription} ${typeLabel}${changes}`;
}
