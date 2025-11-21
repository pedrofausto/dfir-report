# SPEC-SECURITY-001: HTML Sanitization with DOMPurify

**TAG**: `SPEC-SECURITY-001`
**Status**: Draft
**Created**: 2025-11-21
**Owner**: @user
**Project**: dfir-report
**Priority**: CRITICAL (Security Vulnerability)

---

## TAG BLOCK

```yaml
tag_id: SPEC-SECURITY-001
domain: SECURITY
subdomain: XSS_PREVENTION
version: 1.0.0
status: draft
created_at: 2025-11-21
updated_at: 2025-11-21
owner: @user
project: dfir-report
```

---

## OVERVIEW

### Purpose

Mitigate critical XSS (Cross-Site Scripting) vulnerabilities in the DFIR Cortex report rendering system by implementing DOMPurify HTML sanitization. Currently, AI-generated HTML content is rendered without validation, creating a severe security risk where malicious scripts could execute in the user's browser context.

### Background

**Current Security Gap**:
- **ReportRenderer.tsx** (Line 30): Uses `doc.write(htmlContent)` to inject unsanitized HTML into iframe
- **Dashboard.tsx** (Line 38): Accepts AI-generated HTML from Gemini API without validation
- **No input sanitization**: AI responses processed without XSS filtering
- **Severity**: CRITICAL - Allows arbitrary JavaScript execution

**Impact**:
- User session hijacking through cookie theft
- Malicious AI responses injecting keyloggers
- Report data exfiltration to external servers
- Compliance violations (SOC 2, GDPR requirements)

### Goals

1. **Primary**: Eliminate XSS vulnerabilities in report rendering pipeline
2. **Secondary**: Establish sanitization utility for reuse across application
3. **Tertiary**: Maintain current functionality while enforcing security controls

---

## ENVIRONMENT

### WHEN the application renders HTML content for DFIR reports

**Trigger Events**:
- User authenticates and Dashboard component loads initial report (INITIAL_REPORT_HTML)
- AI assistant processes natural language command and returns modified HTML
- Report content updates via `setHtmlContent()` state mutation
- PDF export extracts rendered HTML from iframe for document generation

**Context**:
- React 19.2.0 application using TypeScript 5.8.2
- Vite 6.2.0 build environment
- Iframe-based rendering with `sandbox="allow-scripts allow-same-origin allow-modals"`
- Client-side AI integration via Google Gemini API

**Preconditions**:
- User authenticated with role-based permissions (Admin, Lead, Analyst, Viewer)
- Dashboard component mounted and report state initialized
- Network connection available for AI API calls

---

## ASSUMPTIONS

### Technology Assumptions

1. **DOMPurify Library Compatibility**:
   - Latest stable DOMPurify version (3.x.x) is compatible with React 19 and TypeScript 5.8
   - Library supports TypeScript type definitions via `@types/dompurify`
   - No conflicts with existing dependencies (react, react-dom, @google/genai)

2. **HTML Structure Preservation**:
   - Legitimate report HTML uses standard semantic elements (div, section, h1-h6, p, table)
   - AI-generated modifications do not rely on inline event handlers (onclick, onerror)
   - Current report styling uses CSS classes and external stylesheets (not inline `<style>` with dangerous content)

3. **Performance Requirements**:
   - Sanitization overhead acceptable for report sizes up to 1MB HTML
   - Real-time AI response processing maintains <5s total latency target
   - No visible UI lag during content updates

### User Behavior Assumptions

1. **Trusted AI Service**:
   - Google Gemini API generally returns safe HTML, but cannot be fully trusted
   - Malicious injection possible through prompt manipulation or API compromise
   - Defense-in-depth requires sanitization even for "trusted" sources

2. **Report Content Legitimacy**:
   - Users expect forensics-appropriate HTML elements (tables, lists, code blocks)
   - No legitimate use case for `<script>`, `<iframe>`, or event handlers in report content
   - Base64 encoded images in `<img src="data:image/...">` may be required for embedded diagrams

---

## REQUIREMENTS

### Functional Requirements

#### FR-1: DOMPurify Integration

**WHEN** the application initializes,
**IF** DOMPurify library is not installed,
**THEN** the system **SHALL** include `dompurify` (^3.x.x) and `@types/dompurify` (^3.x.x) as production dependencies in package.json.

**Acceptance Criteria**:
- Dependencies added to `package.json` under `dependencies` (not devDependencies)
- `npm install` successfully resolves DOMPurify without peer dependency conflicts
- TypeScript compiler recognizes DOMPurify type definitions

---

#### FR-2: Sanitization Utility Service

**WHEN** HTML content requires sanitization,
**IF** the content contains potentially dangerous elements or attributes,
**THEN** the system **SHALL** provide a `sanitizeHtml()` utility function in `services/sanitizationService.ts` that:
- Accepts raw HTML string as input
- Configures DOMPurify with DFIR-appropriate whitelist (see FR-3)
- Returns sanitized HTML string with malicious content removed
- Logs sanitization events when dangerous content is detected

**Acceptance Criteria**:
- Service exports typed function: `sanitizeHtml(dirtyHtml: string): string`
- Function is pure (no side effects beyond logging)
- Sanitized output preserves semantic HTML structure
- Service includes unit tests with malicious payload detection

---

#### FR-3: DOMPurify Configuration Profile

**WHEN** DOMPurify sanitizes HTML,
**IF** the content contains elements/attributes outside the whitelist,
**THEN** the system **SHALL** apply the following configuration:

**Allowed Elements** (Whitelist):
- Structure: `div, section, article, header, footer, main, aside`
- Headings: `h1, h2, h3, h4, h5, h6`
- Text: `p, span, strong, em, u, br, hr`
- Lists: `ul, ol, li, dl, dt, dd`
- Tables: `table, thead, tbody, tfoot, tr, th, td, caption`
- Code: `code, pre, kbd, samp`
- Media: `img` (with `src`, `alt`, `title` attributes only)
- Links: `a` (with `href`, `target`, `rel` attributes - `target` forced to `_blank`)
- Semantic: `blockquote, cite, abbr, time, mark, del, ins`

**Disallowed Elements** (Blocklist):
- Scripts: `script, noscript, object, embed, applet`
- Frames: `iframe, frame, frameset`
- Forms: `form, input, button, select, textarea` (not needed for read-only reports)
- Interactive: `audio, video, canvas` (future consideration if needed)

**Attribute Filtering**:
- Remove all event handlers: `on*` attributes (onclick, onerror, onload, etc.)
- Remove `style` attributes with dangerous CSS (expression, behavior, -moz-binding)
- Sanitize `href` to allow `http`, `https`, `mailto`, `#` (block `javascript:`, `data:text/html`)
- Preserve `class`, `id`, `data-*` attributes for styling/scripting isolation

**Acceptance Criteria**:
- Configuration exported as `DOMPURIFY_CONFIG` constant
- Malicious payloads from OWASP XSS cheat sheet are blocked
- Legitimate DFIR report samples pass sanitization without content loss

---

#### FR-4: ReportRenderer Sanitization Integration

**WHEN** the ReportRenderer component receives new `htmlContent` via props,
**IF** the content has not been sanitized,
**THEN** the system **SHALL** sanitize the HTML before rendering to the iframe.

**Implementation**:
- Import `sanitizeHtml` from `services/sanitizationService`
- Apply sanitization in `useEffect` hook before `doc.write()`
- Modified code:
  ```typescript
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        const safeHtml = sanitizeHtml(htmlContent); // ADDED
        doc.open();
        doc.write(safeHtml); // Changed from htmlContent
        doc.close();
      }
    }
  }, [htmlContent]);
  ```

**Acceptance Criteria**:
- All HTML rendered to iframe is sanitized
- Component re-renders correctly when `htmlContent` changes
- Performance overhead <50ms for typical 50KB reports

---

#### FR-5: Dashboard AI Response Sanitization

**WHEN** the Dashboard receives AI-generated HTML from `generateReportModification()`,
**IF** the AI response contains malicious content,
**THEN** the system **SHALL** sanitize the HTML before updating `htmlContent` state.

**Implementation**:
- Import `sanitizeHtml` in `Dashboard.tsx`
- Apply sanitization after AI response, before `setHtmlContent()`
- Modified code:
  ```typescript
  const newHtml = await generateReportModification(htmlContent, text);
  const safeHtml = sanitizeHtml(newHtml); // ADDED
  setHtmlContent(safeHtml); // Changed from newHtml
  ```

**Acceptance Criteria**:
- AI responses sanitized before state update
- User sees sanitized content in ReportRenderer
- Chat interface confirms successful update

---

### Non-Functional Requirements

#### NFR-1: Performance

**WHEN** sanitization is applied to HTML content,
**IF** the content size is ≤1MB,
**THEN** the system **SHALL** complete sanitization within 100ms (P95 latency).

**Rationale**: DOMPurify is highly optimized; typical reports (50-200KB) should sanitize in <20ms.

---

#### NFR-2: Security Hardening

**WHEN** sanitization configuration is defined,
**IF** new XSS attack vectors emerge,
**THEN** the system **SHALL** support configuration updates without code changes to components.

**Implementation**:
- DOMPurify config centralized in `sanitizationService.ts`
- Components import service (not DOMPurify directly)
- Config updates propagate automatically

---

#### NFR-3: Logging and Observability

**WHEN** DOMPurify removes malicious content,
**IF** the sanitized output differs from input,
**THEN** the system **SHALL** log a warning with:
- User ID and role
- Timestamp
- Removed elements/attributes count
- First 500 characters of dangerous content (for forensics)

**Purpose**: Detect AI model compromise or prompt injection attacks.

---

## SPECIFICATIONS

### Technical Design

#### Architecture Changes

**New File**: `services/sanitizationService.ts`
```typescript
import DOMPurify from 'dompurify';

export const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'div', 'section', 'article', 'header', 'footer', 'main', 'aside',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'strong', 'em', 'u', 'br', 'hr',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'code', 'pre', 'kbd', 'samp',
    'img', 'a',
    'blockquote', 'cite', 'abbr', 'time', 'mark', 'del', 'ins'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'data-*', 'src', 'alt', 'title', 'href', 'target', 'rel'
  ],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  ALLOW_DATA_ATTR: true,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true
};

export function sanitizeHtml(dirtyHtml: string): string {
  const clean = DOMPurify.sanitize(dirtyHtml, DOMPURIFY_CONFIG);

  // Detect if sanitization removed content
  if (clean.length < dirtyHtml.length * 0.95) {
    console.warn('[SECURITY] DOMPurify removed significant content', {
      original_length: dirtyHtml.length,
      sanitized_length: clean.length,
      removed_percentage: ((dirtyHtml.length - clean.length) / dirtyHtml.length * 100).toFixed(2)
    });
  }

  return clean;
}
```

**Modified Files**:
- `components/ReportRenderer.tsx`: Add sanitization in useEffect
- `components/Dashboard.tsx`: Add sanitization after AI response
- `package.json`: Add DOMPurify dependencies

---

#### Security Considerations

**Defense-in-Depth Strategy**:
1. **Input Sanitization** (This SPEC): DOMPurify removes malicious HTML
2. **Iframe Sandbox** (Existing): `sandbox` attribute limits script capabilities
3. **Content Security Policy** (Future): CSP headers block inline scripts (SPEC-SECURITY-002)
4. **Backend Validation** (Future): Server-side sanitization when backend implemented (v0.5.0)

**Known Limitations**:
- Client-side sanitization can be bypassed if attacker controls client
- Requires backend validation for true security (planned v0.5.0)
- DOMPurify protects against XSS but not CSRF or injection attacks

---

#### Testing Strategy

**Unit Tests** (`sanitizationService.test.ts`):
```typescript
describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const dirty = '<div><script>alert("XSS")</script>Hello</div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<div>Hello</div>');
  });

  it('removes event handlers', () => {
    const dirty = '<img src="x" onerror="alert(1)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
  });

  it('preserves legitimate content', () => {
    const dirty = '<h1>Report</h1><p>Analysis</p><table><tr><td>Data</td></tr></table>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<h1>Report</h1>');
    expect(clean).toContain('<table>');
  });
});
```

**Integration Tests**:
- Test AI response sanitization end-to-end
- Verify iframe renders sanitized content correctly
- Confirm PDF export includes sanitized HTML

---

## TRACEABILITY

### Related Documentation

- **Product Vision**: `.moai/project/product.md` - Section: "Problem Statement #2: Lack of Proper Access Controls"
- **Architecture**: `.moai/project/structure.md` - Line 105: "Security Considerations: HTML sanitization required (TODO: DOMPurify integration)"
- **Tech Stack**: `.moai/project/tech.md` - Line 278: "🔴 CRITICAL: No HTML sanitization in ReportRenderer"

### Dependencies

**Upstream (Blocks This SPEC)**:
- None (Can be implemented immediately)

**Downstream (Blocked by This SPEC)**:
- SPEC-SECURITY-002: Content Security Policy (CSP) Headers (Planned)
- SPEC-BACKEND-001: Server-side Sanitization (v0.5.0)

### Quality Gates

**TRUST 5 Compliance**:
- **Test-First**: TDD required - Write failing tests before implementation
- **Readable**: Clear sanitization logic with comments explaining security rationale
- **Unified**: Consistent sanitization pattern across all HTML rendering points
- **Secured**: OWASP XSS prevention best practices applied
- **Trackable**: Git commits tagged with SPEC-SECURITY-001

**Acceptance Criteria Summary**:
- ✅ All OWASP XSS cheat sheet payloads blocked
- ✅ Legitimate report HTML passes sanitization
- ✅ Unit test coverage ≥90% for sanitizationService.ts
- ✅ Integration tests confirm end-to-end XSS protection
- ✅ Performance: Sanitization <100ms for 1MB HTML

---

## RISKS & MITIGATION

### Risk 1: DOMPurify Breaks Legitimate Report Content

**Probability**: Medium
**Impact**: High (Users lose valid HTML formatting)

**Mitigation**:
- Test sanitization against existing report samples before deployment
- Provide configuration override for power users (future enhancement)
- Log sanitization changes for forensics and configuration tuning

---

### Risk 2: Performance Degradation for Large Reports

**Probability**: Low
**Impact**: Medium (User experience degradation)

**Mitigation**:
- DOMPurify is highly optimized (1MB HTML sanitizes in ~50ms)
- Implement performance monitoring for sanitization calls
- Consider web worker for sanitization if latency exceeds 100ms

---

### Risk 3: DOMPurify Dependency Vulnerability

**Probability**: Low
**Impact**: Critical (Security library compromised)

**Mitigation**:
- Pin DOMPurify to specific version (not wildcard ^)
- Enable Dependabot for security updates
- Monitor DOMPurify GitHub security advisories

---

## APPROVAL & SIGN-OFF

**Status**: Draft (Pending Review)

**Reviewers**:
- [ ] Security Expert: OWASP compliance verification
- [ ] Backend Expert: Future server-side sanitization architecture
- [ ] Quality Gate: TRUST 5 validation

**Next Steps**:
1. User approval via `/moai:1-plan` review
2. TDD implementation via `/moai:2-run SPEC-SECURITY-001`
3. Quality gate validation via `/moai:3-sync SPEC-SECURITY-001`

---

**End of SPEC-SECURITY-001**
