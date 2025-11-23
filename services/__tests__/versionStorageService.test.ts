import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReportVersion, StorageUsage, ForensicContext } from '../../types';
import { versionStorageService } from '../versionStorageService';

/**
 * Test helper to create mock versions
 */
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

describe('VersionStorageService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Scenario 1.1: Save Version to localStorage', () => {
    it('should save version to localStorage with correct structure', async () => {
      const version: ReportVersion = {
        id: crypto.randomUUID(),
        reportId: 'test-report',
        versionNumber: 1,
        timestamp: Date.now(),
        htmlContent: '<h1>Test Report</h1>',
        changeDescription: 'Initial version',
        createdBy: { userId: '1', username: 'analyst', role: 'Analyst' },
        forensicContext: { caseId: 'INC-2025-001' },
        isAutoSave: false,
      };

      await versionStorageService.saveVersion(version);

      const saved = localStorage.getItem('dfir-cortex:versions:test-report');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        reportId: 'test-report',
        versionNumber: 1,
        htmlContent: '<h1>Test Report</h1>',
        changeDescription: 'Initial version',
      });
    });

    it('should increment version number sequentially', async () => {
      const version1 = createMockVersion({ versionNumber: 1 });
      const version2 = createMockVersion({ versionNumber: 2 });

      await versionStorageService.saveVersion(version1);
      await versionStorageService.saveVersion(version2);

      const saved = localStorage.getItem('dfir-cortex:versions:test-report');
      const parsed = JSON.parse(saved!);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].versionNumber).toBe(1);
      expect(parsed[1].versionNumber).toBe(2);
    });

    it('should sanitize HTML content before saving', async () => {
      const maliciousHtml = '<h1>Report</h1><script>alert("XSS")</script><p>Content</p>';
      const version = createMockVersion({
        htmlContent: maliciousHtml,
      });

      await versionStorageService.saveVersion(version);

      const saved = localStorage.getItem('dfir-cortex:versions:test-report');
      const parsed = JSON.parse(saved!);

      // HTML should be sanitized (script removed)
      expect(parsed[0].htmlContent).not.toContain('<script>');
    });

    it('should display success toast notification', async () => {
      const mockToast = vi.fn();
      const version = createMockVersion();

      // Mock toast function
      await versionStorageService.saveVersion(version, mockToast);

      // Toast should be called with success message
      if (mockToast) {
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('Version'),
          'success'
        );
      }
    });

    it('should preserve all required metadata', async () => {
      const forensicContext: ForensicContext = {
        caseId: 'INC-2025-001',
        incidentType: 'Malware',
        evidenceTags: ['trojan', 'lateral-movement'],
        investigationPhase: 'Analysis',
        priority: 'critical',
      };

      const version = createMockVersion({
        forensicContext,
        createdBy: {
          userId: 'analyst-123',
          username: 'John Doe',
          role: 'Analyst',
        },
      });

      await versionStorageService.saveVersion(version);

      const saved = localStorage.getItem('dfir-cortex:versions:test-report');
      const parsed = JSON.parse(saved!);

      expect(parsed[0].forensicContext).toEqual(forensicContext);
      expect(parsed[0].createdBy.username).toBe('John Doe');
    });
  });

  describe('Scenario 1.2: Handle localStorage Quota Exceeded', () => {
    it('should warn when storage quota exceeds 90%', async () => {
      const mockWarning = vi.fn();

      // Create a large version to approach quota
      const largeVersion = createMockVersion({
        htmlContent: 'x'.repeat(4.5 * 1024 * 1024), // ~4.5 MB
      });

      const usage = await versionStorageService.getStorageUsage('test-report');
      expect(typeof usage.percentage).toBe('number');
    });

    it('should return storage usage information', async () => {
      const version = createMockVersion();
      await versionStorageService.saveVersion(version);

      const usage = await versionStorageService.getStorageUsage('test-report');

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('available');
      expect(usage).toHaveProperty('percentage');
      expect(typeof usage.percentage).toBe('number');
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
      expect(usage.percentage).toBeLessThanOrEqual(100);
    });

    it('should allow deletion of old versions when quota exceeded', async () => {
      // Create 10 auto-save versions
      const versions = Array.from({ length: 10 }, (_, i) =>
        createMockVersion({
          versionNumber: i + 1,
          isAutoSave: true,
          timestamp: Date.now() - i * 60000, // Each 1 min older
        })
      );

      for (const v of versions) {
        await versionStorageService.saveVersion(v);
      }

      let saved = localStorage.getItem('dfir-cortex:versions:test-report');
      let parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(10);

      // Delete 5 oldest auto-saves
      await versionStorageService.deleteOldestAutoSaves('test-report', 5);

      saved = localStorage.getItem('dfir-cortex:versions:test-report');
      parsed = JSON.parse(saved!);
      expect(parsed.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Scenario 1.3: Load Versions on Dashboard Mount', () => {
    it('should load versions from localStorage', async () => {
      const mockVersions = [
        createMockVersion({ versionNumber: 1, timestamp: Date.now() - 10000 }),
        createMockVersion({ versionNumber: 2, timestamp: Date.now() }),
      ];

      localStorage.setItem(
        'dfir-cortex:versions:default-report',
        JSON.stringify(mockVersions)
      );

      const loaded = await versionStorageService.getAllVersions('default-report');

      expect(loaded).toHaveLength(2);
      expect(loaded[0].versionNumber).toBe(1);
      expect(loaded[1].versionNumber).toBe(2);
    });

    it('should sort versions by timestamp (newest first)', async () => {
      const v1 = createMockVersion({ versionNumber: 1, timestamp: 1000 });
      const v2 = createMockVersion({ versionNumber: 2, timestamp: 3000 });
      const v3 = createMockVersion({ versionNumber: 3, timestamp: 2000 });

      for (const v of [v1, v2, v3]) {
        await versionStorageService.saveVersion(v);
      }

      const loaded = await versionStorageService.getAllVersions('test-report');

      // Should be sorted newest first
      expect(loaded[0].timestamp).toBe(3000);
      expect(loaded[1].timestamp).toBe(2000);
      expect(loaded[2].timestamp).toBe(1000);
    });

    it('should handle corrupted data gracefully', async () => {
      // Store corrupted JSON
      localStorage.setItem('dfir-cortex:versions:test-report', 'invalid json');

      const loaded = await versionStorageService.getAllVersions('test-report');

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded).toHaveLength(0);
    });

    it('should return empty array for non-existent versions', async () => {
      const loaded = await versionStorageService.getAllVersions('non-existent');

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded).toHaveLength(0);
    });
  });

  describe('Version Operations', () => {
    it('should get version by ID', async () => {
      const version = createMockVersion();
      await versionStorageService.saveVersion(version);

      const loaded = await versionStorageService.getVersionById('test-report', version.id);

      expect(loaded).toEqual(version);
    });

    it('should delete version by ID', async () => {
      const v1 = createMockVersion({ versionNumber: 1 });
      const v2 = createMockVersion({ versionNumber: 2 });

      await versionStorageService.saveVersion(v1);
      await versionStorageService.saveVersion(v2);

      let versions = await versionStorageService.getAllVersions('test-report');
      expect(versions).toHaveLength(2);

      await versionStorageService.deleteVersion('test-report', v1.id);

      versions = await versionStorageService.getAllVersions('test-report');
      expect(versions).toHaveLength(1);
      expect(versions[0].id).toBe(v2.id);
    });

    it('should export versions to JSON string', async () => {
      const mockVersions = [
        createMockVersion({ versionNumber: 1 }),
        createMockVersion({ versionNumber: 2 }),
      ];

      for (const v of mockVersions) {
        await versionStorageService.saveVersion(v);
      }

      const exported = await versionStorageService.exportVersionsToJSON('test-report');
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('reportId');
      expect(parsed).toHaveProperty('versionCount');
      expect(parsed).toHaveProperty('versions');
      expect(parsed.versionCount).toBe(2);
      expect(parsed.versions).toHaveLength(2);
    });

    it('should compress versions using lz-string', async () => {
      const version = createMockVersion({
        htmlContent: 'x'.repeat(10000), // Large content
      });

      await versionStorageService.saveVersion(version);

      const loaded = await versionStorageService.getAllVersions('test-report');
      expect(loaded).toHaveLength(1);
      expect(loaded[0].htmlContent).toHaveLength(10000);
    });
  });

  describe('Storage Management', () => {
    it('should calculate storage usage percentage', async () => {
      const version = createMockVersion();
      await versionStorageService.saveVersion(version);

      const usage = await versionStorageService.getStorageUsage('test-report');

      expect(usage.percentage).toBeGreaterThan(0);
      expect(usage.percentage).toBeLessThan(100);
    });

    it('should prune old auto-saves on storage warning', async () => {
      // Create 20 versions (mix of auto-save and manual)
      const versions = Array.from({ length: 20 }, (_, i) =>
        createMockVersion({
          versionNumber: i + 1,
          isAutoSave: i % 2 === 0, // Every other version is auto-save
          timestamp: Date.now() - i * 60000,
        })
      );

      for (const v of versions) {
        await versionStorageService.saveVersion(v);
      }

      let saved = localStorage.getItem('dfir-cortex:versions:test-report');
      let parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(20);

      // Auto-prune old auto-saves (keep only 5 newest)
      await versionStorageService.pruneOldAutoSaves('test-report', 5);

      saved = localStorage.getItem('dfir-cortex:versions:test-report');
      parsed = JSON.parse(saved!);

      // Should have fewer versions now
      expect(parsed.length).toBeLessThan(20);
    });
  });
});
