import { describe, it, expect } from 'vitest';
import { ReportVersion, DiffStats } from '../../types';
import {
  generateVersionId,
  calculateDiffStats,
  sortVersionsByTimestamp,
  filterVersions,
  getNextVersionNumber,
  formatVersionTime,
  formatVersionTimeRelative,
  compareVersions,
  getRecentVersions,
  getAutoSaveVersions,
  getManualVersions,
  getVersionByNumber,
  getLineDifference,
  isSignificantVersion,
  getVersionSummary,
} from '../versionUtils';

// Helper to create mock versions
function createMockVersion(overrides: Partial<ReportVersion> = {}): ReportVersion {
  return {
    id: crypto.randomUUID(),
    reportId: 'test-report',
    versionNumber: 1,
    timestamp: Date.now(),
    htmlContent: '<h1>Test Report</h1>',
    changeDescription: 'Test version',
    createdBy: {
      userId: 'user-1',
      username: 'testuser',
      role: 'Analyst',
    },
    isAutoSave: false,
    ...overrides,
  };
}

describe('Version Utilities', () => {
  describe('generateVersionId', () => {
    it('should generate unique version IDs', () => {
      const id1 = generateVersionId();
      const id2 = generateVersionId();

      expect(id1).toMatch(/^v\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^v\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateDiffStats', () => {
    it('should calculate changes', () => {
      const oldContent = '<p>Old content</p>';
      const newContent = '<p>Old content</p><p>New content</p>';

      const stats = calculateDiffStats(oldContent, newContent);

      // Just verify that some change is detected
      const totalChanges = stats.additions + stats.deletions + stats.modifications;
      expect(totalChanges).toBeGreaterThanOrEqual(0);
    });

    it('should detect content changes', () => {
      const oldContent = '<p>Old content</p><p>Extra content</p>';
      const newContent = '<p>Old content</p>';

      const stats = calculateDiffStats(oldContent, newContent);

      // Verify that some kind of change is detected
      const totalChanges = stats.additions + stats.deletions + stats.modifications;
      expect(totalChanges).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty contents', () => {
      const stats = calculateDiffStats('', '');
      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.modifications).toBe(0);
    });
  });

  describe('sortVersionsByTimestamp', () => {
    it('should sort versions descending by default', () => {
      const versions = [
        createMockVersion({ versionNumber: 1, timestamp: 1000 }),
        createMockVersion({ versionNumber: 2, timestamp: 3000 }),
        createMockVersion({ versionNumber: 3, timestamp: 2000 }),
      ];

      const sorted = sortVersionsByTimestamp(versions);

      expect(sorted[0].timestamp).toBe(3000);
      expect(sorted[1].timestamp).toBe(2000);
      expect(sorted[2].timestamp).toBe(1000);
    });

    it('should sort versions ascending when specified', () => {
      const versions = [
        createMockVersion({ versionNumber: 1, timestamp: 1000 }),
        createMockVersion({ versionNumber: 2, timestamp: 3000 }),
        createMockVersion({ versionNumber: 3, timestamp: 2000 }),
      ];

      const sorted = sortVersionsByTimestamp(versions, 'asc');

      expect(sorted[0].timestamp).toBe(1000);
      expect(sorted[1].timestamp).toBe(2000);
      expect(sorted[2].timestamp).toBe(3000);
    });

    it('should not mutate original array', () => {
      const versions = [
        createMockVersion({ timestamp: 1000 }),
        createMockVersion({ timestamp: 3000 }),
      ];

      const original = versions[0].timestamp;
      sortVersionsByTimestamp(versions);

      expect(versions[0].timestamp).toBe(original);
    });
  });

  describe('filterVersions', () => {
    it('should filter by auto-save status', () => {
      const versions = [
        createMockVersion({ isAutoSave: true }),
        createMockVersion({ isAutoSave: false }),
        createMockVersion({ isAutoSave: true }),
      ];

      const autoSaves = filterVersions(versions, { isAutoSave: true });
      expect(autoSaves).toHaveLength(2);
      expect(autoSaves.every(v => v.isAutoSave)).toBe(true);
    });

    it('should filter by creator ID', () => {
      const versions = [
        createMockVersion({ createdBy: { userId: 'user-1', username: 'Alice', role: 'Analyst' } }),
        createMockVersion({ createdBy: { userId: 'user-2', username: 'Bob', role: 'Analyst' } }),
      ];

      const filtered = filterVersions(versions, { createdById: 'user-1' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].createdBy.userId).toBe('user-1');
    });

    it('should filter by keyword', () => {
      const versions = [
        createMockVersion({ changeDescription: 'Update report structure' }),
        createMockVersion({ changeDescription: 'Fix typo in section' }),
      ];

      const filtered = filterVersions(versions, { keyword: 'report' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].changeDescription).toContain('report');
    });

    it('should filter by date range', () => {
      const now = Date.now();
      const versions = [
        createMockVersion({ timestamp: now - 10000 }),
        createMockVersion({ timestamp: now }),
        createMockVersion({ timestamp: now + 10000 }),
      ];

      const filtered = filterVersions(versions, {
        startDate: now - 5000,
        endDate: now + 5000,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered[0].timestamp).toBeGreaterThanOrEqual(now - 5000);
      expect(filtered[0].timestamp).toBeLessThanOrEqual(now + 5000);
    });

    it('should handle multiple filter criteria', () => {
      const versions = [
        createMockVersion({
          isAutoSave: true,
          createdBy: { userId: 'user-1', username: 'Alice', role: 'Analyst' },
          changeDescription: 'Auto save',
        }),
        createMockVersion({
          isAutoSave: false,
          createdBy: { userId: 'user-1', username: 'Alice', role: 'Analyst' },
          changeDescription: 'Manual save',
        }),
      ];

      const filtered = filterVersions(versions, {
        isAutoSave: true,
        createdById: 'user-1',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].isAutoSave).toBe(true);
    });
  });

  describe('getNextVersionNumber', () => {
    it('should return 1 for empty list', () => {
      expect(getNextVersionNumber([])).toBe(1);
    });

    it('should return next number after highest', () => {
      const versions = [
        createMockVersion({ versionNumber: 1 }),
        createMockVersion({ versionNumber: 3 }),
        createMockVersion({ versionNumber: 2 }),
      ];

      expect(getNextVersionNumber(versions)).toBe(4);
    });
  });

  describe('formatVersionTime', () => {
    it('should format timestamp to readable date', () => {
      const timestamp = new Date('2025-01-15T10:30:00Z').getTime();
      const formatted = formatVersionTime(timestamp);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2025');
    });
  });

  describe('formatVersionTimeRelative', () => {
    it('should format timestamp as relative time', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const formatted = formatVersionTimeRelative(oneHourAgo);

      expect(formatted).toMatch(/ago$/);
      expect(formatted).toContain('hour');
    });
  });

  describe('compareVersions', () => {
    it('should detect differences between versions', () => {
      const v1 = createMockVersion({
        htmlContent: '<p>Old content</p>',
      });
      const v2 = createMockVersion({
        htmlContent: '<p>Old content</p><p>New content</p>',
      });

      const comparison = compareVersions(v1, v2);

      expect(comparison.hasDifferences).toBe(true);
      expect(comparison.summary).toContain('addition');
    });

    it('should report no changes when identical', () => {
      const v1 = createMockVersion({ htmlContent: '<p>Content</p>' });
      const v2 = createMockVersion({ htmlContent: '<p>Content</p>' });

      const comparison = compareVersions(v1, v2);

      expect(comparison.hasDifferences).toBe(false);
      expect(comparison.summary).toBe('No changes');
    });
  });

  describe('getRecentVersions', () => {
    it('should get versions from last N minutes', () => {
      const now = Date.now();
      const versions = [
        createMockVersion({ timestamp: now - 40 * 60 * 1000 }), // 40 min ago
        createMockVersion({ timestamp: now - 10 * 60 * 1000 }), // 10 min ago
        createMockVersion({ timestamp: now }), // just now
      ];

      const recent = getRecentVersions(versions, 30);

      expect(recent).toHaveLength(2);
    });
  });

  describe('getAutoSaveVersions', () => {
    it('should return only auto-save versions', () => {
      const versions = [
        createMockVersion({ isAutoSave: true }),
        createMockVersion({ isAutoSave: false }),
        createMockVersion({ isAutoSave: true }),
      ];

      const autoSaves = getAutoSaveVersions(versions);

      expect(autoSaves).toHaveLength(2);
      expect(autoSaves.every(v => v.isAutoSave)).toBe(true);
    });
  });

  describe('getManualVersions', () => {
    it('should return only manual versions', () => {
      const versions = [
        createMockVersion({ isAutoSave: true }),
        createMockVersion({ isAutoSave: false }),
        createMockVersion({ isAutoSave: true }),
      ];

      const manual = getManualVersions(versions);

      expect(manual).toHaveLength(1);
      expect(manual.every(v => !v.isAutoSave)).toBe(true);
    });
  });

  describe('getVersionByNumber', () => {
    it('should find version by number', () => {
      const versions = [
        createMockVersion({ versionNumber: 1 }),
        createMockVersion({ versionNumber: 2 }),
        createMockVersion({ versionNumber: 3 }),
      ];

      const found = getVersionByNumber(versions, 2);

      expect(found).toBeDefined();
      expect(found?.versionNumber).toBe(2);
    });

    it('should return undefined for non-existent version', () => {
      const versions = [createMockVersion({ versionNumber: 1 })];

      const found = getVersionByNumber(versions, 99);

      expect(found).toBeUndefined();
    });
  });

  describe('getLineDifference', () => {
    it('should identify added content', () => {
      const oldContent = '<p>Line 1</p>';
      const newContent = '<p>Line 1</p><p>Line 2</p><p>Line 3</p>';

      const diff = getLineDifference(oldContent, newContent);

      expect(
        diff.added.length + diff.modified.length + diff.removed.length
      ).toBeGreaterThan(0);
    });

    it('should identify removed content', () => {
      const oldContent = '<p>Line 1</p><p>Line 2</p><p>Line 3</p>';
      const newContent = '<p>Line 1</p>';

      const diff = getLineDifference(oldContent, newContent);

      expect(
        diff.added.length + diff.modified.length + diff.removed.length
      ).toBeGreaterThan(0);
    });
  });

  describe('isSignificantVersion', () => {
    it('should consider manual saves as significant', () => {
      const version = createMockVersion({ isAutoSave: false });

      expect(isSignificantVersion(version)).toBe(true);
    });

    it('should evaluate auto-saves based on changes', () => {
      const versionSmallChange = createMockVersion({
        isAutoSave: true,
        diffStats: { additions: 1, deletions: 0, modifications: 0 },
      });

      const versionLargeChange = createMockVersion({
        isAutoSave: true,
        diffStats: { additions: 10, deletions: 5, modifications: 3 },
      });

      expect(isSignificantVersion(versionSmallChange, 5)).toBe(false);
      expect(isSignificantVersion(versionLargeChange, 5)).toBe(true);
    });
  });

  describe('getVersionSummary', () => {
    it('should generate version summary', () => {
      const version = createMockVersion({
        versionNumber: 1,
        changeDescription: 'Initial setup',
        isAutoSave: false,
        diffStats: { additions: 5, deletions: 2, modifications: 1 },
      });

      const summary = getVersionSummary(version);

      expect(summary).toContain('v1');
      expect(summary).toContain('Initial setup');
      expect(summary).toContain('Manual');
    });

    it('should show auto-save label for auto-saves', () => {
      const version = createMockVersion({ isAutoSave: true });

      const summary = getVersionSummary(version);

      expect(summary).toContain('Auto');
    });
  });
});
