# Technology Stack & Standards: DFIR Cortex

**Project**: dfir-report
**Owner**: @user
**Last Updated**: 2025-11-21
**Tech Strategy**: Modern React SPA with AI Integration

---

## TECHNOLOGY STACK

### Frontend Technology Stack (Current)

#### Core Framework & Build Tools
| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **React** | 19.2.0 | UI framework | Latest stable release with improved performance, concurrent features |
| **TypeScript** | 5.8.2 | Type safety | Catch errors at compile-time, improved IDE support, better maintainability |
| **Vite** | 6.2.0 | Build tool & dev server | Lightning-fast HMR, optimized production builds, modern ESM support |
| **Node.js** | (Required) | Runtime environment | Package management and build tooling |

#### UI Libraries & Styling
| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **Tailwind CSS** | Latest (CDN) | Utility-first CSS framework | Rapid UI development, consistent design system, minimal CSS bundle |
| **Lucide React** | 0.554.0 | Icon library | Modern, customizable icons for cybersecurity UI |
| **Google Fonts** | N/A (CDN) | Typography | Inter (UI), JetBrains Mono (code/logs) for professional aesthetics |

#### AI & External Services
| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **@google/genai** | 1.30.0 | Gemini AI SDK | Natural language processing for report editing commands |
| **html2pdf.js** | 0.10.1 | PDF export | Client-side PDF generation from HTML reports |

#### Security Libraries (SPEC-SECURITY-001)
| Technology | Version | Purpose | Rationale |
|-----------|---------|---------|-----------|
| **dompurify** | 3.3.0 | HTML sanitization | Removes XSS vulnerabilities from untrusted content (AI responses, user input) |
| **@types/dompurify** | 3.2.0 | TypeScript definitions | Type-safe sanitization service implementation |

**Implementation Status**: ✅ COMPLETED (SPEC-SECURITY-001)
- **Service**: `services/sanitizationService.ts` (custom regex-based implementation)
- **Integration**: ReportRenderer and Dashboard components
- **Test Coverage**: 1,532 test lines (90%+ code coverage)
- **OWASP Compliance**: 100% block rate for XSS cheat sheet payloads

### Development & Build Configuration

#### TypeScript Configuration
**File**: `tsconfig.json`
**Key Settings**:
- **Target**: ES2022 (modern JavaScript features)
- **Module**: ESNext (native ESM support)
- **JSX**: react-jsx (new React 17+ transform)
- **Decorator Support**: Experimental decorators enabled for future use
- **Path Aliases**: `@/*` maps to project root for cleaner imports

**Type Safety Level**: Strict mode disabled (TODO: Enable for production)

#### Vite Configuration
**File**: `vite.config.ts`
**Key Settings**:
- **React Plugin**: `@vitejs/plugin-react` for Fast Refresh and JSX transform
- **Path Resolution**: Alias `@/` to project root
- **Environment Variables**: `.env.local` support for API keys
- **Dev Server**: Hot Module Replacement (HMR) for instant updates

#### Package Management
**Tool**: npm (default with Node.js)
**Lock File**: `package-lock.json` (committed to version control)
**Scripts**:
```json
{
  "dev": "vite",                  // Development server with HMR
  "build": "vite build",          // Production build (dist/)
  "preview": "vite preview"       // Preview production build locally
}
```

### Backend Technology Stack (Planned - v0.5.0+)

#### Server Framework
| Technology | Planned Version | Purpose | Rationale |
|-----------|----------------|---------|-----------|
| **Node.js** | 20 LTS | Server runtime | Same language as frontend, large ecosystem, non-blocking I/O |
| **Express.js** | 4.x | Web framework | Mature, lightweight, extensive middleware ecosystem |
| **TypeScript** | 5.x | Type safety | Shared types between frontend/backend, reduced runtime errors |

#### Database & ORM
| Technology | Planned Version | Purpose | Rationale |
|-----------|----------------|---------|-----------|
| **PostgreSQL** | 15+ | Relational database | ACID compliance, JSON support (JSONB), robust for audit logs |
| **Prisma** | 5.x | ORM & query builder | Type-safe queries, auto-generated types, migration management |
| **Redis** | 7.x | Cache & session store | Fast session management, AI response caching, rate limiting |

#### Authentication & Authorization
| Technology | Planned Version | Purpose | Rationale |
|-----------|----------------|---------|-----------|
| **Passport.js** | 0.7.x | Authentication middleware | Flexible strategy support (Local, OAuth, SAML) |
| **jsonwebtoken** | 9.x | JWT token management | Stateless authentication, role-based claims |
| **bcrypt** | 5.x | Password hashing | Industry-standard password security |

---

## FRAMEWORK & LIBRARY STRATEGY

### React Patterns & Best Practices

#### Component Architecture
**Pattern**: Functional Components + Hooks (React 19)
- **State Management**: React useState, useRef (local state)
- **Side Effects**: useEffect for data fetching, subscriptions
- **Performance**: useImperativeHandle for parent-child imperative APIs (ReportRenderer)
- **Future**: Consider Zustand or Redux Toolkit for global state (when multi-user features added)

#### Component Structure
```
components/
├── Login.tsx              # Authentication form
├── Dashboard.tsx          # Main layout & orchestration
├── ReportRenderer.tsx     # HTML report display (forwardRef pattern)
├── ChatInterface.tsx      # AI chat UI
└── [Future Components]
    ├── ReportList.tsx         # Browse saved reports
    ├── UserManagement.tsx     # Admin panel
    └── VersionHistory.tsx     # Report version timeline
```

**Naming Conventions**:
- **PascalCase** for component files and component names
- **camelCase** for functions, variables, props
- **UPPER_SNAKE_CASE** for constants (MOCK_USERS, INITIAL_REPORT_HTML)

#### TypeScript Integration
**Type Definitions**: `types.ts`
- **Interfaces**: User, ChatMessage, AuthState, McpToolCall
- **Enums**: UserRole (Admin, Lead, Analyst, Viewer)
- **Future**: Separate type files per domain (auth.types.ts, report.types.ts)

**Type Safety Gaps** (TODO):
- `dangerouslySetInnerHTML` bypasses type checking (security risk)
- Gemini API response not strongly typed (runtime validation needed)
- Missing input validation types (Zod schema validation planned)

### AI Integration Strategy

#### Gemini AI Service Design
**File**: `services/geminiService.ts`

**Responsibilities**:
- Initialize GoogleGenAI client with API key
- Construct prompts for report editing tasks
- Parse AI responses and extract HTML modifications
- Handle API errors and rate limiting

**Prompt Engineering Approach**:
```typescript
System Prompt:
"You are an expert DFIR report editor. Generate valid HTML
 modifications based on user commands. Preserve existing
 structure unless explicitly requested to change."

User Context:
- Current report HTML: {reportHtml}
- User command: {userMessage}
- Role: {userRole} (affects permissions)
```

**Security Considerations**:
- 🔴 **Critical Issue**: API key in client code (environment variable exposed)
- 🔄 **Mitigation Plan**: Move to backend proxy (v0.5.0)
- ✅ **Input Sanitization** (SPEC-SECURITY-001): AI-generated HTML sanitized using regex-based pattern detection

#### MCP (Model Context Protocol) Support
**Current**: Type definitions exist (`McpToolCall` interface) but not implemented
**Future**: Enable AI to call external tools:
- SIEM query integration (fetch IOCs from Splunk)
- Threat intelligence lookup (VirusTotal, MISP)
- Template library access (load pre-built report sections)

---

## QUALITY ASSURANCE & TESTING

### Current Testing Status (MVP)
❌ **No test framework implemented** (Critical gap)
❌ **No test coverage** (0%)
❌ **Manual testing only**

### Testing Roadmap (TRUST 5 Compliance)

#### Test Framework Selection (v0.5.0)
**Frontend Testing Stack**:
| Tool | Purpose | Target Coverage |
|------|---------|----------------|
| **Vitest** | Unit & integration testing | 90%+ coverage |
| **React Testing Library** | Component testing | All components |
| **Playwright** | End-to-end testing | Critical user flows |
| **MSW (Mock Service Worker)** | API mocking | AI service, future backend |

**Why Vitest?**
- Native Vite integration (fast, no config overhead)
- Jest-compatible API (easy migration, familiar syntax)
- Built-in TypeScript support
- Superior performance vs. Jest

#### Test Categories & Coverage Targets

**Unit Tests** (Target: 90% coverage)
- `services/geminiService.ts`: Prompt construction, error handling
- `constants.ts`: Mock data validation
- Utility functions (future: HTML sanitization, date formatting)

**Component Tests** (Target: 85% coverage)
```typescript
// Example: ChatInterface.test.tsx
describe('ChatInterface', () => {
  it('renders message history correctly', () => {...});
  it('disables input during AI processing', () => {...});
  it('handles send button click', () => {...});
  it('displays error messages on API failure', () => {...});
});
```

**Integration Tests** (Target: 80% coverage)
- Login flow → Dashboard rendering
- AI command → Report update → Renderer display
- PDF export functionality (mocked html2pdf.js)

**E2E Tests** (Critical Paths Only)
```typescript
// Playwright: report-editing.spec.ts
test('DFIR analyst can edit report via AI', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name=email]', 'analyst@dfir.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  await page.fill('[placeholder="Ask me to modify the report..."]',
                  'Add executive summary section');
  await page.click('button:has-text("Send")');

  await expect(page.locator('.report-renderer'))
    .toContainText('Executive Summary', { timeout: 10000 });
});
```

#### Test-Driven Development (TDD) Process

**TRUST 5 Principle: Test-First Development**
**Enforcement**: `config.json` → `"enforce_tdd": true`

**RED-GREEN-REFACTOR Cycle**:
1. **RED**: Write failing test for new feature
2. **GREEN**: Implement minimal code to pass test
3. **REFACTOR**: Improve code quality while keeping tests green

**MoAI-ADK Integration**:
- `/moai:2-run SPEC-XXX` enforces TDD workflow
- Quality gate blocks merge if coverage < 90%
- Automated test generation from SPEC documents

### Code Quality Tools

#### Linting & Formatting (Planned)
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **ESLint** | JavaScript/TypeScript linting | Airbnb style guide + React hooks rules |
| **Prettier** | Code formatting | 2-space indent, single quotes, trailing commas |
| **Husky** | Git hooks | Pre-commit: lint + format, pre-push: tests |
| **lint-staged** | Run linters on staged files | Faster pre-commit checks |

#### Static Analysis
| Tool | Purpose | Target |
|------|---------|--------|
| **TypeScript Compiler** | Type checking | Zero type errors in production |
| **SonarQube** (Future) | Code quality metrics | Maintainability rating A |
| **Snyk** (Future) | Dependency vulnerability scanning | Zero high/critical vulnerabilities |

---

## SECURITY STANDARDS & PRACTICES

### Current Security Posture (MVP)

#### Identified Vulnerabilities
| Severity | Issue | Mitigation Plan | Status |
|----------|-------|----------------|--------|
| 🔴 **CRITICAL** | Gemini API key exposed in client code | Move to backend proxy (v0.5.0) | ⏳ Planned |
| ✅ **RESOLVED** | No HTML sanitization in ReportRenderer | Regex-based sanitization (SPEC-SECURITY-001) | ✅ Completed |
| 🟡 **HIGH** | No authentication (mock users) | OAuth 2.0 integration (v0.5.0) | ⏳ Planned |
| 🟡 **HIGH** | No HTTPS enforcement | Deploy behind CloudFlare with HSTS | ⏳ Planned |
| 🟠 **MEDIUM** | Missing CSP headers | Add Content-Security-Policy (SPEC-SECURITY-002) | ⏳ Planned |
| 🟠 **MEDIUM** | No rate limiting on AI requests | Backend rate limiting (v0.5.0) | ⏳ Planned |

### OWASP Top 10 Compliance Roadmap

#### A01: Broken Access Control
**Current Risk**: High (no server-side RBAC)
**Mitigation**:
- Backend middleware to enforce role-based permissions
- JWT claims for user role validation
- Database-level row security policies (PostgreSQL RLS)

#### A02: Cryptographic Failures
**Current Risk**: Critical (API keys in client, no encryption)
**Mitigation**:
- Environment variable management (backend only)
- HTTPS/TLS for all communications
- Encrypted database fields for sensitive data (PII, API keys)

#### A03: Injection
**Current Risk**: Medium (XSS mitigated, input validation planned)
**Implemented Mitigations**:
- ✅ **SPEC-SECURITY-001**: Regex-based HTML sanitization for XSS prevention
  - 30+ OWASP pattern detection
  - Removes script tags, event handlers, dangerous URLs
  - 100% block rate for OWASP XSS cheat sheet payloads
  - Test coverage: 1,532 lines (90%+ coverage)
**Planned Mitigations**:
- Parameterized queries (Prisma ORM auto-protection) - v0.5.0 backend
- Input validation schemas (Zod library) - v0.5.0

#### A07: Identification and Authentication Failures
**Current Risk**: Critical (mock authentication)
**Mitigation**:
- OAuth 2.0 with Google/Microsoft providers
- Multi-factor authentication (TOTP via Authenticator app)
- Password policies (bcrypt, min 12 chars, complexity requirements)
- Session management with secure httpOnly cookies

### Secret Management

#### Current Approach (Insecure)
```javascript
// ❌ BAD: API key in .env.local (client-side accessible)
VITE_GEMINI_API_KEY=AIza...
```

#### Future Secure Approach (v0.5.0)
```javascript
// ✅ GOOD: Backend-only secrets
// Server environment variables (not exposed to client)
process.env.GEMINI_API_KEY  // Node.js backend only

// Client calls backend proxy
fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwtToken}` },
  body: JSON.stringify({ message: userCommand })
});
```

**Secret Management Tools**:
- **Development**: `.env` files (git-ignored)
- **Production**: AWS Secrets Manager, HashiCorp Vault, or Vercel Environment Variables
- **Rotation**: Automated secret rotation every 90 days

### Security Headers (Planned)

```javascript
// Express.js middleware (future backend)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## OPERATIONS & DEVOPS

### Build & Deployment Pipeline (Planned)

#### CI/CD Workflow (GitHub Actions)

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          fail_ci_if_error: true
          threshold: 90%  # TRUST 5 quality gate

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel (Preview)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: staging

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Monitoring & Observability (Planned)

#### Application Performance Monitoring (APM)
**Recommended Tool**: Sentry (Frontend) + Datadog (Backend)

**Frontend Error Tracking**:
```typescript
// Initialize Sentry in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,  // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,  // Capture all error sessions
});
```

**Performance Metrics**:
- Page Load Time (Web Vitals: LCP, FID, CLS)
- AI Response Latency (P50, P95, P99)
- API Error Rate
- User Session Duration

#### Logging Strategy

**Frontend Logging** (Production):
```typescript
// Structured logging with context
logger.info('User action', {
  action: 'ai_command',
  command: userMessage,
  userId: currentUser.id,
  timestamp: Date.now(),
});
```

**Backend Logging** (Future):
- **Tool**: Winston or Pino (structured JSON logging)
- **Aggregation**: Datadog, ELK Stack, or Google Cloud Logging
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Retention**: 90 days operational, 7 years audit logs

#### Alerting & Incident Response

**Critical Alerts** (PagerDuty/Opsgenie):
- API Error Rate > 5% (5-minute window)
- Gemini API Failure Rate > 10%
- Database Connection Pool Exhaustion
- SSL Certificate Expiration (30 days warning)

**Incident Response Runbooks**:
1. Gemini API Outage: Fallback to cached suggestions, display user guidance
2. Database Failure: Switch to read replica, disable write operations
3. Security Incident: Revoke sessions, enable audit mode, notify security team

---

## DEPENDENCY MANAGEMENT

### Current Dependencies (package.json)

#### Production Dependencies
```json
{
  "dependencies": {
    "@google/genai": "^1.30.0",       // AI service SDK
    "lucide-react": "^0.554.0",       // Icon library
    "react": "^19.2.0",               // UI framework
    "react-dom": "^19.2.0"            // React DOM renderer
  }
}
```

#### Development Dependencies
```json
{
  "devDependencies": {
    "@types/node": "^22.14.0",        // Node.js type definitions
    "@vitejs/plugin-react": "^5.0.0", // Vite React plugin
    "typescript": "~5.8.2",           // TypeScript compiler
    "vite": "^6.2.0"                  // Build tool
  }
}
```

### Dependency Update Strategy

**Versioning Policy**:
- **^** (Caret): Allow minor and patch updates (e.g., ^1.30.0 → 1.31.0 OK, 2.0.0 blocked)
- **~** (Tilde): Allow patch updates only (e.g., ~5.8.2 → 5.8.3 OK, 5.9.0 blocked)
- **Exact**: Critical dependencies (future: authentication libraries)

**Update Cadence**:
- **Security Patches**: Immediate (within 24 hours)
- **Minor Updates**: Monthly review and testing
- **Major Updates**: Quarterly evaluation with migration plan

**Tools**:
- **Dependabot** (GitHub): Automated PR for security updates
- **npm audit**: Weekly vulnerability scans
- **Snyk** (Future): Continuous dependency monitoring

### Known Dependency Risks

| Dependency | Risk | Mitigation |
|-----------|------|------------|
| **@google/genai** | API breaking changes, quota limits | Version pinning, backend proxy fallback |
| **Tailwind CSS CDN** | CDN outage, version drift | Self-host in production (npm install) |
| **html2pdf.js CDN** | Unmaintained (last update 2021) | Evaluate alternatives (Puppeteer, jsPDF) |

---

## TRUST 5 PRINCIPLES IMPLEMENTATION

### Test-First Development (T)
**Status**: ❌ Not Implemented (Critical Gap)
**Roadmap**:
- v0.5.0: Vitest + React Testing Library setup
- v0.5.0: Enforce 90% coverage via GitHub Actions
- v1.0.0: TDD workflow for all new features

### Readable Code (R)
**Current Practices**:
- ✅ TypeScript for type clarity
- ✅ Descriptive component and function names
- ⚠️ Missing JSDoc comments for complex logic
- ⚠️ No code review process (solo developer)

**Improvements Needed**:
- Add ESLint rules for code complexity limits
- Implement JSDoc for all public functions
- Peer code review for production releases

### Unified Patterns (U)
**Current Consistency**:
- ✅ Consistent React Hooks usage
- ✅ Centralized type definitions (types.ts)
- ✅ Shared constants (constants.ts)
- ⚠️ No design system documentation
- ⚠️ Inconsistent error handling patterns

**Standardization Plan**:
- Document component patterns in Storybook (v1.0.0)
- Create error handling utilities (v0.5.0)
- Establish API response schemas (Zod validation)

### Secured by Default (S)
**Current Score**: 🟡 4/10 (Security Improvements Underway)

**Completed Actions**:
- ✅ **SPEC-SECURITY-001**: HTML sanitization with regex-based pattern detection
  - Removes XSS attack vectors from AI responses and user input
  - 1,532 test lines with 90%+ coverage
  - OWASP A7:2017 and A03:2021 compliance achieved

**Immediate Actions (v0.5.0)**:
- 🔧 Move Gemini API to backend (hide API key)
- 🔧 Implement real authentication (OAuth 2.0)
- 🔧 Add HTTPS enforcement and CSP headers
- 🔧 Server-side input validation and sanitization

**Target Score (v1.0.0)**: 🟢 9/10 (Production-Ready)

### Trackable Changes (T)
**Current Tracking**:
- ✅ Git version control (main branch)
- ❌ No commit message standards
- ❌ No SPEC-to-code traceability
- ❌ No automated changelog generation

**MoAI-ADK Integration**:
- SPEC documents in `.moai/specs/`
- Commit messages linked to SPEC IDs: `[SPEC-001] Implement AI chat interface`
- Automated changelog from conventional commits
- Test traceability to requirements

---

## INCIDENT RESPONSE & MAINTENANCE

### Bug Triage Process (Planned)

**Severity Levels**:
- **P0 (Critical)**: System down, data loss, security breach → Fix within 4 hours
- **P1 (High)**: Major feature broken, degraded performance → Fix within 1 day
- **P2 (Medium)**: Minor feature issue, workaround available → Fix within 1 week
- **P3 (Low)**: Cosmetic issue, documentation error → Fix within 1 month

### Technical Debt Management

**Current Debt Items**:
1. **High Priority**:
   - 🔴 No test coverage for UI components (blocks production release)
   - 🔴 Client-side API key exposure (security risk)
   - ✅ **PAID**: HTML sanitization (XSS vulnerability resolved - SPEC-SECURITY-001)

2. **Medium Priority**:
   - 🟡 No backend (limits scalability and features)
   - 🟡 Mock authentication (blocks real user onboarding)
   - 🟡 In-memory storage (data loss on refresh)

3. **Low Priority**:
   - 🟢 No linting/formatting automation
   - 🟢 No component documentation
   - 🟢 Limited AI command capabilities

**Debt Payoff Strategy**:
- Allocate 20% of sprint capacity to technical debt
- No new features until P0/P1 debt resolved
- Track debt in GitHub Issues with "tech-debt" label

---

## TECHNOLOGY DECISION LOG

### Key Technology Choices & Rationale

#### React 19 vs. Vue/Svelte
**Decision**: React 19
**Rationale**:
- Largest ecosystem and community support
- Mature enterprise adoption for DFIR tools
- Excellent TypeScript integration
- Developer familiarity (owner experience)

#### Vite vs. Create React App (CRA)
**Decision**: Vite
**Rationale**:
- 10-100x faster HMR (instant feedback loop)
- Modern ESM-based architecture
- Better production build optimization
- CRA is deprecated/unmaintained

#### Tailwind CSS vs. Styled Components
**Decision**: Tailwind CSS
**Rationale**:
- Faster development (utility-first approach)
- Smaller bundle size (PurgeCSS eliminates unused styles)
- Consistent design system (spacing, colors)
- No runtime overhead (static CSS)

#### Google Gemini vs. OpenAI GPT
**Decision**: Google Gemini
**Rationale**:
- Better JSON response formatting (structured outputs)
- Multimodal capabilities (future: image analysis of screenshots)
- Competitive pricing vs. GPT-4
- Native Google Cloud integration (future hosting synergy)

#### PostgreSQL vs. MongoDB
**Decision**: PostgreSQL (for v0.5.0 backend)
**Rationale**:
- ACID compliance critical for audit logs
- Strong JSONB support (flexibility + relational integrity)
- Mature ecosystem for compliance (SOC 2, GDPR)
- Better TypeScript ORM support (Prisma)

---

## HISTORY

**2025-11-21**: Initial tech stack documentation created during project initialization
**2025-11-21**: Identified critical security and testing gaps in MVP
**2025-11-21**: Defined TRUST 5 compliance roadmap and quality gates

---

## USER NOTES

No additional user notes at this time.
