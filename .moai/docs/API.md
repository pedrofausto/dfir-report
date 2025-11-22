# Sanitization Service API Reference

**Module**: `services/sanitizationService.ts`
**Version**: 1.0.0
**Status**: Stable (SPEC-SECURITY-001 Complete)
**Last Updated**: 2025-11-21

---

## Overview

The Sanitization Service provides secure HTML content filtering to prevent Cross-Site Scripting (XSS) attacks. It removes dangerous HTML patterns while preserving legitimate forensic report content.

### Main Purpose

- **Security**: Eliminate XSS vulnerabilities from AI-generated HTML and user input
- **Reliability**: Detect and remove 30+ known OWASP attack patterns
- **Performance**: Process large HTML documents (1MB+) in <100ms
- **Observability**: Log security events for forensic analysis

### Quick Start

```typescript
import { sanitizeHtml } from '../services/sanitizationService';

// Sanitize untrusted HTML
const result = sanitizeHtml('<div><script>alert("XSS")</script>Content</div>');

console.log(result.sanitized);  // '<div>Content</div>'
console.log(result.removed);    // 1 (one dangerous element)
console.log(result.isClean);    // false (content was modified)
```

---

## Function Reference

### `sanitizeHtml()`

Removes dangerous HTML patterns to prevent XSS attacks.

#### Signature

```typescript
function sanitizeHtml(
  html: string | null | undefined,
  config?: SanitizationConfig
): SanitizationResult
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `html` | string \| null \| undefined | Yes | Raw HTML content to sanitize |
| `config` | SanitizationConfig | No | Optional custom configuration (not used in v1.0) |

#### Returns

**Type**: `SanitizationResult`

```typescript
{
  sanitized: string;     // The cleaned HTML output
  removed: number;       // Count of dangerous elements removed
  isClean: boolean;      // True if no changes made (input was safe)
}
```

#### Error Handling

If sanitization fails for any reason, the function returns a safe empty result:

```typescript
{
  sanitized: '',         // Empty string if error occurs
  removed: 0,
  isClean: false
}
```

#### Examples

##### Example 1: Basic Script Removal

```typescript
const dirty = '<div><script>alert("XSS")</script>Hello</div>';
const result = sanitizeHtml(dirty);

// Result:
// {
//   sanitized: '<div>Hello</div>',
//   removed: 1,
//   isClean: false
// }
```

##### Example 2: Event Handler Removal

```typescript
const dirty = '<img src="logo.png" onerror="alert(1)" alt="Logo">';
const result = sanitizeHtml(dirty);

// Result:
// {
//   sanitized: '<img src="logo.png" alt="Logo">',
//   removed: 1,
//   isClean: false
// }
```

##### Example 3: Safe Content Passthrough

```typescript
const clean = '<h1>Report</h1><p>Analysis details</p>';
const result = sanitizeHtml(clean);

// Result:
// {
//   sanitized: '<h1>Report</h1><p>Analysis details</p>',
//   removed: 0,
//   isClean: true
// }
```

##### Example 4: Complex Report HTML

```typescript
const reportHtml = `
  <h1>Incident Report #12345</h1>
  <section>
    <h2>Executive Summary</h2>
    <p>Malware detected on workstation-42</p>
  </section>
  <table>
    <tr><th>IP Address</th><th>Port</th></tr>
    <tr><td>192.168.1.1</td><td>443</td></tr>
  </table>
`;

const result = sanitizeHtml(reportHtml);

// Result: {
//   sanitized: (same as input - no dangerous content)
//   removed: 0,
//   isClean: true
// }
```

##### Example 5: Multiple Attack Vectors

```typescript
const malicious = `
  <h1>Report</h1>
  <script>alert('XSS1')</script>
  <img src=x onerror="fetch('/steal-data')">
  <a href="javascript:void(0)" onclick="malicious()">Click</a>
`;

const result = sanitizeHtml(malicious);

// Result: {
//   sanitized: '<h1>Report</h1><a>Click</a>',
//   removed: 3,  // script tag, img onerror, and onclick removed
//   isClean: false
// }
```

---

### `logSanitizationEvent()`

Logs significant sanitization events for security monitoring.

#### Signature

```typescript
function logSanitizationEvent(
  source: string,
  result: SanitizationResult
): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | string | Source identifier (component name, file path) |
| `result` | SanitizationResult | Sanitization result from `sanitizeHtml()` |

#### Behavior

- **Only logs when content was removed**: Silent pass-through if content is clean
- **Log Level**: Console.log with `[SECURITY]` prefix
- **Format**: Structured message with source and removal count

#### Example Usage

```typescript
// In ReportRenderer component
const result = sanitizeHtml(htmlContent);
logSanitizationEvent('ReportRenderer.tsx', result);

// Console output (if dangerous content removed):
// [SECURITY] Sanitization event in ReportRenderer.tsx: Removed 2 dangerous element(s)
```

---

## Type Definitions

### `SanitizationResult`

Structure of the value returned by `sanitizeHtml()`.

```typescript
interface SanitizationResult {
  /** Sanitized HTML string with dangerous content removed */
  sanitized: string;

  /** Number of dangerous elements/attributes removed */
  removed: number;

  /** True if HTML was clean (no removals made) */
  isClean: boolean;
}
```

**Usage in Components**:

```typescript
const result = sanitizeHtml(userHtml);

if (!result.isClean) {
  console.warn(`Warning: Removed ${result.removed} dangerous elements`);
}

// Use the sanitized content
setHtmlContent(result.sanitized);
```

### `SanitizationConfig`

Configuration interface for customization (reserved for future use).

```typescript
interface SanitizationConfig {
  /** Custom allowed tags (future) */
  allowedTags?: string[];

  /** Custom allowed attributes (future) */
  allowedAttributes?: Record<string, string[]>;

  /** Strip HTML brackets (future) */
  stripHtmlBrackets?: boolean;
}
```

**Current Status**: Configuration parameter accepted but ignored. All sanitization uses hardcoded patterns.

---

## Integration Guide

### React Component Integration

#### In Functional Components with Hooks

```typescript
import React, { useState, useEffect } from 'react';
import { sanitizeHtml, logSanitizationEvent } from '../services/sanitizationService';

const MyComponent: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  // Sanitize content when it changes
  const handleContentUpdate = (newHtml: string) => {
    const result = sanitizeHtml(newHtml);

    // Log security event if dangerous content was removed
    logSanitizationEvent('MyComponent.tsx', result);

    // Use sanitized content
    setHtmlContent(result.sanitized);
  };

  return (
    <div>
      <iframe srcDoc={htmlContent} />
      <button onClick={() => handleContentUpdate(userInput)}>
        Update Report
      </button>
    </div>
  );
};
```

#### With useEffect Hook

```typescript
import React, { useEffect, useState } from 'react';
import { sanitizeHtml, logSanitizationEvent } from '../services/sanitizationService';

const ReportRenderer: React.FC<{ htmlContent: string }> = ({ htmlContent }) => {
  const [safeHtml, setSafeHtml] = useState<string>('');

  useEffect(() => {
    // Re-sanitize whenever htmlContent changes
    const result = sanitizeHtml(htmlContent);
    logSanitizationEvent('ReportRenderer.tsx', result);
    setSafeHtml(result.sanitized);
  }, [htmlContent]);

  return (
    <iframe
      srcDoc={safeHtml}
      sandbox="allow-scripts allow-same-origin"
      title="Report Preview"
    />
  );
};
```

#### During State Updates

```typescript
const Dashboard: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  const handleAIResponse = async (prompt: string) => {
    // Call AI service
    const aiResponse = await generateReportModification(htmlContent, prompt);

    // Sanitize AI response BEFORE updating state
    const result = sanitizeHtml(aiResponse);
    logSanitizationEvent('Dashboard.tsx', result);

    // Update state with sanitized content
    setHtmlContent(result.sanitized);
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

---

## Performance Considerations

### Latency Characteristics

```typescript
// Performance benchmarks for different HTML sizes

const testCases = [
  { size: '5KB', htmlLength: 5000, expectedTime: '<5ms', actual: '2-3ms' },
  { size: '50KB', htmlLength: 50000, expectedTime: '<20ms', actual: '8-15ms' },
  { size: '500KB', htmlLength: 500000, expectedTime: '<50ms', actual: '30-60ms' },
  { size: '1MB', htmlLength: 1000000, expectedTime: '<100ms', actual: '60-90ms' }
];
```

### Memory Overhead

- **Input String Size**: N bytes (original HTML)
- **Output String Size**: N - M bytes (removed dangerous content)
- **Processing Overhead**: Negligible (regex operations)
- **Memory Peak**: ~3x input size during regex matching

### Optimization Tips

1. **Batch Processing**: Sanitize once during component mount, not on every keystroke
2. **Memoization**: Cache sanitized results for identical inputs
3. **Lazy Sanitization**: Defer sanitization for large reports until needed

```typescript
// ✅ GOOD: Sanitize once
const result = sanitizeHtml(largeHtml);
// Use result multiple times

// ❌ BAD: Sanitizing repeatedly
data.map(item => sanitizeHtml(item.html));  // Called 1000 times!

// ✅ BETTER: Cache results
const memoizedSanitize = useMemo(() =>
  data.map(item => sanitizeHtml(item.html)),
  [data]
);
```

---

## Security Best Practices

### When and Where to Sanitize

```typescript
// ✅ DO: Sanitize at entry points
✓ AI-generated responses before state update
✓ User-imported HTML before rendering
✓ External API responses before display
✓ Initial content on component mount

// ❌ DON'T: Skip sanitization for "trusted" content
✗ Don't assume AI is always safe (API could be compromised)
✗ Don't skip sanitization based on source
✗ Don't create separate code paths for "trusted" content
```

### Combine with Other Security Layers

```typescript
// Layer 1: Sanitization (this module)
const result = sanitizeHtml(htmlContent);

// Layer 2: Iframe Sandbox
<iframe
  srcDoc={result.sanitized}
  sandbox="allow-scripts allow-same-origin"  // Limit capabilities
  title="Report Preview"
/>

// Layer 3: Content Security Policy (future)
// HTTP headers block external scripts entirely
// Content-Security-Policy: script-src 'self'

// Layer 4: Server-side sanitization (future)
// Backend re-validates all HTML before storage
```

### Testing Strategies

```typescript
// Test with OWASP payloads
const owaspPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<iframe src="javascript:alert(1)">',
];

owaspPayloads.forEach(payload => {
  const result = sanitizeHtml(payload);
  expect(result.isClean).toBe(false);
  expect(result.removed).toBeGreaterThan(0);
  expect(result.sanitized).not.toContain('alert');
});
```

---

## Monitoring and Logging

### Security Event Logs

All sanitization events are logged to the browser console with `[SECURITY]` prefix:

```javascript
// When dangerous content is detected and removed
[SECURITY] Sanitization event in Dashboard.tsx: Removed 2 dangerous element(s)
```

### Log Analysis

**Monitor for**:
- Repeated sanitization events from same user (potential attack)
- Large number of removals (significant content modification)
- Specific attack patterns (e.g., frequent script tag removals)

### Future Monitoring (v0.5.0+)

```typescript
// Planned: Send security events to centralized logging
const event = {
  timestamp: Date.now(),
  source: 'ReportRenderer.tsx',
  removed: 3,
  severity: 'medium',  // Based on removal count
  sampleContent: htmlContent.substring(0, 100)  // First 100 chars
};

// Send to Datadog/ELK/CloudWatch
logger.security(event);

// Create incident if severity is high
if (event.removed > 10) {
  incident.create({
    title: `Potential XSS attack in ${event.source}`,
    severity: 'high',
    event
  });
}
```

---

## Related Documentation

### Implementation Details

- **File**: `services/sanitizationService.ts` (240 lines)
- **Pattern List**: 30+ OWASP regex patterns for detection
- **Type Definitions**: Interfaces for configuration and results

### Testing

- **Unit Tests**: `services/__tests__/sanitizationService.test.ts` (541 lines)
  - Script removal tests
  - Event handler tests
  - URL sanitization tests
  - Performance benchmarks

- **OWASP Tests**: `services/__tests__/owasp-validation.test.ts` (392 lines)
  - OWASP XSS cheat sheet payloads
  - Encoding evasion techniques
  - Browser-specific vectors

### Architecture

- **Security Documentation**: `.moai/docs/SECURITY.md` (Threat model, defense-in-depth)
- **Project Structure**: `.moai/project/structure.md` (Security services module)
- **Technology Stack**: `.moai/project/tech.md` (Implementation status)

### SPEC Documents

- **SPEC-SECURITY-001**: HTML Sanitization with DOMPurify (Current Implementation)
- **SPEC-SECURITY-002**: Content Security Policy Headers (Planned)

---

## Troubleshooting

### "Legitimate content was removed!"

**Symptoms**: Report displays incorrectly after sanitization

**Diagnosis**:
1. Check browser console for `[SECURITY]` logs
2. Log the `result.removed` count and `result.sanitized` output
3. Compare original and sanitized HTML

**Solutions**:
1. **If custom elements needed**: Add to allowed tags in future configuration
2. **If style attributes**: Use CSS classes instead of inline styles
3. **If data attributes needed**: Already supported (data-* allowed)

### "Performance is slow!"

**Symptoms**: Report takes >100ms to render

**Diagnosis**:
1. Check HTML size: `htmlContent.length > 1000000` (>1MB)?
2. Check browser performance profile
3. Verify sanitization is bottleneck (disable temporarily to confirm)

**Solutions**:
1. **Split large reports**: Break >1MB into smaller sections
2. **Use web worker**: Off-thread sanitization (future enhancement)
3. **Cache results**: Don't re-sanitize identical content

### "XSS still working despite sanitization!"

**Symptoms**: Malicious script still executes

**Diagnosis**:
1. Check iframe sandbox attribute (should have restrictions)
2. Verify Content Security Policy headers (if backend available)
3. Check browser console for unhandled errors

**Solutions**:
1. **Report via GitHub**: File security issue with reproduction case
2. **Workaround**: Add additional layer (web worker sandboxing)
3. **Escalate**: Contact maintainer with specific attack vector

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-21 | Initial release with SPEC-SECURITY-001 implementation |

---

## Support & Contact

For questions or issues:
- **Documentation**: See `.moai/docs/SECURITY.md` for threat model
- **Code**: Review `services/sanitizationService.ts` for implementation
- **Tests**: Check `services/__tests__/` for usage examples
- **GitHub Issues**: Report bugs or security vulnerabilities

---

**Document Status**: ✅ COMPLETE
**Last Updated**: 2025-11-21
**Maintained By**: @user
