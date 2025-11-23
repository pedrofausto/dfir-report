# Implementation Plan: SPEC-BACKEND-001

**TAG**: `SPEC-BACKEND-001`
**Project**: dfir-report
**Owner**: @user
**Created**: 2025-11-23

---

## IMPLEMENTATION STRATEGY

### Overview

This implementation plan outlines the systematic approach to building a production-ready backend API with PostgreSQL persistence, OAuth 2.0 authentication, and multi-user collaboration support. The plan follows TDD principles (RED-GREEN-REFACTOR) and prioritizes features by dependency and business value.

**Total Estimated Complexity**: HIGH (Major architectural addition)
**Development Approach**: Incremental delivery with vertical slices
**Testing Strategy**: Test-first for all components (90% coverage minimum)

---

## MILESTONES

### Milestone 1: Backend Foundation and Database Setup

**Goal**: Establish backend project structure, database schema, and development environment

**Priority**: PRIMARY (Foundational)
**Dependencies**: None (can start immediately)

**Deliverables**:
1. **Backend Project Initialization**
   - Initialize Node.js project with TypeScript configuration
   - Set up Fastify/Express application skeleton
   - Configure environment variable management (Zod validation)
   - Create Docker Compose for local development (PostgreSQL, Redis)

2. **Database Schema Implementation**
   - Create Prisma schema.prisma with all models (User, Report, ReportVersion, AuditLog, Session, Organization)
   - Generate initial Prisma migration
   - Test migration on local PostgreSQL (Docker)
   - Create database seed script for development data

3. **Project Structure Setup**
   - Create directory structure (routes, services, middleware, schemas, utils)
   - Configure TypeScript path aliases (@/ imports)
   - Set up Winston logging with JSON structured output
   - Configure Vitest for backend testing

4. **Development Environment**
   - Docker Compose configuration (postgres:18.1, redis:7, backend dev server)
   - Environment variable template (.env.example)
   - Local development documentation (README.md)
   - Database connection pooling configuration

**Acceptance Criteria**:
- `npm run dev` starts backend server successfully
- `prisma migrate dev` creates database schema without errors
- Docker Compose brings up PostgreSQL and Redis
- TypeScript compilation succeeds with zero errors
- Basic health check endpoint responds: GET /api/v1/health → 200 OK

**Testing Requirements**:
- Database connection test (connect, query, disconnect)
- Environment variable validation test (Zod schema)
- Docker Compose smoke test (containers start and accept connections)

---

### Milestone 2: OAuth 2.0 Authentication Flow

**Goal**: Implement Google OAuth authentication with JWT session management

**Priority**: PRIMARY (Critical security foundation)
**Dependencies**: Milestone 1 (database and backend foundation)

**Deliverables**:
1. **OAuth Configuration**
   - Register Google OAuth app (Cloud Console: client ID, client secret)
   - Configure Passport.js Google Strategy
   - Set up OAuth callback route
   - Implement JWT token generation (RS256 signing)

2. **Authentication Endpoints**
   - `POST /api/v1/auth/oauth/google` - Initiate OAuth flow
   - `GET /api/v1/auth/callback` - Handle OAuth callback
   - `POST /api/v1/auth/logout` - Invalidate session
   - `GET /api/v1/auth/me` - Get current user info

3. **User Management Service**
   - `authService.findOrCreateUser()` - OAuth user upsert logic
   - `authService.generateJWT()` - JWT token creation
   - `authService.verifyJWT()` - Token validation
   - User session tracking (last login timestamp)

4. **Authentication Middleware**
   - `authenticate()` middleware - JWT verification, user attachment
   - `authorize()` middleware - RBAC role-based permission checks
   - Error handling for expired/invalid tokens

**Acceptance Criteria**:
- User can authenticate with Google OAuth successfully
- JWT token stored in httpOnly cookie (secure, SameSite=Strict)
- User profile data (email, name, avatar) persisted in database
- `GET /api/v1/auth/me` returns authenticated user details
- Logout clears session cookie
- Unauthenticated requests to protected endpoints return 401

**Testing Requirements**:
- Unit tests: authService functions (JWT generation, verification)
- Integration tests: OAuth callback flow (mock Google API responses)
- E2E tests: Full authentication flow (Playwright or Supertest)
- Security tests: Invalid token rejection, expired token handling

---

### Milestone 3: Report CRUD API

**Goal**: Implement RESTful endpoints for report management with server-side sanitization

**Priority**: PRIMARY (Core functionality)
**Dependencies**: Milestone 2 (authentication required for authorization)

**Deliverables**:
1. **Report Service Layer**
   - `reportService.createReport()` - Create report with initial version
   - `reportService.getReports()` - List reports with pagination, filtering
   - `reportService.getReportById()` - Fetch single report
   - `reportService.updateReport()` - Update report content/metadata
   - `reportService.deleteReport()` - Soft delete implementation

2. **Report API Endpoints**
   - `GET /api/v1/reports` - List reports (pagination, search, status filter)
   - `POST /api/v1/reports` - Create new report
   - `GET /api/v1/reports/:id` - Get report by ID
   - `PUT /api/v1/reports/:id` - Update report
   - `DELETE /api/v1/reports/:id` - Soft delete report

3. **Validation Schemas**
   - Zod schemas for request validation (createReportSchema, updateReportSchema)
   - Input validation middleware integration
   - Error response formatting (consistent JSON structure)

4. **Server-Side Sanitization**
   - Port sanitizationService.ts from frontend (SPEC-SECURITY-001)
   - Integrate DOMPurify server-side (jsdom environment)
   - Apply sanitization on report create/update
   - Sanitization logging for security events

**Acceptance Criteria**:
- All CRUD endpoints functional and authenticated
- Reports scoped to authenticated user (users see only their reports)
- HTML content sanitized before database storage
- Pagination works correctly (page, limit, total count)
- Search filters by report title (case-insensitive)
- Soft delete preserves data (deletedAt timestamp)

**Testing Requirements**:
- Unit tests: reportService business logic (90% coverage)
- Integration tests: All CRUD endpoints (request/response validation)
- Security tests: Unauthorized access blocked, ownership enforced
- Sanitization tests: Malicious HTML rejected, legitimate HTML preserved

---

### Milestone 4: Version History API and Migration

**Goal**: Implement version history endpoints and localStorage migration utility

**Priority**: SECONDARY (Enables existing feature parity)
**Dependencies**: Milestone 3 (reports must exist before versions)

**Deliverables**:
1. **Version Service Layer**
   - `versionService.saveVersion()` - Create version with diff calculation
   - `versionService.getVersions()` - List versions for report
   - `versionService.getVersionById()` - Fetch specific version
   - `versionService.deleteVersion()` - Delete version (hard delete)
   - `versionService.calculateDiffStats()` - Diff algorithm (diff library)

2. **Version API Endpoints**
   - `GET /api/v1/reports/:id/versions` - List versions (paginated)
   - `POST /api/v1/reports/:id/versions` - Save new version
   - `GET /api/v1/versions/:versionId` - Get specific version
   - `DELETE /api/v1/versions/:versionId` - Delete version

3. **Migration Service**
   - `POST /api/v1/migration/import-versions` - Import localStorage JSON
   - `migrationService.validateImportData()` - Validate JSON structure
   - `migrationService.importVersions()` - Transactional import
   - Error handling and rollback on import failure

4. **Frontend Migration Assistant**
   - Detect localStorage data on first backend login
   - Modal prompt: "Migrate 23 versions to cloud?"
   - Export localStorage to JSON (SPEC-VERSION-001 utility)
   - POST import data to backend
   - Clear localStorage on successful import (with confirmation)

**Acceptance Criteria**:
- Version auto-increment works correctly (sequential version numbers)
- Diff stats calculated and stored with each version
- Auto-save versions flagged appropriately (isAutoSave field)
- Migration preserves all localStorage data (timestamps, metadata, diffStats)
- Migration is transactional (all-or-nothing, rollback on error)
- Users can skip migration and export manually later

**Testing Requirements**:
- Unit tests: versionService logic, diff calculation accuracy
- Integration tests: Version CRUD endpoints
- E2E tests: localStorage migration flow (frontend + backend)
- Data integrity tests: Verify imported versions match exported JSON

---

### Milestone 5: AI Proxy and Rate Limiting

**Goal**: Proxy Gemini API requests server-side with rate limiting and sanitization

**Priority**: SECONDARY (Enhances security, API key hidden)
**Dependencies**: Milestone 2 (authentication for rate limiting per user)

**Deliverables**:
1. **AI Service Layer**
   - Port geminiService.ts from frontend (reuse prompt engineering)
   - `aiService.generateReportModification()` - Gemini API call with server-side key
   - Sanitize AI response before returning to frontend
   - Error handling for API failures, timeouts

2. **AI Proxy Endpoint**
   - `POST /api/v1/ai/modify` - Proxy AI request
   - Request body: `{ reportHtml, userCommand }`
   - Response: `{ htmlContent: sanitizedHtml }`

3. **Rate Limiting**
   - Redis-backed rate limiter (10 requests per minute per user)
   - Sliding window algorithm
   - 429 Too Many Requests response with Retry-After header
   - Rate limit status in response headers (X-RateLimit-Remaining)

4. **Frontend Integration**
   - Update geminiService.ts to call backend API instead of direct Gemini
   - Remove VITE_GEMINI_API_KEY from frontend .env
   - Handle 429 rate limit errors gracefully (user-friendly message)

**Acceptance Criteria**:
- Gemini API key never exposed to frontend (environment variable on backend only)
- Rate limiting enforces 10 req/min per user
- AI responses sanitized via server-side DOMPurify
- Frontend successfully calls backend AI proxy
- Graceful error handling for API failures (timeout, quota exceeded)

**Testing Requirements**:
- Unit tests: aiService Gemini API integration (mock API responses)
- Integration tests: AI proxy endpoint (mock Gemini API)
- Rate limiting tests: Verify 429 after 10 requests in 1 minute
- Security tests: Sanitization of malicious AI responses

---

### Milestone 6: Audit Logging and Admin Endpoints

**Goal**: Implement comprehensive audit logging for compliance and admin user management

**Priority**: TERTIARY (Compliance and operational readiness)
**Dependencies**: Milestone 3 (reports), Milestone 4 (versions)

**Deliverables**:
1. **Audit Service Layer**
   - `auditService.log()` - Create audit log entry
   - Capture: userId, action, resourceType, resourceId, IP, userAgent, timestamp
   - Automatic audit log creation on all CRUD operations
   - Async logging (non-blocking, background job queue)

2. **Admin API Endpoints**
   - `GET /api/v1/admin/users` - List all users (admin only)
   - `PUT /api/v1/admin/users/:id/role` - Update user role (admin only)
   - `GET /api/v1/admin/audit-logs` - Query audit logs (admin only)
   - RBAC enforcement: Only ADMIN role can access admin endpoints

3. **Compliance Features**
   - GDPR data export: `GET /api/v1/users/me/data-export` - JSON export of all user data
   - Right to erasure: `DELETE /api/v1/users/me` - Anonymize user data
   - Audit log retention: 7-year retention policy (auto-archival script)

4. **Monitoring Integration**
   - Winston logger configuration (JSON structured logs)
   - Log rotation (daily, 90-day retention for operational logs)
   - Optional: Datadog/New Relic integration (send logs to APM)

**Acceptance Criteria**:
- All CRUD operations logged to audit_logs table
- Audit logs include full context (user, action, resource, timestamp, IP)
- Admin endpoints enforce ADMIN role (403 for non-admins)
- GDPR data export returns complete user data in JSON format
- Audit logs retained 7 years (compliance requirement)

**Testing Requirements**:
- Unit tests: auditService log creation
- Integration tests: Admin endpoints (role enforcement)
- Compliance tests: GDPR data export completeness
- Performance tests: Audit logging overhead <10ms per request

---

### Milestone 7: Deployment and Production Readiness

**Goal**: Deploy backend to production environment with monitoring and CI/CD

**Priority**: TERTIARY (Operational infrastructure)
**Dependencies**: All previous milestones (complete backend implementation)

**Deliverables**:
1. **Docker Production Build**
   - Multi-stage Dockerfile (build stage, production stage)
   - Optimize image size (<200MB with Alpine Linux)
   - Health check endpoint for container orchestration
   - Non-root user for security

2. **Cloud Deployment**
   - Choose deployment platform (Vercel Functions, AWS ECS, or Google Cloud Run)
   - Provision managed PostgreSQL (AWS RDS, Supabase, or Cloud SQL)
   - Provision managed Redis (Upstash, ElastiCache, or Memorystore)
   - Configure environment variables via cloud provider secrets management

3. **CI/CD Pipeline**
   - GitHub Actions workflow (.github/workflows/backend-ci-cd.yml)
   - Steps: Lint → Test → Build → Deploy (staging → production)
   - Test coverage gate: Fail CI if coverage <90%
   - Automated Prisma migrations on deploy

4. **Monitoring and Observability**
   - Application Performance Monitoring (Sentry for errors, Datadog/New Relic for APM)
   - Health check dashboard (Uptime monitoring)
   - Alerting: PagerDuty/Opsgenie for critical errors
   - Log aggregation (CloudWatch, Datadog, or ELK stack)

5. **Security Hardening**
   - HTTPS enforcement (redirect HTTP to HTTPS)
   - Security headers (Helmet.js: HSTS, CSP, X-Frame-Options)
   - Rate limiting on all endpoints (100 req/min per user)
   - Secret rotation strategy (90-day OAuth secret rotation)

**Acceptance Criteria**:
- Backend deployed to production with zero downtime
- Database migrations run successfully on production database
- Health check endpoint responds: GET /api/v1/health → 200 OK
- Monitoring dashboard shows API latency, error rate, throughput
- CI/CD pipeline runs on every pull request (lint, test, coverage)
- HTTPS enforced (HSTS headers, A+ SSL Labs rating)

**Testing Requirements**:
- Smoke tests: Production deployment health checks
- Load tests: 1,000 concurrent users (k6 or Artillery)
- Security tests: OWASP ZAP automated scan
- Disaster recovery test: Database backup restoration

---

## TECHNICAL APPROACH

### Backend Framework Decision

**Evaluation Criteria**:
- Performance (requests per second)
- TypeScript support (first-class vs. community types)
- Ecosystem maturity (middleware, plugins)
- Learning curve (developer familiarity)

**Option A: Fastify 5.x (RECOMMENDED)**
- **Pros**: 3x faster than Express, TypeScript-first, schema-based validation (JSON Schema)
- **Cons**: Smaller ecosystem, less community resources
- **Best For**: Performance-critical applications, greenfield projects

**Option B: Express 5.x**
- **Pros**: Mature ecosystem, extensive middleware, large community
- **Cons**: Slower performance, TypeScript requires @types packages
- **Best For**: Teams familiar with Express, rapid prototyping

**Recommendation**: Fastify for performance and TypeScript-native experience. Express acceptable if team prefers familiarity.

---

### Database Architecture Decisions

**Connection Pooling**:
- Prisma built-in connection pooling (10-20 connections per instance)
- Environment variable: `DATABASE_URL` with connection limit parameter
- Health check: Periodic connection test (prevent stale connections)

**Query Optimization**:
- Indexes on high-query columns: userId, reportId, timestamp, email
- EXPLAIN ANALYZE for slow queries (>100ms)
- Prisma query profiling (log slow queries)

**Backup Strategy**:
- Automated daily backups (cloud provider managed service)
- Point-in-time recovery (PITR) enabled
- Backup retention: 30 days
- Backup encryption: AES-256

**Scalability Plan**:
- Read replicas for query load distribution (when >1,000 users)
- Database partitioning for audit logs (yearly partitions)
- Archive old reports to separate table (>2 years old)

---

### Authentication Architecture

**JWT Token Structure**:
```json
{
  "userId": "uuid",
  "email": "analyst@example.com",
  "role": "ANALYST",
  "iat": 1700000000,
  "exp": 1700604800
}
```

**Token Signing**:
- Algorithm: RS256 (asymmetric keys for signature verification)
- Public key exposed for frontend token validation (optional)
- Private key stored in environment variable (never committed)

**Refresh Token Flow**:
- Access token: 7 days
- Refresh token: 30 days (stored in database Session table)
- Automatic refresh 1 day before expiration

**Session Management**:
- Option A (Recommended): JWT in httpOnly cookie (stateless, scalable)
- Option B: Server-side sessions in database (stateful, easier revocation)

---

### API Design Standards

**Response Format**:
```json
{
  "data": { ... },          // Success payload
  "error": "...",           // Error message (null if success)
  "pagination": {           // Optional, for list endpoints
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Error Handling**:
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "Title is required" }
  ],
  "statusCode": 400
}
```

**HTTP Status Codes**:
- 200 OK - Successful GET/PUT
- 201 Created - Successful POST
- 204 No Content - Successful DELETE
- 400 Bad Request - Validation error
- 401 Unauthorized - Missing/invalid token
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 429 Too Many Requests - Rate limit exceeded
- 500 Internal Server Error - Unexpected error

---

### Security Best Practices

**Input Validation**:
- Zod schemas for all request bodies
- Sanitize HTML on create/update (DOMPurify server-side)
- Validate UUID format for ID parameters
- Max request body size: 10MB (prevent DoS)

**Output Encoding**:
- JSON serialization prevents injection
- Content-Type: application/json header
- No eval() or dynamic code execution

**Rate Limiting Strategy**:
- Global: 100 requests per minute per IP
- Per-user: 10 AI requests per minute
- Sliding window algorithm (Redis-backed)

**Secret Management**:
- Development: .env file (git-ignored)
- Production: Cloud provider secrets (AWS Secrets Manager, Vercel Environment Variables)
- Rotation: OAuth secrets every 90 days

---

### Testing Strategy

**Test Pyramid**:
- Unit tests: 70% (services, utilities) - Fast, isolated
- Integration tests: 20% (API endpoints) - Database interactions
- E2E tests: 10% (critical user flows) - OAuth flow, migration

**Test Coverage Targets**:
- Overall: 90% minimum (enforced by CI/CD)
- Services: 95% (business logic critical)
- Routes: 85% (request/response validation)
- Middleware: 90% (authentication, authorization)

**Testing Tools**:
- Framework: Vitest (fast, Vite-native)
- HTTP testing: Supertest (API endpoint tests)
- Database: In-memory SQLite or Docker PostgreSQL (test isolation)
- Mocking: Vitest mocks for external services (Gemini API, OAuth)

**TDD Workflow (RED-GREEN-REFACTOR)**:
1. Write failing test for new feature
2. Implement minimal code to pass test
3. Refactor for code quality while keeping tests green
4. Commit with test coverage report

---

## RISKS AND CONTINGENCIES

### Technical Risks

**Risk**: Database migration failure in production
- **Mitigation**: Dry-run migrations on staging, backup before migrate, rollback script ready
- **Contingency**: Restore from backup, delay production deployment

**Risk**: OAuth provider rate limiting during authentication spike
- **Mitigation**: Implement exponential backoff, queue authentication requests
- **Contingency**: Display maintenance page, batch process auth queue

**Risk**: localStorage migration data corruption
- **Mitigation**: Validate import data structure, transactional import, user confirmation before localStorage clear
- **Contingency**: Manual JSON import support, recovery from exported files

### Operational Risks

**Risk**: Production deployment downtime
- **Mitigation**: Blue-green deployment, health checks before traffic switch
- **Contingency**: Rollback to previous version via cloud provider (instant rollback)

**Risk**: Gemini API cost explosion
- **Mitigation**: Rate limiting (10 req/min), monthly quota, daily budget alerts
- **Contingency**: Disable AI proxy if budget exceeded, notify users

**Risk**: Security vulnerability discovered post-launch
- **Mitigation**: Security audit pre-launch, Dependabot for dependency updates, bug bounty program
- **Contingency**: Emergency patch deployment, user notification if data exposed

---

## NEXT STEPS

### Pre-Implementation Checklist

**Technical Decisions**:
- [ ] Choose backend framework (Fastify recommended, Express acceptable)
- [ ] Choose deployment platform (Vercel, AWS, GCP, or self-hosted)
- [ ] Register OAuth applications (Google Cloud Console, Azure AD)
- [ ] Provision PostgreSQL database (local Docker, then cloud managed service)
- [ ] Provision Redis instance (local Docker, then cloud managed service)

**User Approvals**:
- [ ] Review and approve technology stack
- [ ] Confirm OAuth providers (Google + Microsoft)
- [ ] Approve localStorage migration UX flow
- [ ] Verify RBAC roles match organizational needs

**Expert Consultations** (Recommended):
- [ ] backend-expert: Architecture review, framework choice, database schema optimization
- [ ] devops-expert: Deployment strategy, CI/CD pipeline design
- [ ] security-expert: OAuth flow review, OWASP compliance

### Implementation Workflow

**Phase 1: Foundation (Week 1)**
- Execute Milestone 1: Backend foundation and database setup
- Set up local development environment (Docker Compose)
- Create Prisma schema and initial migration

**Phase 2: Authentication (Week 2)**
- Execute Milestone 2: OAuth 2.0 authentication flow
- Implement JWT session management
- Test authentication end-to-end

**Phase 3: Core API (Week 3-4)**
- Execute Milestone 3: Report CRUD API
- Execute Milestone 4: Version history API and migration
- Test frontend integration with backend API

**Phase 4: Enhancements (Week 5)**
- Execute Milestone 5: AI proxy and rate limiting
- Execute Milestone 6: Audit logging and admin endpoints
- Security hardening and performance optimization

**Phase 5: Deployment (Week 6)**
- Execute Milestone 7: Production deployment
- Load testing and security audit
- Go-live and monitoring setup

---

## ESTIMATED EFFORT

**Note**: Time estimates excluded per MoAI guidelines (unpredictability, TRUST violation)

**Complexity Breakdown**:
- **High Complexity**: OAuth authentication, localStorage migration, database schema design
- **Medium Complexity**: Report/version CRUD endpoints, AI proxy, audit logging
- **Low Complexity**: Project setup, Docker configuration, health checks

**Prioritization**:
- **PRIMARY GOALS**: Milestones 1-3 (foundation, auth, reports) - Must complete for MVP
- **SECONDARY GOALS**: Milestones 4-5 (versions, AI proxy) - Feature parity with frontend
- **FINAL GOALS**: Milestones 6-7 (audit, deployment) - Production readiness

---

**End of Implementation Plan - SPEC-BACKEND-001**
