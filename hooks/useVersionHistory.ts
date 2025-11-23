import { useState, useCallback, useEffect } from 'react';
import { ReportVersion } from '../types';
import { versionStorageService } from '../services/versionStorageService';
import { sortVersionsByTimestamp, compareVersions } from '../services/versionUtils';

interface UseVersionHistoryResult {
  versions: ReportVersion[];
  isLoading: boolean;
  error: Error | null;

  // Version management
  restoreVersion: (versionId: string) => Promise<string | null>;
  deleteVersion: (versionId: string) => Promise<void>;
  compareVersions: (v1Id: string, v2Id: string) => any;

  // Version querying
  getVersionById: (versionId: string) => ReportVersion | undefined;
  getLatestVersion: () => ReportVersion | undefined;

  // Refresh
  refreshVersions: () => Promise<void>;
}

/**
 * Hook for managing version history with CRUD operations
 * Provides state management for versions and common operations
 *
 * @param reportId - The report ID to load versions for
 * @returns Version history state and operations
 */
export function useVersionHistory(reportId: string): UseVersionHistoryResult {
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load all versions from storage
   */
  const loadVersions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loaded = await versionStorageService.getAllVersions(reportId);
      const sorted = sortVersionsByTimestamp(loaded, 'desc');

      setVersions(sorted);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load versions');
      setError(error);
      console.error('Error loading versions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  /**
   * Load versions on component mount
   */
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  /**
   * Restore a version (returns the HTML content)
   */
  const restoreVersion = useCallback(
    async (versionId: string): Promise<string | null> => {
      try {
        setError(null);

        const version = await versionStorageService.getVersionById(reportId, versionId);

        if (!version) {
          throw new Error('Version not found');
        }

        return version.htmlContent;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to restore version');
        setError(error);
        console.error('Error restoring version:', error);
        return null;
      }
    },
    [reportId]
  );

  /**
   * Delete a version
   */
  const deleteVersionFunc = useCallback(
    async (versionId: string) => {
      try {
        setError(null);

        await versionStorageService.deleteVersion(reportId, versionId);

        // Update local state
        setVersions(prev => prev.filter(v => v.id !== versionId));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete version');
        setError(error);
        console.error('Error deleting version:', error);
        throw error;
      }
    },
    [reportId]
  );

  /**
   * Compare two versions
   */
  const compareVersionsFunc = useCallback(
    (v1Id: string, v2Id: string) => {
      const v1 = versions.find(v => v.id === v1Id);
      const v2 = versions.find(v => v.id === v2Id);

      if (!v1 || !v2) {
        throw new Error('One or both versions not found');
      }

      return compareVersions(v1, v2);
    },
    [versions]
  );

  /**
   * Get version by ID
   */
  const getVersionById = useCallback(
    (versionId: string) => {
      return versions.find(v => v.id === versionId);
    },
    [versions]
  );

  /**
   * Get latest version
   */
  const getLatestVersion = useCallback(() => {
    return versions.length > 0 ? versions[0] : undefined;
  }, [versions]);

  /**
   * Refresh versions from storage
   */
  const refreshVersions = useCallback(async () => {
    await loadVersions();
  }, [loadVersions]);

  return {
    versions,
    isLoading,
    error,
    restoreVersion,
    deleteVersion: deleteVersionFunc,
    compareVersions: compareVersionsFunc,
    getVersionById,
    getLatestVersion,
    refreshVersions,
  };
}
