import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeHtml,
  SanitizationConfig,
  SanitizationResult,
  logSanitizationEvent
} from '../sanitizationService';

describe('sanitizationService', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    vi.clearAllMocks();
  });

  describe('sanitizeHtml - Basic Functionality', () => {
    it('should sanitize and return clean HTML with default configuration', () => {
      const dirtyHtml = '<p>Hello World</p>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result).toBeDefined();
      expect(result.sanitized).toBe('<p>Hello World</p>');
      expect(result.removed).toBe(0);
      expect(result.isClean).toBe(true);
    });

    it('should preserve safe HTML tags', () => {
      const safeHtml = '<h1>Title</h1><p>Content</p><ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(safeHtml);

      expect(result.sanitized).toContain('<h1>');
      expect(result.sanitized).toContain('<p>');
      expect(result.sanitized).toContain('<li>');
      expect(result.isClean).toBe(true);
    });

    it('should remove script tags', () => {
      const dirtyHtml = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('alert');
      expect(result.removed).toBeGreaterThan(0);
      expect(result.isClean).toBe(false);
    });

    it('should remove inline event handlers', () => {
      const dirtyHtml = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onclick');
      expect(result.sanitized).not.toContain('alert');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should remove dangerous attributes', () => {
      const dirtyHtml = '<img src="x" onerror="alert(\'xss\')" />';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onerror');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle empty strings', () => {
      const result = sanitizeHtml('');

      expect(result.sanitized).toBe('');
      expect(result.removed).toBe(0);
      expect(result.isClean).toBe(true);
    });

    it('should handle null or undefined gracefully', () => {
      const result1 = sanitizeHtml(null as any);
      const result2 = sanitizeHtml(undefined as any);

      expect(result1.sanitized).toBe('');
      expect(result2.sanitized).toBe('');
    });
  });

  describe('sanitizeHtml - XSS Attack Vectors', () => {
    it('should block javascript: protocol URLs', () => {
      const dirtyHtml = '<a href="javascript:alert(\'xss\')">Click</a>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('javascript:');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block data: protocol URLs with scripts', () => {
      const dirtyHtml = '<a href="data:text/html,<script>alert(\'xss\')</script>">Click</a>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('data:text/html');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block onload event handlers', () => {
      const dirtyHtml = '<body onload="alert(\'xss\')"><p>Content</p></body>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onload');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block oninput event handlers', () => {
      const dirtyHtml = '<input oninput="alert(\'xss\')" />';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('oninput');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block svg onload attacks', () => {
      const dirtyHtml = '<svg onload="alert(\'xss\')"></svg>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onload');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block iFrame with javascript protocol', () => {
      const dirtyHtml = '<iframe src="javascript:alert(\'xss\')"></iframe>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('javascript:');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block style tag injection', () => {
      const dirtyHtml = '<style>body { background: url("javascript:alert(\'xss\')"); }</style>';
      const result = sanitizeHtml(dirtyHtml);

      // Style tags should be removed or sanitized
      expect(result.sanitized).not.toContain('javascript:');
    });

    it('should block form tag injection', () => {
      const dirtyHtml = '<form action="javascript:alert(\'xss\')"><input type="submit" /></form>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('javascript:');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block onfocus event handlers', () => {
      const dirtyHtml = '<input onfocus="alert(\'xss\')" autofocus />';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onfocus');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block onmouseover event handlers', () => {
      const dirtyHtml = '<div onmouseover="alert(\'xss\')">Hover me</div>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onmouseover');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block encoded XSS attacks', () => {
      const dirtyHtml = '<img src=x onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#120;&#115;&#115;&#39;&#41;" />';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onerror');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block nested iframe attacks', () => {
      const dirtyHtml = '<div><iframe src="javascript:alert(\'xss\')"></iframe></div>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('javascript:');
    });

    it('should block embedded script in img src', () => {
      const dirtyHtml = '<img src="x" onerror="eval(\'alert(\\\"xss\\\")\')"/>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onerror');
    });

    it('should block link with event handlers', () => {
      const dirtyHtml = '<a href="#" onmousedown="alert(\'xss\')">Click</a>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('onmousedown');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block object tag injection', () => {
      const dirtyHtml = '<object data="data:text/html,<script>alert(\'xss\')</script>"></object>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.removed).toBeGreaterThan(0);
    });

    it('should block embed tag injection', () => {
      const dirtyHtml = '<embed src="javascript:alert(\'xss\')" />';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('javascript:');
    });
  });

  describe('sanitizeHtml - Custom Configuration', () => {
    it('should accept custom allowed tags', () => {
      const config: SanitizationConfig = {
        allowedTags: ['p', 'strong']
      };
      const dirtyHtml = '<p>Text with <b>bold</b></p>';
      const result = sanitizeHtml(dirtyHtml, config);

      // b tag should be removed, only allowed tags remain
      expect(result.sanitized).toContain('<p>');
      expect(result.sanitized).toContain('Text with');
    });

    it('should accept custom allowed attributes', () => {
      const config: SanitizationConfig = {
        allowedAttributes: {
          'a': ['href', 'title']
        }
      };
      const dirtyHtml = '<a href="/safe" onclick="alert()">Link</a>';
      const result = sanitizeHtml(dirtyHtml, config);

      expect(result.sanitized).toContain('href="/safe"');
      expect(result.sanitized).not.toContain('onclick');
    });

    it('should apply custom configuration settings', () => {
      const config: SanitizationConfig = {
        stripHtmlBrackets: false
      };
      const dirtyHtml = '<p>Safe content</p>';
      const result = sanitizeHtml(dirtyHtml, config);

      expect(result).toBeDefined();
      expect(result.sanitized).toContain('<p>');
    });
  });

  describe('sanitizeHtml - Large Content', () => {
    it('should handle large HTML documents efficiently', () => {
      let largeHtml = '<div>';
      for (let i = 0; i < 1000; i++) {
        largeHtml += `<p>Paragraph ${i}</p>`;
      }
      largeHtml += '</div>';

      const start = performance.now();
      const result = sanitizeHtml(largeHtml);
      const duration = performance.now() - start;

      expect(result.sanitized.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle 50KB HTML content within 50ms', () => {
      const largeContent = '<p>' + 'x'.repeat(50000) + '</p>';

      const start = performance.now();
      const result = sanitizeHtml(largeContent);
      const duration = performance.now() - start;

      expect(result.sanitized.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50);
    });

    it('should handle 1MB HTML content within 100ms', () => {
      const largeContent = '<div>' + '<p>test</p>'.repeat(50000) + '</div>';

      const start = performance.now();
      const result = sanitizeHtml(largeContent);
      const duration = performance.now() - start;

      expect(result.sanitized.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('SanitizationResult Interface', () => {
    it('should return complete SanitizationResult object', () => {
      const result = sanitizeHtml('<p>Test</p>');

      expect(result).toHaveProperty('sanitized');
      expect(result).toHaveProperty('removed');
      expect(result).toHaveProperty('isClean');
      expect(typeof result.sanitized).toBe('string');
      expect(typeof result.removed).toBe('number');
      expect(typeof result.isClean).toBe('boolean');
    });

    it('should correctly set isClean flag when HTML is modified', () => {
      const cleanResult = sanitizeHtml('<p>Safe</p>');
      const dirtyResult = sanitizeHtml('<p>Test<script>alert()</script></p>');

      expect(cleanResult.isClean).toBe(true);
      expect(dirtyResult.isClean).toBe(false);
    });

    it('should count removed elements correctly', () => {
      const result = sanitizeHtml(
        '<p>Test</p><script>alert()</script><img onerror="alert()" />'
      );

      expect(result.removed).toBeGreaterThanOrEqual(2);
    });
  });

  describe('logSanitizationEvent', () => {
    it('should log significant sanitization events', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const result: SanitizationResult = {
        sanitized: '<p>Safe</p>',
        removed: 3,
        isClean: false
      };

      logSanitizationEvent('test.html', result);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should only log when removed > 0', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const cleanResult: SanitizationResult = {
        sanitized: '<p>Safe</p>',
        removed: 0,
        isClean: true
      };

      logSanitizationEvent('test.html', cleanResult);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should include source identifier in log message', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const result: SanitizationResult = {
        sanitized: '<p>Safe</p>',
        removed: 1,
        isClean: false
      };

      logSanitizationEvent('ReportRenderer.tsx', result);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ReportRenderer.tsx')
      );
      consoleSpy.mockRestore();
    });

    it('should log with Dashboard source', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const result: SanitizationResult = {
        sanitized: '<p>Safe</p>',
        removed: 2,
        isClean: false
      };

      logSanitizationEvent('Dashboard.tsx', result);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dashboard.tsx')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed 2')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('sanitizeHtml - Error Handling and Edge Cases', () => {
    it('should handle HTML with multiple consecutive script tags', () => {
      const dirtyHtml = '<script>bad1</script><p>Good</p><script>bad2</script><p>Also Good</p>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('<p>Good</p>');
      expect(result.sanitized).toContain('<p>Also Good</p>');
      expect(result.removed).toBeGreaterThanOrEqual(2);
    });

    it('should handle mixed case event handlers', () => {
      const dirtyHtml = '<div onClick="alert()" onMOUSEOVER="alert()" OnLoAd="alert()">Test</div>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('alert');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle vbscript protocol URLs', () => {
      const dirtyHtml = '<a href="vbscript:msgbox(\'xss\')">Click</a>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('vbscript:');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle multiple dangerous patterns in single element', () => {
      const dirtyHtml = '<div onload="eval()" onclick="alert()" style="background:url(javascript:void(0))">Danger</div>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.removed).toBeGreaterThanOrEqual(2);
      expect(result.isClean).toBe(false);
    });

    it('should preserve HTML structure while removing dangerous content', () => {
      const dirtyHtml = '<div><h1>Title</h1><script>alert()</script><p>Content</p><img onerror="alert()" /></div>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).toContain('<h1>Title</h1>');
      expect(result.sanitized).toContain('<p>Content</p>');
      expect(result.sanitized).toContain('<div>');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should handle applet tag injection', () => {
      const dirtyHtml = '<applet code="evil.class"><param name="alert" value="xss"></applet>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('<applet>');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle deeply nested dangerous content', () => {
      const dirtyHtml = '<div><div><div><script>alert()</script></div></div></div>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle table with dangerous attributes', () => {
      const dirtyHtml = '<table border="1" onload="alert()"><tr onclick="alert()"><td>Data</td></tr></table>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).toContain('<table');
      expect(result.sanitized).toContain('border="1"');
      expect(result.sanitized).not.toContain('onload');
      expect(result.sanitized).not.toContain('onclick');
    });

    it('should handle link tag injection', () => {
      const dirtyHtml = '<p>Content</p><link rel="stylesheet" href="javascript:alert(\'xss\')" />';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('<link');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle meta tag injection', () => {
      const dirtyHtml = '<head><meta http-equiv="refresh" content="0;url=javascript:alert(\'xss\')" /></head>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('<meta');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle complex data URL attack with nested scripts', () => {
      const dirtyHtml = '<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4="></iframe>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('data:');
      expect(result.removed).toBeGreaterThan(0);
    });

    it('should handle very long dangerous content', () => {
      const longScript = '<script>' + 'a'.repeat(10000) + '</script>';
      const dirtyHtml = '<p>Before</p>' + longScript + '<p>After</p>';
      const result = sanitizeHtml(dirtyHtml);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('<p>Before</p>');
      expect(result.sanitized).toContain('<p>After</p>');
    });
  });

  describe('sanitizeHtml - Real-world Scenarios', () => {
    it('should sanitize HTML from Gemini AI response', () => {
      const aiResponse = `
        <div class="report">
          <h1>Timeline</h1>
          <p>Updated at <script>alert('xss')</script> 2025-11-21</p>
          <table>
            <tr onclick="alert('xss')">
              <td>2025-11-21</td>
              <td>Incident detected</td>
            </tr>
          </table>
        </div>
      `;
      const result = sanitizeHtml(aiResponse);

      expect(result.sanitized).toContain('<h1>Timeline</h1>');
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('onclick');
    });

    it('should sanitize HTML report with external scripts', () => {
      const reportHtml = `
        <article>
          <header><h1>DFIR Report</h1></header>
          <script src="https://evil.com/xss.js"></script>
          <section>
            <h2>Summary</h2>
            <p>Attack vectors detected</p>
          </section>
        </article>
      `;
      const result = sanitizeHtml(reportHtml);

      expect(result.sanitized).not.toContain('<script');
      expect(result.sanitized).toContain('DFIR Report');
      expect(result.sanitized).toContain('Summary');
    });

    it('should sanitize user-generated report content', () => {
      const userContent = `
        <div class="user-input" onload="loadMalicious()">
          <p>User wants to add: <img src="x" onerror="fetch('/steal?data=' + document.cookie)" /></p>
          <a href="javascript:stealCookies()">Visit</a>
        </div>
      `;
      const result = sanitizeHtml(userContent);

      expect(result.removed).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).not.toContain('onload');
    });
  });
});
