# Acceptance Criteria: SPEC-SECURITY-001

**TAG**: `SPEC-SECURITY-001`
**Feature**: HTML Sanitization with DOMPurify
**Created**: 2025-11-21
**Owner**: @user

---

## OVERVIEW

This document defines detailed acceptance criteria using Given-When-Then scenarios to validate that HTML sanitization successfully eliminates XSS vulnerabilities while preserving legitimate report content.

---

## ACCEPTANCE CRITERIA SCENARIOS

### AC-1: DOMPurify Installation and Configuration

#### Scenario 1.1: Dependency Installation

**Given** the project is initialized with npm package management
**When** the developer runs `npm install` after adding DOMPurify dependencies
**Then** the following conditions are met:
- `dompurify` package is listed in `package.json` under `dependencies` (not `devDependencies`)
- `@types/dompurify` package is listed in `package.json` under `dependencies` or `devDependencies`
- `node_modules/dompurify/` directory exists
- `node_modules/@types/dompurify/` directory exists
- No peer dependency warnings or conflicts appear in npm output
- TypeScript compiler recognizes DOMPurify types (no "cannot find module" errors)

**Verification Method**: Manual inspection of `package.json`, `npm install` output, and TypeScript compilation

---

#### Scenario 1.2: TypeScript Type Definitions

**Given** DOMPurify is installed with TypeScript definitions
**When** the developer imports DOMPurify in a `.ts` file
**Then** the following conditions are met:
- TypeScript autocomplete suggests DOMPurify methods (`sanitize`, `setConfig`)
- No TypeScript compilation errors related to DOMPurify imports
- IDE displays type hints for `DOMPurify.sanitize()` function

**Verification Method**: TypeScript compilation (`npm run build`), IDE type checking

---

### AC-2: Sanitization Service Implementation

#### Scenario 2.1: Sanitize Legitimate HTML

**Given** the sanitization service is implemented with DFIR-appropriate configuration
**When** the `sanitizeHtml()` function receives legitimate report HTML
**Then** the output HTML is identical to the input (no content removed)

**Test Case Examples**:
```typescript
// Test 1: Semantic HTML structure
Input:  '<h1>Incident Report</h1><p>Analysis details</p>'
Output: '<h1>Incident Report</h1><p>Analysis details</p>'

// Test 2: Tables with forensic data
Input:  '<table><thead><tr><th>IP</th><th>Port</th></tr></thead><tbody><tr><td>192.168.1.1</td><td>443</td></tr></tbody></table>'
Output: Identical (table structure preserved)

// Test 3: Code blocks
Input:  '<pre><code>GET /api/malware HTTP/1.1</code></pre>'
Output: Identical (code formatting preserved)

// Test 4: Data attributes
Input:  '<div data-incident-id="12345" data-severity="critical">Alert</div>'
Output: Identical (data-* attributes preserved)
```

**Verification Method**: Unit tests with exact string comparison

---

#### Scenario 2.2: Remove Script Tags

**Given** the sanitization service is configured to block `<script>` tags
**When** the `sanitizeHtml()` function receives HTML with script injection
**Then** all script tags and their content are removed

**Test Case Examples**:
```typescript
// Test 1: Inline script
Input:  '<div><script>alert("XSS")</script>Content</div>'
Output: '<div>Content</div>'

// Test 2: External script
Input:  '<script src="https://evil.com/malware.js"></script><p>Text</p>'
Output: '<p>Text</p>'

// Test 3: Nested scripts
Input:  '<div><div><script>fetch("steal-data")</script></div></div>'
Output: '<div><div></div></div>'
```

**Verification Method**: Unit tests with assertion that output does not contain `<script>` or `</script>`

---

#### Scenario 2.3: Remove Event Handlers

**Given** the sanitization service is configured to block `on*` event attributes
**When** the `sanitizeHtml()` function receives HTML with event handler injection
**Then** all event handler attributes are removed while preserving safe attributes

**Test Case Examples**:
```typescript
// Test 1: onerror injection
Input:  '<img src="logo.png" onerror="alert(1)" alt="Logo">'
Output: '<img src="logo.png" alt="Logo">'

// Test 2: onclick injection
Input:  '<button onclick="malicious()" class="btn">Click</button>'
Output: '<button class="btn">Click</button>'

// Test 3: Multiple event handlers
Input:  '<div onload="steal()" onmouseover="track()" id="container">Text</div>'
Output: '<div id="container">Text</div>'
```

**Verification Method**: Unit tests with regex assertion that output does not match `/\son\w+=/`

---

#### Scenario 2.4: Block Dangerous URLs

**Given** the sanitization service is configured to block `javascript:` and dangerous data URLs
**When** the `sanitizeHtml()` function receives HTML with malicious URLs
**Then** dangerous URLs are removed or sanitized while preserving safe URLs

**Test Case Examples**:
```typescript
// Test 1: javascript: protocol
Input:  '<a href="javascript:alert(1)">Click</a>'
Output: '<a>Click</a>' OR '<a href="about:blank">Click</a>'

// Test 2: data:text/html injection
Input:  '<a href="data:text/html,<script>alert(1)</script>">Link</a>'
Output: '<a>Link</a>' OR '<a href="about:blank">Link</a>'

// Test 3: Safe URLs preserved
Input:  '<a href="https://example.com">Safe</a><a href="mailto:admin@dfir.com">Email</a>'
Output: Identical (https and mailto preserved)
```

**Verification Method**: Unit tests with assertion that output does not contain `javascript:` or `data:text/html`

---

#### Scenario 2.5: Block Iframe and Embed Tags

**Given** the sanitization service is configured to block `<iframe>`, `<object>`, `<embed>`
**When** the `sanitizeHtml()` function receives HTML with embedded content
**Then** all embedding tags are removed

**Test Case Examples**:
```typescript
// Test 1: Iframe injection
Input:  '<iframe src="https://evil.com"></iframe><p>Text</p>'
Output: '<p>Text</p>'

// Test 2: Object tag
Input:  '<object data="malware.swf"></object>'
Output: ''

// Test 3: Embed tag
Input:  '<embed src="malicious.pdf"></embed>'
Output: ''
```

**Verification Method**: Unit tests with assertion that output does not contain `<iframe>`, `<object>`, or `<embed>`

---

#### Scenario 2.6: Preserve CSS Classes and IDs

**Given** the sanitization service is configured to allow `class` and `id` attributes
**When** the `sanitizeHtml()` function receives HTML with styling attributes
**Then** class and id attributes are preserved for legitimate styling

**Test Case Examples**:
```typescript
// Test 1: Class preservation
Input:  '<div class="bg-cyber-800 text-white p-4">Styled Content</div>'
Output: Identical (Tailwind classes preserved)

// Test 2: ID preservation
Input:  '<section id="executive-summary">Summary</section>'
Output: Identical (ID preserved for navigation)

// Test 3: Multiple classes
Input:  '<span class="font-bold text-lg text-blue-500">Highlighted</span>'
Output: Identical (all classes preserved)
```

**Verification Method**: Unit tests with exact string comparison

---

### AC-3: ReportRenderer Integration

#### Scenario 3.1: Initial Report Load Sanitization

**Given** the ReportRenderer component is initialized with `htmlContent` prop
**When** the component mounts and renders the iframe
**Then** the HTML written to the iframe is sanitized

**Test Case**:
```typescript
// Component test
const maliciousHtml = '<h1>Report</h1><script>alert("XSS")</script>';
render(<ReportRenderer htmlContent={maliciousHtml} />);

// Verification
const iframe = screen.getByTitle('DFIR Report Preview');
const iframeDoc = iframe.contentDocument;
expect(iframeDoc.body.innerHTML).toContain('<h1>Report</h1>');
expect(iframeDoc.body.innerHTML).not.toContain('<script>');
```

**Verification Method**: React Testing Library component test

---

#### Scenario 3.2: Dynamic Content Update Sanitization

**Given** the ReportRenderer is displaying sanitized content
**When** the `htmlContent` prop changes to new malicious HTML
**Then** the new content is sanitized before rendering

**Test Case**:
```typescript
// Component test with prop update
const { rerender } = render(<ReportRenderer htmlContent="<p>Initial</p>" />);

const newHtml = '<p>Updated</p><img src=x onerror=alert(1)>';
rerender(<ReportRenderer htmlContent={newHtml} />);

// Verification
const iframe = screen.getByTitle('DFIR Report Preview');
const iframeDoc = iframe.contentDocument;
expect(iframeDoc.body.innerHTML).toContain('<p>Updated</p>');
expect(iframeDoc.body.innerHTML).not.toContain('onerror');
```

**Verification Method**: React Testing Library component test with prop updates

---

#### Scenario 3.3: Performance - Sanitization Completes Within Target

**Given** the ReportRenderer receives a large HTML document (1MB)
**When** the sanitization is applied in the `useEffect` hook
**Then** the sanitization completes within 100ms (P95 latency)

**Test Case**:
```typescript
// Performance benchmark
const largeHtml = '<div>' + '<p>Content</p>'.repeat(10000) + '</div>'; // ~1MB

const startTime = performance.now();
const sanitized = sanitizeHtml(largeHtml);
const endTime = performance.now();

expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
```

**Verification Method**: Performance benchmark test

---

### AC-4: Dashboard AI Response Sanitization

#### Scenario 4.1: AI Response Sanitized Before State Update

**Given** the Dashboard receives AI-generated HTML from `generateReportModification()`
**When** the AI response contains malicious content
**Then** the HTML is sanitized before `setHtmlContent()` updates state

**Test Case**:
```typescript
// Mock AI service to return malicious HTML
jest.mock('../services/geminiService', () => ({
  generateReportModification: jest.fn().mockResolvedValue(
    '<h1>New Section</h1><script>alert("XSS")</script>'
  )
}));

// Render Dashboard and send AI command
render(<Dashboard user={mockUser} onLogout={jest.fn()} />);
const input = screen.getByPlaceholderText(/Ask me to modify/);
fireEvent.change(input, { target: { value: 'Add new section' } });
fireEvent.click(screen.getByText('Send'));

await waitFor(() => {
  // Verify state contains sanitized HTML
  expect(screen.getByTitle('DFIR Report Preview').contentDocument.body.innerHTML)
    .toContain('<h1>New Section</h1>');
  expect(screen.getByTitle('DFIR Report Preview').contentDocument.body.innerHTML)
    .not.toContain('<script>');
});
```

**Verification Method**: Integration test with mocked AI service

---

#### Scenario 4.2: Sanitization Does Not Break AI Workflow

**Given** the Dashboard AI workflow is functioning normally
**When** a user sends a legitimate AI command
**Then** the sanitized response renders correctly without errors

**Test Case**:
```typescript
// Mock AI service to return legitimate HTML
jest.mock('../services/geminiService', () => ({
  generateReportModification: jest.fn().mockResolvedValue(
    '<section><h2>Executive Summary</h2><p>Analysis complete</p></section>'
  )
}));

render(<Dashboard user={mockUser} onLogout={jest.fn()} />);
const input = screen.getByPlaceholderText(/Ask me to modify/);
fireEvent.change(input, { target: { value: 'Add executive summary' } });
fireEvent.click(screen.getByText('Send'));

await waitFor(() => {
  expect(screen.getByText('Executive Summary')).toBeInTheDocument();
  expect(screen.getByText('Analysis complete')).toBeInTheDocument();
});
```

**Verification Method**: Integration test with mocked AI service

---

### AC-5: OWASP XSS Cheat Sheet Validation

#### Scenario 5.1: Block All OWASP XSS Payloads

**Given** the sanitization service is deployed with production configuration
**When** each OWASP XSS filter evasion payload is tested
**Then** all payloads are neutralized (100% block rate)

**Test Cases** (Sample from OWASP XSS Cheat Sheet):
```typescript
const owaspPayloads = [
  // Basic XSS
  '<script>alert("XSS")</script>',

  // IMG onerror
  '<img src=x onerror=alert(1)>',

  // SVG onload
  '<svg onload=alert(1)>',

  // Body onload
  '<body onload=alert(1)>',

  // Iframe src
  '<iframe src="javascript:alert(1)">',

  // Input autofocus
  '<input onfocus=alert(1) autofocus>',

  // Object data
  '<object data="javascript:alert(1)">',

  // Embed src
  '<embed src="data:text/html,<script>alert(1)</script>">',

  // Meta refresh
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',

  // Link href
  '<link rel="stylesheet" href="javascript:alert(1)">',
];

owaspPayloads.forEach((payload, index) => {
  it(`blocks OWASP payload ${index + 1}`, () => {
    const sanitized = sanitizeHtml(payload);
    expect(sanitized).not.toContain('alert');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onload');
  });
});
```

**Verification Method**: Unit tests with OWASP payload library

---

### AC-6: Security Logging

#### Scenario 6.1: Log Warning When Content Removed

**Given** the sanitization service detects significant content removal (>5% size reduction)
**When** malicious content is sanitized
**Then** a warning is logged with forensic details

**Test Case**:
```typescript
// Mock console.warn to capture logs
const consoleWarnSpy = jest.spyOn(console, 'warn');

// Test with malicious payload (significant content removal)
const dirty = '<div>Legit</div>' + '<script>'.repeat(100) + 'alert(1)</script>'.repeat(100);
const clean = sanitizeHtml(dirty);

expect(consoleWarnSpy).toHaveBeenCalledWith(
  expect.stringContaining('[SECURITY] DOMPurify removed significant content'),
  expect.objectContaining({
    original_length: expect.any(Number),
    sanitized_length: expect.any(Number),
    removed_percentage: expect.any(String)
  })
);

consoleWarnSpy.mockRestore();
```

**Verification Method**: Unit test with console spy

---

## QUALITY GATE SUMMARY

### Functional Requirements Validation

- ✅ **FR-1**: DOMPurify installed with correct versions and TypeScript support
- ✅ **FR-2**: `sanitizeHtml()` function implemented with correct signature and behavior
- ✅ **FR-3**: DOMPurify configuration blocks dangerous tags/attributes and preserves safe content
- ✅ **FR-4**: ReportRenderer sanitizes HTML before iframe rendering
- ✅ **FR-5**: Dashboard sanitizes AI responses before state update

### Non-Functional Requirements Validation

- ✅ **NFR-1**: Performance - Sanitization completes within 100ms for 1MB HTML (P95)
- ✅ **NFR-2**: Security - Configuration centralized for easy updates
- ✅ **NFR-3**: Observability - Logging captures sanitization events with forensic details

### Test Coverage Requirements

- ✅ **Unit Test Coverage**: ≥90% for `sanitizationService.ts`
- ✅ **Integration Test Coverage**: ≥85% for ReportRenderer and Dashboard sanitization paths
- ✅ **OWASP Payload Coverage**: 100% block rate for XSS cheat sheet payloads

---

## DEFINITION OF DONE

The SPEC-SECURITY-001 feature is considered **DONE** when:

1. **All Acceptance Criteria Pass**: Every Given-When-Then scenario above passes automated tests
2. **Test Coverage Achieved**: ≥90% coverage for sanitization service, ≥85% for integration points
3. **OWASP Validation**: 100% of OWASP XSS cheat sheet payloads blocked
4. **Performance Validated**: P95 latency <100ms for 1MB HTML, <20ms for 50KB HTML
5. **Manual Security Testing**: Penetration tester confirms no XSS bypass vectors
6. **Code Review Passed**: Security expert and backend expert approve implementation
7. **Documentation Updated**: Inline comments, README (if applicable), and SPEC documents finalized
8. **Git Commit Tagged**: All commits tagged with `SPEC-SECURITY-001` for traceability
9. **User Acceptance Testing**: Product owner confirms reports render correctly without content loss
10. **Production Deployment**: Feature deployed to production environment with monitoring enabled

---

## VERIFICATION CHECKLIST

### Pre-Deployment Verification

- [ ] All unit tests pass (`npm run test`)
- [ ] All integration tests pass
- [ ] TypeScript compilation succeeds with no errors (`npm run build`)
- [ ] OWASP XSS payloads tested and blocked
- [ ] Performance benchmarks meet targets
- [ ] Security logging verified with malicious payloads
- [ ] Manual testing with real DFIR report samples
- [ ] Code review approved by security-expert and backend-expert

### Post-Deployment Verification

- [ ] Production monitoring confirms no XSS incidents
- [ ] User feedback collected (no false positive reports)
- [ ] Performance metrics tracked (no latency degradation)
- [ ] Sanitization logs reviewed for suspicious patterns
- [ ] Dependency vulnerability scans pass (Dependabot, npm audit)

---

**TAG**: `SPEC-SECURITY-001`
**End of Acceptance Criteria**
