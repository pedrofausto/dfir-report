# Acceptance Criteria: SPEC-BACKEND-001

**TAG**: `SPEC-BACKEND-001`
**Project**: dfir-report
**Owner**: @user
**Created**: 2025-11-23

---

## ACCEPTANCE TESTING STRATEGY

### Overview

This document defines comprehensive acceptance criteria for the backend API implementation using Given-When-Then format. All scenarios must pass before SPEC-BACKEND-001 is marked as complete. Testing follows TDD principles with 90% minimum code coverage.

**Testing Scope**:
- Functional correctness (all requirements met)
- Security compliance (OWASP Top 10, OAuth 2.0 best practices)
- Performance benchmarks (API latency targets)
- TRUST 5 validation (Test-first, Readable, Unified, Secured, Trackable)

---

## MILESTONE 1: Backend Foundation and Database Setup

### AC-1.1: Backend Server Initialization

**GIVEN** the backend project is initialized with TypeScript and Fastify/Express
**WHEN** the developer runs `npm run dev`
**THEN** the backend server **SHALL**:
- Start successfully on port 3000 (or configured PORT environment variable)
- Log "Server listening on http://localhost:3000" to console
- Respond to health check: `GET /api/v1/health` returns `200 OK` with JSON `{ status: 'healthy' }`
- Accept CORS requests from frontend origin (http://localhost:5173)

**Verification**:
```bash
curl http://localhost:3000/api/v1/health
# Expected response: {"status":"healthy","timestamp":"2025-11-23T10:00:00.000Z"}
```

---

### AC-1.2: PostgreSQL Database Connection

**GIVEN** PostgreSQL 18.1 is running via Docker Compose
**WHEN** the backend connects to the database using Prisma
**THEN** the system **SHALL**:
- Establish connection successfully (no connection errors in logs)
- Execute test query: `SELECT version()` returns PostgreSQL version string
- Handle connection errors gracefully (log error, retry with exponential backoff)
- Support connection pooling with minimum 5 connections, maximum 20 connections

**Verification**:
```typescript
// tests/integration/database.test.ts
test('database connection successful', async () => {
  const result = await prisma.$queryRaw`SELECT version()`;
  expect(result).toBeDefined();
  expect(result[0].version).toContain('PostgreSQL 18.1');
});
```

---

### AC-1.3: Prisma Schema Migration

**GIVEN** Prisma schema.prisma is defined with all models (User, Report, ReportVersion, AuditLog, Session, Organization)
**WHEN** the developer runs `prisma migrate dev`
**THEN** the system **SHALL**:
- Generate migration SQL successfully
- Apply migration to database without errors
- Create all tables with correct columns, constraints, and indexes
- Generate Prisma Client TypeScript types for all models

**Verification**:
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: users, reports, report_versions, audit_logs, sessions, organizations

-- Verify indexes created
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
-- Expected: users_email_idx, reports_created_by_idx, report_versions_report_id_idx, etc.
```

**Test Coverage**:
- Unit test: Schema validation (all models have required fields)
- Integration test: Migration rollback and re-apply

---

### AC-1.4: Environment Variable Validation

**GIVEN** environment variables are defined in .env file
**WHEN** the backend application starts
**THEN** the system **SHALL**:
- Validate all required environment variables using Zod schema
- Fail startup with clear error message if required variables missing
- Log validated configuration (with secrets redacted: `GEMINI_API_KEY: AIza***`)

**Required Environment Variables**:
- `DATABASE_URL` (PostgreSQL connection string)
- `GOOGLE_CLIENT_ID` (OAuth client ID)
- `GOOGLE_CLIENT_SECRET` (OAuth client secret)
- `JWT_SECRET` (256-bit random string)
- `GEMINI_API_KEY` (Gemini API key)
- `REDIS_URL` (Redis connection string)
- `FRONTEND_URL` (Frontend origin for CORS)

**Verification**:
```typescript
// tests/unit/config.test.ts
test('missing DATABASE_URL fails validation', () => {
  delete process.env.DATABASE_URL;
  expect(() => validateEnv()).toThrow('DATABASE_URL is required');
});
```

---

## MILESTONE 2: OAuth 2.0 Authentication Flow

### AC-2.1: Google OAuth Initiation

**GIVEN** a user clicks "Sign in with Google" on the frontend
**WHEN** the frontend redirects to `GET /api/v1/auth/oauth/google`
**THEN** the backend **SHALL**:
- Redirect user to Google OAuth consent screen (https://accounts.google.com/o/oauth2/v2/auth)
- Include query parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope=email profile`
- Set `state` parameter for CSRF protection (random 32-byte hex string)

**Verification**:
```typescript
// tests/integration/auth.test.ts
test('Google OAuth initiation redirects to consent screen', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/v1/auth/oauth/google' });

  expect(response.statusCode).toBe(302); // Redirect
  expect(response.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  expect(response.headers.location).toContain('client_id=');
  expect(response.headers.location).toContain('scope=email+profile');
});
```

---

### AC-2.2: OAuth Callback Handling

**GIVEN** Google redirects back to `GET /api/v1/auth/callback?code=AUTH_CODE&state=CSRF_TOKEN`
**WHEN** the backend receives the callback
**THEN** the system **SHALL**:
- Validate `state` parameter matches stored CSRF token
- Exchange authorization code for access token via Google API
- Fetch user profile (email, name, avatar URL) from Google API
- Create or update User record in database (upsert by email)
- Generate JWT token with user claims (userId, email, role)
- Set JWT in httpOnly cookie (`session` cookie, SameSite=Strict, Secure=true)
- Redirect user to frontend URL (e.g., http://localhost:5173/dashboard)

**Verification**:
```typescript
test('OAuth callback creates user and sets session cookie', async () => {
  // Mock Google API responses
  const mockGoogleUser = { id: 'google-123', email: 'analyst@example.com', name: 'John Doe', picture: 'https://...' };
  nock('https://oauth2.googleapis.com').post('/token').reply(200, { access_token: 'token' });
  nock('https://www.googleapis.com').get('/oauth2/v2/userinfo').reply(200, mockGoogleUser);

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/callback?code=AUTH_CODE&state=VALID_STATE'
  });

  expect(response.statusCode).toBe(302); // Redirect to frontend
  expect(response.cookies).toHaveLength(1);
  expect(response.cookies[0].name).toBe('session');
  expect(response.cookies[0].httpOnly).toBe(true);

  // Verify user created in database
  const user = await prisma.user.findUnique({ where: { email: 'analyst@example.com' } });
  expect(user).toBeDefined();
  expect(user.fullName).toBe('John Doe');
  expect(user.oauthProvider).toBe('google');
});
```

---

### AC-2.3: JWT Token Verification

**GIVEN** an authenticated user makes a request with JWT cookie
**WHEN** the authenticate middleware processes the request
**THEN** the system **SHALL**:
- Extract JWT from `session` cookie or `Authorization: Bearer TOKEN` header
- Verify JWT signature using RS256 algorithm and public key
- Validate token expiration (reject if expired)
- Fetch user from database by `userId` claim
- Attach user object to `request.user` (userId, email, role, isActive)
- Reject request with 401 Unauthorized if token invalid or user not found

**Verification**:
```typescript
test('valid JWT allows access to protected endpoint', async () => {
  const user = await createTestUser({ role: 'ANALYST' });
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    cookies: { session: token }
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    data: { id: user.id, email: user.email, role: 'ANALYST' }
  });
});

test('expired JWT returns 401 Unauthorized', async () => {
  const expiredToken = generateJWT({ userId: 'uuid', email: 'test@example.com', role: 'ANALYST' }, { expiresIn: '-1h' });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    cookies: { session: expiredToken }
  });

  expect(response.statusCode).toBe(401);
  expect(response.json()).toMatchObject({ error: 'Unauthorized: Invalid token' });
});
```

---

### AC-2.4: Logout Functionality

**GIVEN** an authenticated user requests logout
**WHEN** the user calls `POST /api/v1/auth/logout`
**THEN** the system **SHALL**:
- Clear `session` cookie (set Max-Age=0)
- Optionally: Blacklist JWT token (if using JWT blacklist strategy)
- Optionally: Delete session from database (if using server-side sessions)
- Return 200 OK with `{ message: 'Logged out successfully' }`

**Verification**:
```typescript
test('logout clears session cookie', async () => {
  const user = await createTestUser();
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    cookies: { session: token }
  });

  expect(response.statusCode).toBe(200);
  expect(response.cookies[0].maxAge).toBe(0); // Cookie cleared
  expect(response.json()).toMatchObject({ message: 'Logged out successfully' });
});
```

---

## MILESTONE 3: Report CRUD API

### AC-3.1: Create Report

**GIVEN** an authenticated user with ANALYST role
**WHEN** the user sends `POST /api/v1/reports` with request body:
```json
{
  "title": "Malware Analysis - Ransomware Sample XYZ",
  "htmlContent": "<h1>Executive Summary</h1><p>Analysis of ransomware sample...</p>",
  "forensicContext": {
    "caseId": "INC-2025-001",
    "incidentType": "Malware",
    "priority": "high"
  }
}
```
**THEN** the system **SHALL**:
- Validate request body against Zod schema (title required, htmlContent required)
- Sanitize `htmlContent` using DOMPurify (server-side)
- Create Report record in database with `createdBy = currentUser.id`
- Create initial ReportVersion (version 1) with same htmlContent
- Create audit log entry (action: 'create', resourceType: 'report')
- Return `201 Created` with report data in response

**Verification**:
```typescript
test('create report with valid data returns 201', async () => {
  const user = await createTestUser({ role: 'ANALYST' });
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/reports',
    cookies: { session: token },
    payload: {
      title: 'Malware Analysis',
      htmlContent: '<h1>Report</h1><script>alert("XSS")</script>',
      forensicContext: { caseId: 'INC-001' }
    }
  });

  expect(response.statusCode).toBe(201);
  const { data } = response.json();
  expect(data.title).toBe('Malware Analysis');
  expect(data.htmlContent).not.toContain('<script>'); // Sanitized
  expect(data.createdBy).toBe(user.id);

  // Verify initial version created
  const versions = await prisma.reportVersion.findMany({ where: { reportId: data.id } });
  expect(versions).toHaveLength(1);
  expect(versions[0].versionNumber).toBe(1);

  // Verify audit log
  const auditLog = await prisma.auditLog.findFirst({ where: { resourceId: data.id, action: 'create' } });
  expect(auditLog).toBeDefined();
});
```

---

### AC-3.2: List Reports with Pagination

**GIVEN** a user has created 50 reports
**WHEN** the user sends `GET /api/v1/reports?page=2&limit=20&status=DRAFT`
**THEN** the system **SHALL**:
- Return reports 21-40 (page 2, 20 items per page)
- Filter by `status=DRAFT` (only draft reports)
- Order by `updatedAt` descending (newest first)
- Include pagination metadata: `{ page: 2, limit: 20, total: 50, pages: 3 }`
- Include creator info: `{ creator: { id, email, fullName } }`
- Include version count: `{ _count: { versions: 5 } }`

**Verification**:
```typescript
test('list reports with pagination and filtering', async () => {
  const user = await createTestUser();
  await createTestReports(50, { createdBy: user.id, status: 'DRAFT' });
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/reports?page=2&limit=20&status=DRAFT',
    cookies: { session: token }
  });

  expect(response.statusCode).toBe(200);
  const { data, pagination } = response.json();
  expect(data).toHaveLength(20);
  expect(pagination).toMatchObject({ page: 2, limit: 20, total: 50, pages: 3 });
  expect(data[0].creator).toHaveProperty('email');
  expect(data[0]._count.versions).toBeGreaterThanOrEqual(1);
});
```

---

### AC-3.3: Update Report (Ownership Enforcement)

**GIVEN** User A created a report
**WHEN** User B (different user) attempts `PUT /api/v1/reports/:reportId` to update the report
**THEN** the system **SHALL**:
- Verify ownership: Check if `report.createdBy === currentUser.id`
- Return `403 Forbidden` with error message: "You do not have permission to update this report"
- NOT update the report in database

**Verification**:
```typescript
test('user cannot update another users report', async () => {
  const userA = await createTestUser({ email: 'userA@example.com' });
  const userB = await createTestUser({ email: 'userB@example.com' });
  const report = await createTestReport({ createdBy: userA.id });

  const tokenB = generateJWT({ userId: userB.id, email: userB.email, role: 'ANALYST' });

  const response = await app.inject({
    method: 'PUT',
    url: `/api/v1/reports/${report.id}`,
    cookies: { session: tokenB },
    payload: { title: 'Hacked Title' }
  });

  expect(response.statusCode).toBe(403);
  expect(response.json()).toMatchObject({ error: 'Forbidden' });

  // Verify report unchanged
  const unchangedReport = await prisma.report.findUnique({ where: { id: report.id } });
  expect(unchangedReport.title).toBe(report.title); // Original title preserved
});
```

---

### AC-3.4: Soft Delete Report

**GIVEN** a user created a report
**WHEN** the user sends `DELETE /api/v1/reports/:id`
**THEN** the system **SHALL**:
- NOT delete the report from database (preserve data)
- Set `deletedAt` timestamp to current time (soft delete)
- Return `204 No Content` (successful deletion)
- Exclude soft-deleted reports from `GET /api/v1/reports` list
- Allow ADMIN role to view deleted reports (future enhancement)

**Verification**:
```typescript
test('soft delete sets deletedAt timestamp', async () => {
  const user = await createTestUser();
  const report = await createTestReport({ createdBy: user.id });
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'DELETE',
    url: `/api/v1/reports/${report.id}`,
    cookies: { session: token }
  });

  expect(response.statusCode).toBe(204);

  // Verify soft delete
  const deletedReport = await prisma.report.findUnique({ where: { id: report.id } });
  expect(deletedReport.deletedAt).not.toBeNull();

  // Verify excluded from list
  const listResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/reports',
    cookies: { session: token }
  });
  const { data } = listResponse.json();
  expect(data.find(r => r.id === report.id)).toBeUndefined();
});
```

---

## MILESTONE 4: Version History API and Migration

### AC-4.1: Save Version with Diff Calculation

**GIVEN** a report with 3 existing versions
**WHEN** the user sends `POST /api/v1/reports/:id/versions` with new HTML content
**THEN** the system **SHALL**:
- Increment version number to 4 (latest.versionNumber + 1)
- Sanitize htmlContent before saving
- Calculate diff stats vs. previous version (additions, deletions, modifications)
- Store diff stats in `diffStats` JSON field
- Set `isAutoSave` flag based on request body (default: false)
- Inherit forensic context from report if not provided

**Verification**:
```typescript
test('save version calculates diff stats correctly', async () => {
  const user = await createTestUser();
  const report = await createTestReport({ createdBy: user.id, htmlContent: '<h1>Version 1</h1>' });
  await createTestVersion({ reportId: report.id, versionNumber: 1, htmlContent: '<h1>Version 1</h1>' });

  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/reports/${report.id}/versions`,
    cookies: { session: token },
    payload: {
      htmlContent: '<h1>Version 2</h1><p>New paragraph</p>',
      changeDescription: 'Added paragraph',
      isAutoSave: false
    }
  });

  expect(response.statusCode).toBe(201);
  const { data } = response.json();
  expect(data.versionNumber).toBe(2);
  expect(data.diffStats).toMatchObject({
    additions: expect.any(Number),
    deletions: expect.any(Number),
    modifications: expect.any(Number)
  });
  expect(data.diffStats.additions).toBeGreaterThan(0); // New paragraph added
});
```

---

### AC-4.2: List Versions with Creator Info

**GIVEN** a report with 50 versions
**WHEN** the user sends `GET /api/v1/reports/:id/versions?page=1&limit=20`
**THEN** the system **SHALL**:
- Return versions 1-20 (newest first: descending `createdAt`)
- Include creator info: `{ creator: { id, email, fullName } }`
- Include all version metadata: versionNumber, changeDescription, isAutoSave, diffStats, forensicContext
- Support pagination (page, limit)

**Verification**:
```typescript
test('list versions includes creator and metadata', async () => {
  const user = await createTestUser({ fullName: 'Jane Analyst' });
  const report = await createTestReport({ createdBy: user.id });
  await createTestVersions(50, { reportId: report.id, createdBy: user.id });

  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'GET',
    url: `/api/v1/reports/${report.id}/versions?page=1&limit=20`,
    cookies: { session: token }
  });

  expect(response.statusCode).toBe(200);
  const { data } = response.json();
  expect(data).toHaveLength(20);
  expect(data[0].creator.fullName).toBe('Jane Analyst');
  expect(data[0]).toHaveProperty('versionNumber');
  expect(data[0]).toHaveProperty('diffStats');
});
```

---

### AC-4.3: localStorage Migration Import

**GIVEN** a user has 23 versions exported from localStorage (SPEC-VERSION-001 format)
**WHEN** the user sends `POST /api/v1/migration/import-versions` with JSON payload
**THEN** the system **SHALL**:
- Validate JSON structure (required fields: id, versionNumber, timestamp, htmlContent)
- Create new Report with title extracted from first version's HTML
- Import all 23 versions with original timestamps (preserve `createdAt`)
- Preserve all metadata: changeDescription, isAutoSave, forensicContext, diffStats
- Return `200 OK` with `{ data: { reportId, versionsImported: 23 } }`
- Rollback all changes if ANY version fails to import (transactional import)

**Verification**:
```typescript
test('migration import preserves all localStorage data', async () => {
  const user = await createTestUser();
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const localStorageExport = {
    exportDate: '2025-11-23T10:00:00Z',
    reportId: 'local-report-id',
    versionCount: 3,
    versions: [
      {
        id: 'v1-uuid',
        reportId: 'local-report-id',
        versionNumber: 1,
        timestamp: 1700000000000,
        htmlContent: '<h1>Version 1</h1>',
        changeDescription: 'Initial creation',
        isAutoSave: false,
        createdBy: { userId: user.id, username: user.email, role: user.role },
        forensicContext: { caseId: 'INC-001' },
        diffStats: { additions: 10, deletions: 0, modifications: 0 }
      },
      // ... 2 more versions
    ]
  };

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/migration/import-versions',
    cookies: { session: token },
    payload: localStorageExport
  });

  expect(response.statusCode).toBe(200);
  const { data } = response.json();
  expect(data.versionsImported).toBe(3);

  // Verify all versions imported with correct data
  const versions = await prisma.reportVersion.findMany({
    where: { reportId: data.reportId },
    orderBy: { versionNumber: 'asc' }
  });
  expect(versions).toHaveLength(3);
  expect(versions[0].changeDescription).toBe('Initial creation');
  expect(versions[0].forensicContext).toMatchObject({ caseId: 'INC-001' });
  expect(versions[0].createdAt.getTime()).toBe(1700000000000); // Original timestamp
});

test('migration rollback on error preserves database integrity', async () => {
  const user = await createTestUser();
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const invalidExport = {
    versions: [
      { versionNumber: 1, htmlContent: '<h1>Valid</h1>', /* missing required fields */ },
    ]
  };

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/migration/import-versions',
    cookies: { session: token },
    payload: invalidExport
  });

  expect(response.statusCode).toBe(400); // Validation error

  // Verify NO report or versions created (transactional rollback)
  const reportCount = await prisma.report.count({ where: { createdBy: user.id } });
  expect(reportCount).toBe(0);
});
```

---

## MILESTONE 5: AI Proxy and Rate Limiting

### AC-5.1: AI Proxy Hides API Key

**GIVEN** the frontend needs to modify a report using Gemini AI
**WHEN** the frontend sends `POST /api/v1/ai/modify` with `{ reportHtml, userCommand }`
**THEN** the system **SHALL**:
- NOT expose Gemini API key to frontend (key stored in backend environment variables)
- Proxy request to Gemini API using server-side key
- Sanitize AI-generated HTML before returning to frontend
- Return `200 OK` with `{ data: { htmlContent: sanitizedHtml } }`
- Create audit log entry (action: 'ai-modify', details: { command: userCommand })

**Verification**:
```typescript
test('AI proxy uses server-side Gemini API key', async () => {
  const user = await createTestUser();
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  // Mock Gemini API response
  nock('https://generativelanguage.googleapis.com')
    .post('/v1beta/models/gemini-pro:generateContent')
    .reply(200, {
      candidates: [{ content: { parts: [{ text: '<h1>Modified Report</h1><script>alert("XSS")</script>' }] } }]
    });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/modify',
    cookies: { session: token },
    payload: {
      reportHtml: '<h1>Original Report</h1>',
      userCommand: 'Add executive summary'
    }
  });

  expect(response.statusCode).toBe(200);
  const { data } = response.json();
  expect(data.htmlContent).toContain('<h1>Modified Report</h1>');
  expect(data.htmlContent).not.toContain('<script>'); // Sanitized

  // Verify audit log
  const auditLog = await prisma.auditLog.findFirst({
    where: { userId: user.id, action: 'ai-modify' }
  });
  expect(auditLog).toBeDefined();
  expect(auditLog.details).toMatchObject({ command: 'Add executive summary' });
});
```

---

### AC-5.2: Rate Limiting Enforcement

**GIVEN** a user has made 10 AI requests in the last minute
**WHEN** the user attempts the 11th AI request within the same minute
**THEN** the system **SHALL**:
- Return `429 Too Many Requests` status code
- Include error message: "Rate limit exceeded. Try again in 1 minute."
- Include `Retry-After` header with seconds until rate limit resets
- NOT process the AI request (do not call Gemini API)

**Verification**:
```typescript
test('rate limiting blocks 11th request in 1 minute', async () => {
  const user = await createTestUser();
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  // Mock Gemini API to return quickly
  nock('https://generativelanguage.googleapis.com')
    .post('/v1beta/models/gemini-pro:generateContent')
    .times(10)
    .reply(200, { candidates: [{ content: { parts: [{ text: '<h1>Response</h1>' }] } }] });

  // Make 10 requests (should succeed)
  for (let i = 0; i < 10; i++) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/modify',
      cookies: { session: token },
      payload: { reportHtml: '<h1>Test</h1>', userCommand: `Request ${i}` }
    });
    expect(response.statusCode).toBe(200);
  }

  // 11th request should be rate limited
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/modify',
    cookies: { session: token },
    payload: { reportHtml: '<h1>Test</h1>', userCommand: 'Request 11' }
  });

  expect(response.statusCode).toBe(429);
  expect(response.json()).toMatchObject({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  expect(response.headers['retry-after']).toBeDefined();
});
```

---

## MILESTONE 6: Audit Logging and Admin Endpoints

### AC-6.1: Audit Log Creation on CRUD Operations

**GIVEN** a user performs any CRUD operation (create/update/delete report or version)
**WHEN** the operation completes successfully
**THEN** the system **SHALL**:
- Create audit log entry in `audit_logs` table
- Include: userId, action ('create'/'update'/'delete'), resourceType ('report'/'version'), resourceId
- Include request metadata: ipAddress (from `request.ip`), userAgent (from `request.headers['user-agent']`)
- Include timestamp (auto-generated by database)
- Log creation is non-blocking (async background job)

**Verification**:
```typescript
test('creating report generates audit log entry', async () => {
  const user = await createTestUser();
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/reports',
    cookies: { session: token },
    headers: { 'user-agent': 'Mozilla/5.0' },
    payload: { title: 'Test Report', htmlContent: '<h1>Report</h1>' }
  });

  const { data } = response.json();

  // Verify audit log created
  const auditLog = await prisma.auditLog.findFirst({
    where: { userId: user.id, action: 'create', resourceType: 'report', resourceId: data.id }
  });
  expect(auditLog).toBeDefined();
  expect(auditLog.userAgent).toBe('Mozilla/5.0');
  expect(auditLog.timestamp).toBeInstanceOf(Date);
});
```

---

### AC-6.2: Admin User Management (RBAC)

**GIVEN** a user with ADMIN role
**WHEN** the admin sends `PUT /api/v1/admin/users/:userId/role` with `{ role: 'LEAD' }`
**THEN** the system **SHALL**:
- Verify current user has ADMIN role (403 if not)
- Update target user's role to 'LEAD'
- Create audit log entry (action: 'update-role', resourceType: 'user', details: { oldRole, newRole })
- Return `200 OK` with updated user data

**Verification**:
```typescript
test('admin can update user roles', async () => {
  const admin = await createTestUser({ role: 'ADMIN' });
  const analyst = await createTestUser({ role: 'ANALYST', email: 'analyst@example.com' });
  const adminToken = generateJWT({ userId: admin.id, email: admin.email, role: 'ADMIN' });

  const response = await app.inject({
    method: 'PUT',
    url: `/api/v1/admin/users/${analyst.id}/role`,
    cookies: { session: adminToken },
    payload: { role: 'LEAD' }
  });

  expect(response.statusCode).toBe(200);
  const { data } = response.json();
  expect(data.role).toBe('LEAD');

  // Verify database update
  const updatedUser = await prisma.user.findUnique({ where: { id: analyst.id } });
  expect(updatedUser.role).toBe('LEAD');

  // Verify audit log
  const auditLog = await prisma.auditLog.findFirst({
    where: { action: 'update-role', resourceId: analyst.id }
  });
  expect(auditLog.details).toMatchObject({ oldRole: 'ANALYST', newRole: 'LEAD' });
});

test('non-admin cannot update user roles', async () => {
  const analyst = await createTestUser({ role: 'ANALYST' });
  const otherUser = await createTestUser({ role: 'ANALYST', email: 'other@example.com' });
  const analystToken = generateJWT({ userId: analyst.id, email: analyst.email, role: 'ANALYST' });

  const response = await app.inject({
    method: 'PUT',
    url: `/api/v1/admin/users/${otherUser.id}/role`,
    cookies: { session: analystToken },
    payload: { role: 'ADMIN' }
  });

  expect(response.statusCode).toBe(403); // Forbidden
  expect(response.json()).toMatchObject({ error: 'Forbidden: Insufficient permissions' });
});
```

---

### AC-6.3: GDPR Data Export

**GIVEN** a user requests their personal data
**WHEN** the user sends `GET /api/v1/users/me/data-export`
**THEN** the system **SHALL**:
- Export all user data in JSON format (GDPR "Right to Access")
- Include: user profile, all reports, all versions, all audit logs related to user
- Redact sensitive data (OAuth tokens, JWT secrets)
- Return `200 OK` with JSON payload or download link

**Verification**:
```typescript
test('GDPR data export includes all user data', async () => {
  const user = await createTestUser();
  await createTestReport({ createdBy: user.id, title: 'Report 1' });
  await createTestReport({ createdBy: user.id, title: 'Report 2' });
  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/users/me/data-export',
    cookies: { session: token }
  });

  expect(response.statusCode).toBe(200);
  const exportData = response.json();

  expect(exportData.user).toMatchObject({ id: user.id, email: user.email });
  expect(exportData.reports).toHaveLength(2);
  expect(exportData.reports[0].title).toBe('Report 1');
  expect(exportData.auditLogs).toBeDefined();
});
```

---

## MILESTONE 7: Deployment and Production Readiness

### AC-7.1: Docker Container Health Check

**GIVEN** the backend is running in a Docker container
**WHEN** the orchestration platform (Kubernetes, ECS, Cloud Run) queries the health endpoint
**THEN** the system **SHALL**:
- Respond to `GET /api/v1/health` within 500ms
- Return `200 OK` with JSON: `{ status: 'healthy', timestamp, version }`
- Verify database connectivity as part of health check (query `SELECT 1`)
- Return `503 Service Unavailable` if database unreachable

**Verification**:
```typescript
test('health check returns 200 when database connected', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    status: 'healthy',
    timestamp: expect.any(String),
    version: expect.any(String)
  });
});

test('health check returns 503 when database disconnected', async () => {
  // Disconnect Prisma
  await prisma.$disconnect();

  const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

  expect(response.statusCode).toBe(503);
  expect(response.json()).toMatchObject({ status: 'unhealthy', error: 'Database connection failed' });

  // Reconnect for other tests
  await prisma.$connect();
});
```

---

### AC-7.2: Security Headers (Helmet.js)

**GIVEN** the backend is deployed to production
**WHEN** a client makes any API request
**THEN** the system **SHALL** include the following security headers in all responses:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: default-src 'self'`

**Verification**:
```typescript
test('all responses include security headers', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

  expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.headers['x-frame-options']).toBe('DENY');
  expect(response.headers['content-security-policy']).toBeDefined();
});
```

---

### AC-7.3: API Performance Benchmarks

**GIVEN** the production backend is deployed and handling requests
**WHEN** performance is measured under normal load (50 concurrent users)
**THEN** the system **SHALL** achieve the following latency targets (P95):

| Endpoint | Target P95 Latency | Acceptance |
|----------|-------------------|------------|
| GET /api/v1/reports (list) | <300ms | Pass if 95% of requests < 300ms |
| GET /api/v1/reports/:id | <200ms | Pass if 95% of requests < 200ms |
| POST /api/v1/reports | <500ms | Pass if 95% of requests < 500ms |
| POST /api/v1/reports/:id/versions | <400ms | Pass if 95% of requests < 400ms |
| POST /api/v1/ai/modify | <8000ms | Pass if 95% of requests < 8s |

**Verification** (using k6 load testing tool):
```javascript
// tests/performance/api-benchmarks.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 50, // 50 concurrent users
  duration: '5m',
  thresholds: {
    'http_req_duration{endpoint:list_reports}': ['p(95)<300'],
    'http_req_duration{endpoint:get_report}': ['p(95)<200'],
    'http_req_duration{endpoint:create_report}': ['p(95)<500'],
  }
};

export default function () {
  const baseUrl = 'https://api.dfir-cortex.com';
  const token = 'Bearer TEST_JWT_TOKEN';

  // Test GET /api/v1/reports
  let res = http.get(`${baseUrl}/api/v1/reports`, {
    headers: { Authorization: token },
    tags: { endpoint: 'list_reports' }
  });
  check(res, { 'list reports status 200': (r) => r.status === 200 });

  sleep(1);
}
```

---

## TRUST 5 VALIDATION

### Test-First Development (T)

**Acceptance Criteria**:
- ✅ All features implemented with TDD (RED-GREEN-REFACTOR)
- ✅ Test coverage ≥90% (measured by Vitest coverage report)
- ✅ No untested code paths in critical services (auth, reports, versions)
- ✅ Integration tests cover all API endpoints
- ✅ E2E tests validate OAuth flow and migration

**Verification**:
```bash
npm run test:coverage
# Expected output:
# Statements: 92% (650/705)
# Branches: 91% (120/132)
# Functions: 94% (85/90)
# Lines: 93% (640/688)
```

---

### Readable Code (R)

**Acceptance Criteria**:
- ✅ Clear module separation (routes, services, middleware, schemas)
- ✅ TypeScript interfaces for all data structures
- ✅ JSDoc comments for complex functions (diff calculation, migration logic)
- ✅ Consistent naming conventions (camelCase functions, PascalCase types)
- ✅ No code smells (ESLint passes with zero warnings)

**Verification**:
```bash
npm run lint
# Expected output: ✔ 0 errors, 0 warnings
```

---

### Unified Patterns (U)

**Acceptance Criteria**:
- ✅ Consistent error handling (all errors use custom error classes)
- ✅ Consistent API response format (`{ data, error, pagination }`)
- ✅ Reusable middleware (authenticate, authorize, validate)
- ✅ Centralized configuration (single source of truth for env variables)

**Verification**:
```typescript
// All endpoints follow same response pattern
test('all endpoints return consistent response format', async () => {
  const endpoints = [
    { method: 'GET', url: '/api/v1/reports' },
    { method: 'GET', url: '/api/v1/auth/me' }
  ];

  for (const endpoint of endpoints) {
    const response = await app.inject(endpoint);
    expect(response.json()).toHaveProperty('data'); // Consistent key
  }
});
```

---

### Secured by Default (S)

**Acceptance Criteria**:
- ✅ OAuth 2.0 authentication (no passwords stored)
- ✅ JWT-based sessions with httpOnly cookies
- ✅ Server-side HTML sanitization (SPEC-SECURITY-001)
- ✅ Rate limiting on all endpoints (100 req/min per user)
- ✅ Audit logging for compliance (SOC 2, GDPR)
- ✅ HTTPS-only deployment (HSTS headers)
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention (Prisma ORM parameterized queries)

**Verification**:
- Security audit with OWASP ZAP (zero high/critical vulnerabilities)
- Penetration testing report (if applicable)
- SSL Labs rating: A+ (https://www.ssllabs.com/ssltest/)

---

### Trackable Changes (T)

**Acceptance Criteria**:
- ✅ All commits tagged with SPEC-BACKEND-001
- ✅ Prisma migrations track database schema evolution
- ✅ Audit logs provide forensic trail of all actions
- ✅ API versioning (/v1/) allows backward-compatible changes
- ✅ Git commit messages follow conventional commits format

**Verification**:
```bash
git log --oneline --grep="SPEC-BACKEND-001"
# Expected: All backend commits tagged with SPEC-BACKEND-001
```

---

## DEFINITION OF DONE

**SPEC-BACKEND-001 is considered COMPLETE when**:

1. **All Milestones Delivered**:
   - ✅ Milestone 1: Backend foundation and database setup
   - ✅ Milestone 2: OAuth 2.0 authentication flow
   - ✅ Milestone 3: Report CRUD API
   - ✅ Milestone 4: Version history API and migration
   - ✅ Milestone 5: AI proxy and rate limiting
   - ✅ Milestone 6: Audit logging and admin endpoints
   - ✅ Milestone 7: Deployment and production readiness

2. **All Acceptance Criteria Pass**:
   - ✅ 100% of Given-When-Then scenarios pass automated tests
   - ✅ No failing tests in CI/CD pipeline
   - ✅ Test coverage ≥90% (Vitest coverage report)

3. **TRUST 5 Validation Complete**:
   - ✅ Test-first: TDD enforced, 90%+ coverage
   - ✅ Readable: Code review passed, ESLint clean
   - ✅ Unified: Consistent patterns verified
   - ✅ Secured: OWASP compliance, security audit passed
   - ✅ Trackable: All commits tagged, audit logs functional

4. **Production Deployment Successful**:
   - ✅ Backend deployed to production environment
   - ✅ Database migrations applied successfully
   - ✅ Health check endpoint responds 200 OK
   - ✅ Monitoring dashboard operational (Sentry, Datadog, or New Relic)
   - ✅ No critical errors in production logs (first 24 hours)

5. **Documentation Complete**:
   - ✅ API documentation generated (OpenAPI/Swagger)
   - ✅ README.md updated with deployment instructions
   - ✅ Migration guide published for users (localStorage to database)

6. **User Acceptance**:
   - ✅ User successfully authenticates via OAuth
   - ✅ User migrates localStorage data without data loss
   - ✅ Frontend integrates with backend API successfully
   - ✅ All existing features (version history, AI commands) functional

---

**End of Acceptance Criteria - SPEC-BACKEND-001**
