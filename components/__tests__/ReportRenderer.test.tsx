import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeHtml, logSanitizationEvent } from '../../services/sanitizationService';

describe('ReportRenderer Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ReportRenderer - Safe HTML Validation', () => {
    it('should accept safe HTML content correctly', () => {
      const safeHtml = '<h1>Test Report</h1><p>This is safe content</p>';
      const result = sanitizeHtml(safeHtml);

      expect(result.isClean).toBe(true);
      expect(result.removed).toBe(0);
      expect(result.sanitized).toContain('<h1>Test Report</h1>');
    });

    it('should validate iframe safe HTML requirements', () => {
      const safeHtml = '<p>Content</p>';
      const result = sanitizeHtml(safeHtml);

      expect(result.isClean).toBe(true);
      expect(result.sanitized).toBe('<p>Content</p>');
    });

    it('should handle empty HTML content', () => {
      const result = sanitizeHtml("");
      expect(result.sanitized).toBe('');
      expect(result.isClean).toBe(true);
    });
  });

  describe('ReportRenderer - XSS Attack Prevention', () => {
    it('should sanitize script tags before rendering', () => {
      const maliciousHtml = '<p>Test</p><script>alert("xss")</script>';
      const sanitized = sanitizeHtml(maliciousHtml);

      expect(sanitized.removed).toBeGreaterThan(0);
      expect(sanitized.sanitized).not.toContain('<script>');
    });

    it('should sanitize event handlers before rendering', () => {
      const maliciousHtml = '<div onclick="alert(\'xss\')">Click</div>';
      const sanitized = sanitizeHtml(maliciousHtml);

      expect(sanitized.removed).toBeGreaterThan(0);
      expect(sanitized.sanitized).not.toContain('onclick');
    });

    it('should sanitize javascript protocol URLs', () => {
      const maliciousHtml = '<a href="javascript:alert(\'xss\')">Click</a>';
      const sanitized = sanitizeHtml(maliciousHtml);

      expect(sanitized.removed).toBeGreaterThan(0);
      expect(sanitized.sanitized).not.toContain('javascript:');
    });

    it('should sanitize data URLs with scripts', () => {
      const maliciousHtml = '<iframe src="data:text/html,<script>alert(\'xss\')</script>"></iframe>';
      const sanitized = sanitizeHtml(maliciousHtml);

      expect(sanitized.removed).toBeGreaterThan(0);
      expect(sanitized.sanitized).not.toContain('data:text/html');
    });

    it('should handle complex XSS attack in real report content', () => {
      const reportWithXss = `
        <div class="report">
          <h1>Incident Report</h1>
          <p>Attack detected: <img src="x" onerror="fetch('/steal')" /></p>
          <script>alert('xss')</script>
        </div>
      `;

      const sanitized = sanitizeHtml(reportWithXss);

      expect(sanitized.removed).toBeGreaterThan(0);
      expect(sanitized.sanitized).toContain('<h1>Incident Report</h1>');
      expect(sanitized.sanitized).not.toContain('onerror');
      expect(sanitized.sanitized).not.toContain('<script>');
    });
  });

  describe('ReportRenderer - Integration with Sanitization Service', () => {
    it('should log sanitization events when dangerous content is found', () => {
      const maliciousHtml = '<p>Test</p><script>alert()</script>';
      const result = sanitizeHtml(maliciousHtml);

      const consoleSpy = vi.spyOn(console, 'log');
      logSanitizationEvent('ReportRenderer.tsx', result);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ReportRenderer.tsx')
      );

      consoleSpy.mockRestore();
    });

    it('should not log when content is clean', () => {
      const safeHtml = '<h1>Title</h1><p>Content</p>';
      const result = sanitizeHtml(safeHtml);

      const consoleSpy = vi.spyOn(console, 'log');
      logSanitizationEvent('ReportRenderer.tsx', result);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should track removal count accurately', () => {
      const dirtyHtml = '<p>Test<script>alert()</script><img onerror="alert()" /></p>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.removed).toBeGreaterThanOrEqual(2);
      expect(result.isClean).toBe(false);
    });
  });

  describe('ReportRenderer - Content Structure Validation', () => {
    it('should validate safe structure for rendering', () => {
      const safeHtml = '<p>Test</p>';
      const result = sanitizeHtml(safeHtml);

      expect(result.isClean).toBe(true);
      expect(result.sanitized).toContain('<p>Test</p>');
    });

    it('should preserve structural elements', () => {
      const safeHtml = '<div><h1>Title</h1><p>Content</p></div>';
      const result = sanitizeHtml(safeHtml);

      expect(result.sanitized).toContain('<div>');
      expect(result.sanitized).toContain('<h1>Title</h1>');
      expect(result.sanitized).toContain('<p>Content</p>');
    });
  });

  describe('ReportRenderer - Real-world Scenarios', () => {
    it('should handle DFIR report with timeline content', () => {
      const dfirReport = `
        <div class="report">
          <h1>DFIR Analysis Report</h1>
          <section class="timeline">
            <h2>Timeline of Events</h2>
            <table>
              <tr>
                <td>2025-11-21 10:00:00</td>
                <td>Initial compromise</td>
              </tr>
              <tr>
                <td>2025-11-21 11:30:00</td>
                <td>Lateral movement detected</td>
              </tr>
            </table>
          </section>
        </div>
      `;

      const sanitized = sanitizeHtml(dfirReport);

      expect(sanitized.isClean).toBe(true);
      expect(sanitized.sanitized).toContain('DFIR Analysis Report');
      expect(sanitized.sanitized).toContain('Timeline');
    });

    it('should sanitize AI-generated report modifications', () => {
      const aiGeneratedHtml = `
        <div class="modified-section">
          <h2>Updated Analysis</h2>
          <p>The attack pattern suggests: <script>alert('injection')</script></p>
          <ul>
            <li onclick="malicious()">Attack vector 1</li>
            <li>Attack vector 2</li>
          </ul>
        </div>
      `;

      const sanitized = sanitizeHtml(aiGeneratedHtml);

      expect(sanitized.removed).toBeGreaterThan(0);
      expect(sanitized.sanitized).toContain('<h2>Updated Analysis</h2>');
      expect(sanitized.sanitized).not.toContain('<script>');
      expect(sanitized.sanitized).not.toContain('onclick');
    });

    it('should handle report with tables and complex structure', () => {
      const complexReport = `
        <section>
          <h1>Incident Summary</h1>
          <table border="1">
            <thead>
              <tr>
                <th>Event</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Compromise</td>
                <td>10:00</td>
                <td>Confirmed</td>
              </tr>
            </tbody>
          </table>
        </section>
      `;

      const sanitized = sanitizeHtml(complexReport);

      expect(sanitized.isClean).toBe(true);
      expect(sanitized.sanitized).toContain('<table');
      expect(sanitized.sanitized).toContain('<thead>');
      expect(sanitized.sanitized).toContain('<tbody>');
    });
  });

  describe('ReportRenderer - Performance', () => {
    it('should handle large HTML content efficiently', () => {
      let largeHtml = '<div>';
      for (let i = 0; i < 1000; i++) {
        largeHtml += `<p>Report section ${i}: Safe content</p>`;
      }
      largeHtml += '</div>';

      const start = performance.now();
      const result = sanitizeHtml(largeHtml);
      const duration = performance.now() - start;

      expect(result.sanitized.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it('should handle large HTML with malicious content', () => {
      let largeHtml = '<div>';
      for (let i = 0; i < 100; i++) {
        largeHtml += `<p>Content ${i} <script>alert()</script></p>`;
      }
      largeHtml += '</div>';

      const start = performance.now();
      const result = sanitizeHtml(largeHtml);
      const duration = performance.now() - start;

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('<script>');
      expect(duration).toBeLessThan(200);
    });
  });
});
