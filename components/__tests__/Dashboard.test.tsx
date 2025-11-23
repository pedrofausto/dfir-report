import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeHtml, logSanitizationEvent } from '../../services/sanitizationService';

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard - AI Response Sanitization', () => {
    it('should sanitize Gemini AI HTML responses', () => {
      const aiResponse = '<div><h2>Analysis</h2><p>Content</p></div>';
      const result = sanitizeHtml(aiResponse);

      expect(result.isClean).toBe(true);
      expect(result.sanitized).toContain('<h2>Analysis</h2>');
    });

    it('should remove scripts from AI-generated HTML', () => {
      const aiResponse = '<p>Updated report</p><script>alert("injected")</script>';
      const result = sanitizeHtml(aiResponse);

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.isClean).toBe(false);
    });

    it('should remove event handlers from AI response', () => {
      const aiResponse = '<div onclick="malicious()">Content</div>';
      const result = sanitizeHtml(aiResponse);

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('onclick');
    });

    it('should remove javascript: URLs from AI response', () => {
      const aiResponse = '<a href="javascript:alert(\'xss\')">Click</a>';
      const result = sanitizeHtml(aiResponse);

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('javascript:');
    });

    it('should log when dangerous content is removed from AI response', () => {
      const aiResponse = '<p>Content</p><img src="x" onerror="alert()" />';
      const result = sanitizeHtml(aiResponse);

      const consoleSpy = vi.spyOn(console, 'log');
      logSanitizationEvent('Dashboard.tsx', result);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dashboard.tsx')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Dashboard - Complex AI Response Handling', () => {
    it('should handle AI-generated report modification HTML', () => {
      const modifiedReport = `
        <div class="modification">
          <h3>Updated Section</h3>
          <p>The timeline has been updated: <script>alert('xss')</script></p>
          <table>
            <tr><td>Data</td></tr>
          </table>
        </div>
      `;

      const result = sanitizeHtml(modifiedReport);

      expect(result.sanitized).toContain('<h3>Updated Section</h3>');
      expect(result.sanitized).toContain('<table>');
      expect(result.sanitized).not.toContain('<script>');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should preserve report structure while removing attacks', () => {
      const aiGeneratedUpdate = `
        <section>
          <h2>Incident Timeline</h2>
          <div onclick="steal()">Dangerous</div>
          <ul>
            <li>Event 1</li>
            <li onmouseover="alert()">Event 2</li>
          </ul>
        </section>
      `;

      const result = sanitizeHtml(aiGeneratedUpdate);

      expect(result.sanitized).toContain('<h2>Incident Timeline</h2>');
      expect(result.sanitized).toContain('<ul>');
      expect(result.sanitized).toContain('<li>Event 1</li>');
      expect(result.sanitized).not.toContain('onclick');
      expect(result.sanitized).not.toContain('onmouseover');
    });

    it('should handle AI response with data: URLs', () => {
      const aiResponse = '<iframe src="data:text/html,<script>alert()</script>"></iframe>';
      const result = sanitizeHtml(aiResponse);

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('data:');
    });

    it('should handle mixed attack vectors in single AI response', () => {
      const complexAttack = `
        <div>
          <p>Report update <script>evil()</script></p>
          <img src="x" onerror="alert()" />
          <a href="javascript:steal()">Link</a>
          <form action="javascript:void(0)" onsubmit="attack()">
            <input type="text" />
          </form>
        </div>
      `;

      const result = sanitizeHtml(complexAttack);

      expect(result.removed).toBeGreaterThanOrEqual(4);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).not.toContain('onsubmit');
    });
  });

  describe('Dashboard - setHtmlContent Integration', () => {
    it('should accept sanitized HTML for content updates', () => {
      const htmlContent = '<h1>Report Title</h1><p>Content</p>';
      const result = sanitizeHtml(htmlContent);

      expect(result.isClean).toBe(true);
      expect(result.sanitized).toBe(htmlContent);
    });

    it('should reject unsafe HTML for setHtmlContent', () => {
      const unsafeHtml = '<h1>Title</h1><script>alert()</script>';
      const result = sanitizeHtml(unsafeHtml);

      expect(result.isClean).toBe(false);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should preserve HTML formatting in safe content', () => {
      const formattedHtml = `
        <h1>Analysis Report</h1>
        <section class="summary">
          <p>Executive summary here</p>
        </section>
        <section class="timeline">
          <h2>Timeline</h2>
          <ul>
            <li>Event 1</li>
            <li>Event 2</li>
          </ul>
        </section>
      `;

      const result = sanitizeHtml(formattedHtml);

      expect(result.isClean).toBe(true);
      expect(result.sanitized).toContain('<h1>Analysis Report</h1>');
      expect(result.sanitized).toContain('<section');
      expect(result.sanitized).toContain('<h2>Timeline</h2>');
    });

    it('should handle large HTML content from AI', () => {
      let largeContent = '<div>';
      for (let i = 0; i < 500; i++) {
        largeContent += `<p>Section ${i}: Safe AI-generated content</p>`;
      }
      largeContent += '</div>';

      const start = performance.now();
      const result = sanitizeHtml(largeContent);
      const duration = performance.now() - start;

      expect(result.isClean).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it('should handle large HTML content with attacks', () => {
      let largeContent = '<div>';
      for (let i = 0; i < 100; i++) {
        largeContent += `<p>Content ${i} <img src="x" onerror="alert(${i})" /></p>`;
      }
      largeContent += '</div>';

      const start = performance.now();
      const result = sanitizeHtml(largeContent);
      const duration = performance.now() - start;

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('onerror');
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Dashboard - User Message Processing', () => {
    it('should handle user chat messages with HTML content', () => {
      const userMessage = 'Update the <b>timeline</b> section';
      const result = sanitizeHtml(userMessage);

      expect(result.isClean).toBe(true);
      expect(result.sanitized).toContain('<b>timeline</b>');
    });

    it('should reject user messages with script attempts', () => {
      const maliciousMessage = 'Update <script>alert("xss")</script> now';
      const result = sanitizeHtml(maliciousMessage);

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('<script>');
    });
  });

  describe('Dashboard - Real-world Scenarios', () => {
    it('should sanitize AI-generated incident summary HTML', () => {
      const incidentSummary = `
        <div class="incident-summary">
          <h2>Incident #3167 Summary</h2>
          <div class="metrics">
            <p><strong>Severity:</strong> Critical</p>
            <p><strong>Status:</strong> <img src="x" onerror="alert()" /> Active</p>
          </div>
          <div class="timeline">
            <h3>Key Events</h3>
            <ul>
              <li>2025-11-21 10:00 - Initial compromise</li>
              <li>2025-11-21 11:30 - Lateral movement</li>
            </ul>
          </div>
        </div>
      `;

      const result = sanitizeHtml(incidentSummary);

      expect(result.sanitized).toContain('<h2>Incident #3167 Summary</h2>');
      expect(result.sanitized).toContain('Critical');
      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('onerror');
    });

    it('should sanitize AI-modified attack vector table', () => {
      const attackVectors = `
        <table border="1">
          <thead>
            <tr>
              <th>Attack Vector</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr onclick="malicious()">
              <td>Phishing Email</td>
              <td>Confirmed</td>
            </tr>
            <tr>
              <td>Credential Stuffing <script>alert()</script></td>
              <td>Detected</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = sanitizeHtml(attackVectors);

      expect(result.sanitized).toContain('<table');
      expect(result.sanitized).toContain('Phishing Email');
      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('onclick');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should sanitize AI-generated recommendations section', () => {
      const recommendations = `
        <section class="recommendations">
          <h3>Recommended Actions</h3>
          <ol>
            <li><a href="javascript:steal()">Reset compromised accounts</a></li>
            <li>Implement MFA <img src="x" onerror="alert()" /></li>
            <li onclick="alert()">Review access logs</li>
          </ol>
        </section>
      `;

      const result = sanitizeHtml(recommendations);

      expect(result.sanitized).toContain('<h3>Recommended Actions</h3>');
      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).not.toContain('onclick');
    });

    it('should handle concurrent AI response processing', () => {
      const responses = [
        '<p>Update 1</p><script>alert()</script>',
        '<p>Update 2 <img onerror="alert()" /></p>',
        '<p>Update 3 <a href="javascript:void(0)">Link</a></p>'
      ];

      const results = responses.map(html => sanitizeHtml(html));

      results.forEach(result => {
        expect(result.removed).toBeGreaterThan(0);
        expect(result.sanitized).not.toContain('<script>');
        expect(result.sanitized).not.toContain('onerror');
        expect(result.sanitized).not.toContain('javascript:');
      });
    });
  });

  describe('Dashboard - Error Recovery', () => {
    it('should handle null HTML gracefully', () => {
      const result = sanitizeHtml(null as any);

      expect(result.sanitized).toBe('');
      expect(result.removed).toBe(0);
      expect(result.isClean).toBe(true);
    });

    it('should handle undefined HTML gracefully', () => {
      const result = sanitizeHtml(undefined as any);

      expect(result.sanitized).toBe('');
      expect(result.removed).toBe(0);
      expect(result.isClean).toBe(true);
    });

    it('should continue operation after removing dangerous content', () => {
      const firstResponse = '<p>Initial <script>attack</script></p>';
      const firstResult = sanitizeHtml(firstResponse);

      expect(firstResult.removed).toBeGreaterThan(0);

      const secondResponse = '<p>Safe content</p>';
      const secondResult = sanitizeHtml(secondResponse);

      expect(secondResult.isClean).toBe(true);
      expect(secondResult.removed).toBe(0);
    });
  });
});
