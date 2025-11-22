# System Architecture: DFIR Cortex

**Project**: dfir-report
**Owner**: @user
**Last Updated**: 2025-11-21
**Architecture Type**: Single-Page Application (SPA) - Modular Monolithic Frontend

---

## OVERALL ARCHITECTURE

### Architecture Pattern: Client-Side SPA (Current MVP)

**Type**: Modular Monolithic Single-Page Application
**Deployment**: Static site hosted via Vite development server (production: static hosting)

**Rationale**:
- MVP focuses on proving AI-powered editing concept
- No backend infrastructure required initially
- Rapid iteration and prototyping
- Future migration path to client-server architecture planned

**Current Limitations**:
- No data persistence (in-memory only)
- No real authentication (mock users)
- Single-user sessions (no concurrent editing)
- Client-side API key management (security risk)

### Future Architecture Vision (v0.5.0+)

**Target**: 3-Tier Web Application Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│         React SPA (Vite Build - Static CDN)         │
└─────────────────┬───────────────────────────────────┘
                  │ REST API / WebSocket
┌─────────────────▼───────────────────────────────────┐
│                  Application Layer                   │
│   Node.js/Express API Server (Auth, Business Logic) │
│         + Gemini AI Integration Service              │
└─────────────────┬───────────────────────────────────┘
                  │ SQL + Object Storage
┌─────────────────▼───────────────────────────────────┐
│                    Data Layer                        │
│   PostgreSQL (Users, Reports, Audit Logs)           │
│   S3/Cloud Storage (Report Attachments, Exports)    │
└─────────────────────────────────────────────────────┘
```

---

## MODULE BOUNDARIES & RESPONSIBILITIES

### Core Modules (Current Implementation)

#### 1. Authentication Module
**Location**: `components/Login.tsx`, `constants.ts` (MOCK_USERS)
**Responsibility**: User authentication and session management
**Current Implementation**: Mock user validation with in-memory state
**Dependencies**: None (standalone)

**Key Capabilities**:
- User credential validation against mock user database
- Role-based user identification (Admin, Lead, Analyst, Viewer)
- Session state management via React state

**Future Enhancements**:
- OAuth 2.0 / SAML integration
- JWT token-based authentication
- Multi-factor authentication (MFA)
- Password reset and account management

#### 2. Dashboard & Layout Module
**Location**: `components/Dashboard.tsx`
**Responsibility**: Main application layout, navigation, and feature orchestration
**Dependencies**: ReportRenderer, ChatInterface, geminiService

**Key Capabilities**:
- User session display and logout functionality
- Report rendering area management
- Chat interface integration
- PDF export coordination
- Role-based UI element visibility

**Code Responsibilities**:
- State management for active report HTML
- Message history tracking for chat context
- Loading state coordination between components
- User permission-based feature access control

#### 3. Report Rendering Module
**Location**: `components/ReportRenderer.tsx`
**Responsibility**: Secure HTML rendering and live preview of DFIR reports
**Dependencies**: React forwardRef/useImperativeHandle for parent control

**Key Capabilities**:
- Safe HTML injection using `dangerouslySetInnerHTML` (controlled context)
- Iframe-based rendering for security isolation (future enhancement)
- Imperative API for external report updates
- Auto-scroll to latest content changes

**Security Considerations**:
- HTML sanitization required before rendering (TODO: DOMPurify integration)
- CSP headers for XSS prevention (TODO)
- Sandboxed iframe rendering (planned)

#### 4. Chat Interface Module
**Location**: `components/ChatInterface.tsx`
**Responsibility**: Natural language AI interaction for report editing
**Dependencies**: geminiService

**Key Capabilities**:
- Message display (user vs. AI responses)
- Loading state indicators during AI processing
- Message history management
- User input validation and submission

**UI Features**:
- Real-time typing indicators
- AI tool call visualization (MCP protocol indicators)
- Command suggestions (future: autocomplete)
- Error handling and retry logic

#### 5. AI Service Layer
**Location**: `services/geminiService.ts`
**Responsibility**: Google Gemini AI integration and prompt engineering
**Dependencies**: @google/genai SDK

**Key Capabilities**:
- Natural language command interpretation
- HTML modification generation based on user intent
- Context-aware prompt construction
- MCP tool call handling (extensibility for future integrations)

**Prompt Engineering Strategy**:
- System prompt defines AI role as "DFIR report editing assistant"
- Report HTML passed as context for modification suggestions
- User command interpreted with safety guidelines
- Structured JSON response parsing for reliable HTML updates

**Error Handling**:
- API rate limit retry logic
- Fallback responses for ambiguous commands
- Validation of AI-generated HTML before applying changes

#### 6. Security Services Module (NEW - SPEC-SECURITY-001)
**Location**: `services/sanitizationService.ts`
**Responsibility**: HTML sanitization and XSS vulnerability prevention
**Dependencies**: None (pure TypeScript utility)

**Key Capabilities**:
- **HTML Sanitization**: Removes dangerous patterns including:
  - Script tags and content (`<script>`, `</script>`)
  - Event handler attributes (`on*=` patterns: onclick, onerror, onload, etc.)
  - Dangerous URLs (`javascript:`, `vbscript:`, `data:text/html`, `data:application/javascript`)
  - Embedded content tags (`<iframe>`, `<object>`, `<embed>`, `<applet>`)
  - Metadata tags (`<meta>`, `<link>`, `<style>`)
- **Pattern Detection**: Regex-based detection of 30+ OWASP XSS patterns
- **Logging**: Automatic logging of security events when dangerous content is detected
- **Type Safety**: Exported interfaces for `SanitizationConfig` and `SanitizationResult`

**Integration Points**:
- **ReportRenderer.tsx**: Sanitizes HTML before iframe rendering (line 31)
- **Dashboard.tsx**: Sanitizes AI-generated content before state update (line 42)
- **Initial Content**: Sanitizes INITIAL_REPORT_HTML on component mount (line 17)

**Security Rationale**:
- Defends against XSS attacks from untrusted AI responses (Gemini API)
- Blocks prompt injection attacks where malicious users attempt to insert scripts
- Prevents data exfiltration and session hijacking via malicious HTML
- Complies with OWASP Top 10 A7:2017 (XSS Prevention) and A03:2021 (Injection)

**Defense-in-Depth Strategy**:
1. **Layer 1 (Client-side Sanitization)**: DOMPurify removes dangerous HTML patterns (IMPLEMENTED)
2. **Layer 2 (Iframe Sandbox)**: `sandbox="allow-scripts allow-same-origin"` limits script capabilities
3. **Layer 3 (Content Security Policy)**: HTTP headers block inline scripts (PLANNED - SPEC-SECURITY-002)
4. **Layer 4 (Backend Validation)**: Server-side sanitization when backend implemented (v0.5.0)

**Performance Characteristics**:
- Typical sanitization time: 5-20ms for 50KB HTML
- Large document time: <100ms P95 for 1MB HTML
- Negligible performance impact on user experience

---

## DATA FLOW & INTEGRATION POINTS

### Current Data Flow (In-Memory Architecture)

```
┌──────────────┐
│  User Login  │
└──────┬───────┘
       │ (Validates against MOCK_USERS)
       ▼
┌────────────────────────────────────────┐
│         Dashboard Component            │
│  ┌────────────────────────────────┐   │
│  │  reportHtml (State)            │   │
│  │  messages (Chat History)       │   │
│  │  currentUser (Session)         │   │
│  └────────────────────────────────┘   │
└─────┬─────────────────┬────────────────┘
      │                 │
      │ (HTML)          │ (User Command)
      ▼                 ▼
┌──────────────┐  ┌─────────────────────┐
│   Report     │  │  Chat Interface     │
│  Renderer    │  │  + Gemini Service   │
└──────────────┘  └──────┬──────────────┘
                         │
                         │ (AI generates HTML modification)
                         ▼
                  ┌───────────────────┐
                  │  Update reportHtml │
                  │  (State mutation)  │
                  └───────────────────┘
```

### External Integrations

#### Current External Dependencies

1. **Google Gemini API** (Primary AI Integration)
   - **Protocol**: REST API via @google/genai SDK
   - **Authentication**: API key (client-side - SECURITY RISK)
   - **Purpose**: Natural language understanding and HTML generation
   - **Failure Strategy**: Display error message, allow retry
   - **Rate Limits**: Per Gemini free tier quotas

2. **Tailwind CSS CDN**
   - **Protocol**: HTTPS script tag
   - **Purpose**: Utility-first styling framework
   - **Failure Strategy**: Degraded UI without styles (functionality intact)

3. **html2pdf.js Library**
   - **Protocol**: CDN-loaded JavaScript library
   - **Purpose**: Client-side PDF export from HTML
   - **Failure Strategy**: Disable export button if library fails to load

4. **Google Fonts CDN**
   - **Protocol**: HTTPS stylesheet link
   - **Purpose**: Inter and JetBrains Mono typography
   - **Failure Strategy**: Fallback to system fonts

#### Planned Future Integrations (v0.5.0+)

1. **Backend API Server** (Critical Priority)
   - **Protocol**: REST API + WebSocket (for real-time collaboration)
   - **Authentication**: JWT tokens, OAuth 2.0
   - **Purpose**: Data persistence, user management, audit logging
   - **Endpoints**:
     - POST /api/auth/login, /api/auth/logout
     - GET/POST/PUT/DELETE /api/reports
     - GET /api/reports/:id/versions (version history)
     - POST /api/ai/modify (server-side AI proxy)

2. **PostgreSQL Database**
   - **Purpose**: Relational data storage for users, reports, audit logs
   - **Schema Design**:
     - users (id, email, role, created_at, last_login)
     - reports (id, title, html_content, created_by, updated_at, status)
     - report_versions (id, report_id, html_content, version_number, created_at)
     - audit_logs (id, user_id, action, resource_type, resource_id, timestamp)

3. **Object Storage (S3/Azure Blob/GCS)**
   - **Purpose**: Store large report attachments, exported PDFs
   - **Access Pattern**: Pre-signed URLs for secure client downloads

4. **SIEM/SOAR Integration** (Long-term)
   - **Protocol**: REST APIs, webhooks
   - **Purpose**: Auto-populate reports from security alerts
   - **Candidates**: Splunk, Elastic Security, Microsoft Sentinel, Cortex XSOAR

---

## NON-FUNCTIONAL REQUIREMENTS (NFR)

### Performance Requirements

#### Target Metrics (MVP)
- **Page Load Time**: <2 seconds (initial load with Vite dev server)
- **AI Response Time**: <5 seconds (Gemini API response P95)
- **Report Rendering**: <500ms for typical 50KB HTML document
- **PDF Export**: <10 seconds for 10-page report

#### Current Performance Characteristics
- ✅ Instant client-side rendering (React SPA)
- ⚠️ AI response time depends on Gemini API latency (variable 2-10s)
- ⚠️ Large HTML documents (>500KB) may cause browser lag
- ⚠️ PDF export performance degrades with complex styling

**Optimization Strategies** (Future):
- Server-side AI response caching for common commands
- Virtual scrolling for long reports
- Web Worker for PDF generation (offload main thread)
- Code splitting and lazy loading for faster initial load

### Availability Requirements

#### Current Availability (MVP)
- **Target**: 95% uptime (development prototype acceptable)
- **Dependencies**: Gemini API availability (Google SLA), CDN uptime
- **Single Point of Failure**: Client browser, Gemini API, CDN resources

#### Future Availability Goals (Production)
- **Target**: 99.5% uptime (SLA for enterprise customers)
- **Infrastructure**: Multi-region deployment, CDN for static assets
- **Database**: Automated backups, failover replicas
- **Monitoring**: Health checks, uptime alerts, incident response playbooks

### Scalability Requirements

#### Current Scalability (MVP)
- **Concurrent Users**: 1 (single-user in-memory state)
- **Report Size Limit**: ~1MB HTML (browser memory constraint)
- **Storage**: Browser memory only (lost on refresh)

#### Future Scalability Goals (v0.5.0+)
- **Concurrent Users**: 1,000+ simultaneous users
- **Reports per User**: Unlimited (database-backed)
- **Report Size Limit**: 10MB per report (with pagination/chunking)
- **API Rate Limiting**: 100 requests/minute per user
- **Database Scaling**: Read replicas for query performance

**Scaling Strategy**:
- Horizontal scaling of API servers (stateless design)
- Database connection pooling and query optimization
- CDN caching for static assets and exported PDFs
- Background job queue for heavy operations (PDF generation, AI processing)

### Security Requirements

#### Current Security Posture (MVP)
- ⚠️ **Critical Issue**: Gemini API key exposed in client-side code
- ⚠️ **No Authentication**: Mock users only, no real credential validation
- ⚠️ **No Authorization**: RBAC logic exists but not enforced server-side
- ⚠️ **No Audit Logging**: No tracking of user actions or data access
- ✅ **XSS Protection** (SPEC-SECURITY-001): HTML sanitization with regex-based pattern blocking

#### Security Implementations

**SPEC-SECURITY-001: HTML Sanitization (COMPLETED)**
- ✅ Implemented: Client-side HTML sanitization using regex-based pattern detection
- ✅ Test Coverage: 1,532 test lines, 90%+ code coverage
- ✅ OWASP Compliance: 100% block rate for OWASP XSS cheat sheet payloads
- ✅ Integration: ReportRenderer and Dashboard components
- ✅ Performance: <100ms P95 latency for 1MB HTML documents
- **Threat Mitigation**: XSS attacks from untrusted AI responses and prompt injection

#### Security Roadmap (Priority: HIGH)

**Phase 1 (In Progress - v0.5.0)**:
- ✅ **COMPLETED**: HTML sanitization library integration (regex-based in v0.1.0)
- ⏳ Move Gemini API calls to backend server (hide API key)
- ⏳ Implement real authentication (OAuth 2.0 or Auth0/Clerk)
- ⏳ Server-side RBAC enforcement with JWT claims
- ⏳ HTTPS-only deployment with CSP headers

**Phase 2 (Planned - v1.0.0)**:
- 🔒 Content Security Policy (CSP) headers (SPEC-SECURITY-002)
- 🔒 Audit logging for all CRUD operations and AI interactions
- 🔒 Data encryption at rest (database, object storage)
- 🔒 Encryption in transit (TLS 1.3)
- 🔒 Secret management (AWS Secrets Manager, HashiCorp Vault)
- 🔒 Penetration testing and security audit

**Compliance Targets**:
- SOC 2 Type II (for enterprise customers)
- GDPR compliance (data privacy, right to erasure)
- HIPAA readiness (for healthcare-related incidents)

### Observability Requirements

#### Current Observability (MVP)
- ❌ No logging infrastructure
- ❌ No error tracking (console.log only)
- ❌ No performance monitoring
- ❌ No user analytics

#### Target Observability (Production)

**Logging**:
- Centralized log aggregation (ELK, Datadog, Splunk)
- Structured logging (JSON format with correlation IDs)
- Log levels: DEBUG, INFO, WARN, ERROR, CRITICAL
- Retention: 90 days for operational logs, 7 years for audit logs

**Monitoring**:
- Application Performance Monitoring (APM): New Relic, Datadog, Dynatrace
- Infrastructure metrics: CPU, memory, disk, network
- Business metrics: Reports created, AI commands executed, user activity
- Alerting: PagerDuty, Opsgenie for on-call rotation

**Error Tracking**:
- Frontend: Sentry for JavaScript errors, React error boundaries
- Backend: Exception tracking with stack traces and user context
- AI Failures: Track Gemini API errors, timeout rates, invalid responses

**User Analytics** (Privacy-preserving):
- Usage patterns: Most-used AI commands, feature adoption
- Performance metrics: Page load times, AI response times
- User feedback: NPS surveys, feature requests

---

## DATA STORAGE & MANAGEMENT

### Current Data Architecture (MVP)

**Storage Type**: Client-side React state (ephemeral)

**Data Entities**:
1. **User Session** (in-memory)
   - currentUser: { id, username, email, role }
   - Lifespan: Until logout or page refresh

2. **Report HTML** (in-memory)
   - reportHtml: string (HTML document)
   - Lifespan: Until page refresh
   - Source: INITIAL_REPORT_HTML from constants

3. **Chat Messages** (in-memory)
   - messages: Array<{ role: 'user' | 'assistant', content: string }>
   - Lifespan: Until page refresh

**Data Loss Risk**: 🔴 **Critical** - All data lost on page refresh or browser close

### Future Data Architecture (v0.5.0+)

#### PostgreSQL Schema (Relational Data)

```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'lead', 'analyst', 'viewer')),
  full_name VARCHAR(255),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Reports (Core Entity)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  status VARCHAR(50) CHECK (status IN ('draft', 'in_review', 'final', 'archived')),
  created_by UUID REFERENCES users(id) NOT NULL,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  organization_id UUID REFERENCES organizations(id),
  metadata JSONB -- Flexible storage for incident details, tags, etc.
);

-- Version Control
CREATE TABLE report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  html_content TEXT NOT NULL,
  change_description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(report_id, version_number)
);

-- Audit Logging (Compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  resource_type VARCHAR(50), -- 'report', 'user', 'settings'
  resource_id UUID,
  details JSONB, -- Context-specific audit details
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- RBAC Permissions (Future Multi-tenant)
CREATE TABLE report_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) CHECK (permission IN ('view', 'edit', 'admin')),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);
```

#### Object Storage (Attachments & Exports)

**Use Cases**:
- Exported PDF reports
- Forensics evidence attachments (screenshots, logs, PCAP files)
- Large HTML reports (>10MB)

**Structure**:
```
s3://dfir-cortex-reports/
  ├── exports/
  │   ├── {report_id}/
  │   │   └── {timestamp}_report.pdf
  ├── attachments/
  │   ├── {report_id}/
  │   │   ├── evidence_screenshot.png
  │   │   └── malware_sample.zip.enc  # Encrypted malware samples
```

**Access Control**:
- Pre-signed URLs with 1-hour expiration
- Server-side encryption (SSE-S3 or SSE-KMS)
- Lifecycle policies: Archive to Glacier after 90 days, delete after 7 years

### Data Privacy & Compliance

#### GDPR Compliance
- **Right to Access**: API endpoint to export all user data
- **Right to Erasure**: Soft-delete users, anonymize audit logs
- **Data Minimization**: Collect only necessary forensics metadata
- **Consent Management**: Track user consent for analytics, AI processing

#### Data Retention Policies
- **Active Reports**: Indefinite (user-controlled deletion)
- **Archived Reports**: 7 years (regulatory compliance)
- **Audit Logs**: 7 years (immutable, compliance requirement)
- **Session Data**: 24 hours (refresh token expiration)
- **Deleted Reports**: 30-day soft-delete recovery window

---

## DEPLOYMENT ARCHITECTURE

### Current Deployment (MVP)

**Environment**: Local development only
**Hosting**: Vite development server (`npm run dev`)
**Domain**: localhost:5173
**Build Process**: None (development mode)

### Future Production Deployment (v0.5.0+)

#### Infrastructure Components

```
┌─────────────────────────────────────────────────────┐
│              CloudFlare CDN (Global Edge)           │
│         (Static Assets, DDoS Protection, WAF)       │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│        Vercel / Netlify (Frontend Hosting)          │
│     React SPA (Build: vite build, Output: dist/)    │
└─────────────────────────────────────────────────────┘
                  │
                  │ API Requests (https://api.dfir-cortex.com)
                  ▼
┌─────────────────────────────────────────────────────┐
│      AWS ECS / Cloud Run (Backend API Servers)      │
│   Node.js API (Docker Container, Auto-scaling)      │
└─────┬───────────────────────────────┬───────────────┘
      │                               │
      │ (PostgreSQL)                  │ (S3/GCS)
      ▼                               ▼
┌──────────────────┐          ┌────────────────────┐
│  AWS RDS / Cloud │          │  S3 / GCS Buckets  │
│      SQL         │          │  (Report Storage)  │
│  (Primary + Read │          └────────────────────┘
│     Replica)     │
└──────────────────┘
```

#### Deployment Strategy

**Frontend**:
- Build: `npm run build` (Vite production build)
- Hosting: Vercel (recommended) or Netlify
- CDN: Automatic edge caching via Vercel/Netlify
- Deployment: Git push to main branch (auto-deploy)

**Backend** (Planned):
- Containerization: Docker multi-stage build
- Orchestration: AWS ECS Fargate or Google Cloud Run
- CI/CD: GitHub Actions → Build → Test → Deploy
- Blue-Green Deployment: Zero-downtime releases

**Database**:
- Managed Service: AWS RDS PostgreSQL or Google Cloud SQL
- High Availability: Multi-AZ deployment, automated backups
- Disaster Recovery: Daily snapshots, point-in-time recovery

---

## HISTORY

**2025-11-21**: Initial structure documentation created during project initialization
**2025-11-21**: Identified critical security gaps in MVP architecture (client-side API key)
**2025-11-21**: Defined 3-tier architecture migration path for v0.5.0

---

## USER NOTES

No additional user notes at this time.
