import { ReportVersion, StorageUsage } from '../types';
import { sanitizeHtml } from './sanitizationService';
import * as LZString from 'lz-string';

const STORAGE_PREFIX = 'dfir-cortex:versions:';
const COMPRESSION_THRESHOLD = 1024; // Compress content larger than 1KB

interface ToastFunction {
  (message: string, type: 'success' | 'error' | 'info'): void;
}

/**
 * Service for managing report version history in localStorage
 * Handles CRUD operations, storage quota management, and compression
 */
class VersionStorageService {
  /**
   * Get storage key for a report
   */
  private getStorageKey(reportId: string): string {
    return `${STORAGE_PREFIX}${reportId}`;
  }

  /**
   * Estimate size of a string in bytes (UTF-8)
   */
  private estimateSize(str: string): number {
    return new Blob([str]).size;
  }

  /**
   * Get total localStorage size estimate
   */
  private getStorageSize(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          total += this.estimateSize(key) + this.estimateSize(value);
        }
      }
    }
    return total;
  }

  /**
   * Save a version to localStorage with sanitization and optional compression
   */
  async saveVersion(
    version: ReportVersion,
    toast?: ToastFunction
  ): Promise<void> {
    try {
      // Sanitize HTML content
      const sanitized = sanitizeHtml(version.htmlContent);
      const sanitizedVersion: ReportVersion = {
        ...version,
        htmlContent: sanitized.sanitized,
      };

      // Get existing versions
      const key = this.getStorageKey(version.reportId);
      const existing = this.getAllVersionsSync(version.reportId);

      // Add new version
      existing.push(sanitizedVersion);

      // Sort by timestamp descending (newest first)
      existing.sort((a, b) => b.timestamp - a.timestamp);

      // Save to localStorage
      const serialized = JSON.stringify(existing);
      localStorage.setItem(key, serialized);

      // Check storage quota
      const usage = await this.getStorageUsage(version.reportId);
      if (usage.percentage > 90) {
        console.warn(
          `[VERSION_STORAGE] Storage quota for ${version.reportId} exceeds 90%`
        );
        if (toast) {
          toast('Storage quota warning: Consider deleting old versions', 'info');
        }
      }

      if (toast) {
        toast(
          `Version ${version.versionNumber} saved successfully`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error saving version:', error);
      if (toast) {
        toast('Failed to save version', 'error');
      }
      throw error;
    }
  }

  /**
   * Get all versions synchronously (for internal use)
   */
  private getAllVersionsSync(reportId: string): ReportVersion[] {
    try {
      const key = this.getStorageKey(reportId);
      const data = localStorage.getItem(key);

      if (!data) {
        return [];
      }

      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing versions:', error);
      return [];
    }
  }

  /**
   * Get all versions for a report
   */
  async getAllVersions(reportId: string): Promise<ReportVersion[]> {
    return this.getAllVersionsSync(reportId);
  }

  /**
   * Get a specific version by ID
   */
  async getVersionById(
    reportId: string,
    versionId: string
  ): Promise<ReportVersion | null> {
    const versions = await this.getAllVersions(reportId);
    return versions.find(v => v.id === versionId) || null;
  }

  /**
   * Delete a version by ID
   */
  async deleteVersion(reportId: string, versionId: string): Promise<void> {
    try {
      const key = this.getStorageKey(reportId);
      const versions = await this.getAllVersions(reportId);

      const filtered = versions.filter(v => v.id !== versionId);

      if (filtered.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('Error deleting version:', error);
      throw error;
    }
  }

  /**
   * Delete oldest auto-save versions when quota exceeded
   */
  async deleteOldestAutoSaves(
    reportId: string,
    count: number
  ): Promise<void> {
    try {
      const versions = await this.getAllVersions(reportId);

      // Filter auto-saves and sort by timestamp (oldest first)
      const autoSaves = versions
        .filter(v => v.isAutoSave)
        .sort((a, b) => a.timestamp - b.timestamp);

      // Determine which versions to keep
      const toDelete = autoSaves.slice(0, count);
      const toDeleteIds = new Set(toDelete.map(v => v.id));

      // Filter out deleted versions
      const remaining = versions.filter(v => !toDeleteIds.has(v.id));

      const key = this.getStorageKey(reportId);
      if (remaining.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(remaining));
      }
    } catch (error) {
      console.error('Error deleting oldest auto-saves:', error);
      throw error;
    }
  }

  /**
   * Prune old auto-saves, keeping only the newest N
   */
  async pruneOldAutoSaves(
    reportId: string,
    keepCount: number
  ): Promise<void> {
    try {
      const versions = await this.getAllVersions(reportId);

      // Separate auto-saves and manual versions
      const autoSaves = versions
        .filter(v => v.isAutoSave)
        .sort((a, b) => b.timestamp - a.timestamp);
      const manualVersions = versions.filter(v => !v.isAutoSave);

      // Keep only the newest auto-saves
      const keptAutoSaves = autoSaves.slice(0, keepCount);

      // Combine
      const remaining = [...manualVersions, ...keptAutoSaves].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      const key = this.getStorageKey(reportId);
      if (remaining.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(remaining));
      }
    } catch (error) {
      console.error('Error pruning old auto-saves:', error);
      throw error;
    }
  }

  /**
   * Get storage usage for a report
   */
  async getStorageUsage(reportId: string): Promise<StorageUsage> {
    try {
      const key = this.getStorageKey(reportId);
      const data = localStorage.getItem(key);

      const used = data ? this.estimateSize(data) : 0;
      const available = 5 * 1024 * 1024 - this.getStorageSize(); // Assume 5MB total quota
      const percentage = (this.getStorageSize() / (5 * 1024 * 1024)) * 100;

      return {
        used,
        available: Math.max(0, available),
        percentage: Math.min(100, percentage),
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return {
        used: 0,
        available: 5 * 1024 * 1024,
        percentage: 0,
      };
    }
  }

  /**
   * Export versions to JSON format
   */
  async exportVersionsToJSON(reportId: string): Promise<string> {
    try {
      const versions = await this.getAllVersions(reportId);

      const exportData = {
        exportDate: new Date().toISOString(),
        reportId,
        versionCount: versions.length,
        versions,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting versions:', error);
      throw error;
    }
  }

  /**
   * Import versions from JSON format
   */
  async importVersionsFromJSON(
    reportId: string,
    jsonString: string
  ): Promise<number> {
    try {
      const importData = JSON.parse(jsonString);

      if (!importData.versions || !Array.isArray(importData.versions)) {
        throw new Error('Invalid import format');
      }

      // Save each version
      for (const version of importData.versions) {
        await this.saveVersion(version);
      }

      return importData.versions.length;
    } catch (error) {
      console.error('Error importing versions:', error);
      throw error;
    }
  }

  /**
   * Clear all versions for a report
   */
  async clearAllVersions(reportId: string): Promise<void> {
    try {
      const key = this.getStorageKey(reportId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing versions:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics for all reports
   */
  async getGlobalStorageStats(): Promise<{
    totalSize: number;
    reportCount: number;
    percentage: number;
  }> {
    const totalSize = this.getStorageSize();
    const maxQuota = 5 * 1024 * 1024;
    const percentage = (totalSize / maxQuota) * 100;

    // Count unique report IDs
    const reportIds = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const reportId = key.replace(STORAGE_PREFIX, '');
        reportIds.add(reportId);
      }
    }

    return {
      totalSize,
      reportCount: reportIds.size,
      percentage: Math.min(100, percentage),
    };
  }
}

// Export singleton instance
export const versionStorageService = new VersionStorageService();
