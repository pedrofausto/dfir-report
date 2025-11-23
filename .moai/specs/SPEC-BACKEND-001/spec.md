# SPEC-BACKEND-001: Backend API with PostgreSQL Persistence and OAuth Authentication

**TAG**: `SPEC-BACKEND-001`
**Status**: Draft
**Created**: 2025-11-23
**Owner**: @user
**Project**: dfir-report
**Priority**: CRITICAL (Foundation for Multi-User Collaboration)

---

## TAG BLOCK

```yaml
tag_id: SPEC-BACKEND-001
domain: BACKEND
subdomain: API_DATABASE_AUTH
version: 1.0.0
status: draft
created_at: 2025-11-23
updated_at: 2025-11-23
owner: @user
project: dfir-report
dependencies:
  - SPEC-SECURITY-001  # Server-side HTML sanitization required
  - SPEC-VERSION-001   # localStorage migration to database
```

---

## OVERVIEW

### Purpose

Implement a production-ready backend API with PostgreSQL database persistence, OAuth 2.0 authentication (Hybrid JWT strategy), and multi-user collaboration support in a monorepo architecture. Deploy via self-hosted Docker containers with Docker Compose for development and Docker Swarm/Kubernetes for production. This migration enables secure data persistence, real authentication, audit logging, and scalability for enterprise DFIR teams.

### Background

**Current State (v0.1.5)**:
- **No Backend**: React SPA only, all data in-memory or localStorage
- **Mock Authentication**: Hardcoded MOCK_USERS array, no real credential validation
- **No Persistence**: Data lost on browser refresh (except localStorage version history)
- **Client-Side Security**: API keys exposed, no server-side validation
- **Single-User**: No multi-user collaboration, no concurrent editing support
- **No Audit Trail**: Missing compliance-required access logs

**Critical Gaps Preventing Production Use**:
- Cannot onboard real users (no registration, password reset, MFA)
- No data backup or disaster recovery (localStorage only)
- Security vulnerabilities (client-side API key, no rate limiting, no CSRF protection)
- Compliance violations (no audit logs for SOC 2, GDPR, HIPAA)
- Cannot scale beyond single-user prototype

### Goals

1. **Primary**: Implement RESTful API backend with PostgreSQL database for persistent storage
2. **Secondary**: Replace mock authentication with Hybrid JWT OAuth 2.0 (Google + GitHub Phase 1)
3. **Tertiary**: Migrate localStorage version history to database with zero data loss via background job queue
4. **Future-Ready**: Foundation for real-time collaboration (WebSocket), RBAC enforcement, audit logging

---

## ENVIRONMENT

### WHEN the backend API handles requests

**Trigger Events**:
- User authenticates via OAuth 2.0 provider (Google, GitHub)
- Frontend requests report data via REST API endpoints
- Frontend saves report versions or forensic metadata
- Frontend uploads AI-generated content for server-side sanitization
- Background job processes data migration from localStorage
- Admin manages users, organizations, and permissions
- Monthly AI quota enforcement (100 commands/month per user)

**Context**:
- **Repository**: Monorepo structure (`/frontend`, `/backend`, `/shared`)
- **Frontend**: React 19.2.0 SPA (moved to `/frontend` directory)
- **Backend**: Node.js 20 LTS + Fastify 5.x (new `/backend` directory)
- **Database**: PostgreSQL 18.1 with Prisma 6.x ORM
- **Cache**: Redis 7.x (sessions, rate limiting, job queue)
- **Job Queue**: BullMQ 5.x for background processing
- **Hosting**: Self-hosted Docker Compose (dev) + Docker Swarm/Kubernetes (production)
- **Authentication**: Hybrid JWT (15-min access token + 30-day refresh token)
- **Deployment**: Docker containerized, CI/CD via GitHub Actions

**Preconditions**:
- PostgreSQL database provisioned (local dev: Docker, production: self-hosted or managed)
- Redis instance provisioned (local dev: Docker, production: self-hosted or managed)
- OAuth apps registered (Google Cloud Console, GitHub Developer Settings)
- Environment variables configured (DATABASE_URL, OAuth secrets)
- Frontend updated to call API endpoints instead of localStorage

---

## ASSUMPTIONS

### Technology Assumptions

1. **Backend Framework Selection**:
   - **Fastify 5.x** selected for performance (3x faster than Express)
   - TypeScript-first, schema-based validation (JSON Schema)
   - Native async/await support, excellent ecosystem

2. **Database Compatibility**:
   - PostgreSQL 18.1 available for self-hosted deployment or managed services
   - Prisma 6.x supports all required features (migrations, TypeScript codegen, JSONB queries)
   - Database connection pooling (Prisma built-in) handles concurrent requests
   - JSONB column type supports flexible forensic metadata storage
   - Native partitioning for audit logs (yearly partitions)

3. **OAuth Provider Availability**:
   - **Phase 1**: Google OAuth 2.0 + GitHub OAuth (widest coverage)
   - **Phase 2**: Microsoft Azure AD, Auth0 SSO (future)
   - Passport.js or @fastify/oauth2 for provider integration

4. **Deployment Environment**:
   - **Primary**: Self-hosted Docker Compose (development)
   - **Production**: Docker Swarm or Kubernetes (container orchestration)
   - HTTPS/TLS enforced for all API traffic (Let's Encrypt or self-signed for dev)
   - Environment variable management via Docker secrets or Kubernetes ConfigMap

### User Behavior Assumptions

1. **Authentication Preferences**:
   - DFIR analysts prefer Google Workspace or GitHub SSO (no new passwords)
   - Organizations require MFA enforcement (handled by OAuth provider)
   - Session duration: 15-minute access token, 30-day refresh token
   - Automatic token refresh when access token <5min remaining

2. **Data Migration**:
   - Users accept one-time migration from localStorage to database
   - Migration runs as background job (non-blocking UI)
   - Users can track migration progress via job status endpoint
   - Existing version history preserved with full fidelity

3. **API Latency Tolerance**:
   - Report load from database acceptable if <500ms (P95)
   - Version save acceptable if <1 second (P95)
   - AI command processing total time <10s (includes backend proxy to Gemini API)
   - Real-time collaboration features deferred to v1.0.0 (WebSocket)

### Organizational Assumptions

1. **Monorepo Compatibility**:
   - Single repository with `/frontend`, `/backend`, `/shared` folders
   - Shared TypeScript types between frontend and backend
   - Unified CI/CD pipeline (test frontend + backend together)
   - Single `package.json` with workspace configuration

2. **Compliance Requirements**:
   - SOC 2 Type II audit trail required (all CRUD operations logged)
   - GDPR compliance needed (data export, right to erasure)
   - HIPAA readiness planned for healthcare incident investigations
   - Audit logs retained 7 years, encrypted at rest (PostgreSQL partitioning)

---

## REQUIREMENTS

### Functional Requirements

#### FR-1: Backend API Architecture

**WHEN** the backend API is deployed,
**IF** the frontend sends HTTP requests,
**THEN** the system **SHALL** provide a RESTful API with the following characteristics:

**API Design Principles**:
- RESTful resource-based URLs (e.g., `/api/v1/reports`, `/api/v1/versions`)
- JSON request/response payloads with Content-Type: application/json
- Versioned API (v1 prefix) for backward compatibility
- Standard HTTP status codes (200, 201, 400, 401, 403, 404, 429, 500)
- CORS configured for frontend origin (http://localhost:5173 dev, production domain)

**Core Endpoints** (Detailed in FR-3 to FR-10):
```
Authentication (Hybrid JWT):
  POST   /api/v1/auth/oauth/google       # Initiate Google OAuth flow
  POST   /api/v1/auth/oauth/github       # Initiate GitHub OAuth flow
  GET    /api/v1/auth/callback           # OAuth callback handler
  POST   /api/v1/auth/refresh            # Refresh access token
  POST   /api/v1/auth/logout             # Invalidate session
  GET    /api/v1/auth/me                 # Get current user

Reports:
  GET    /api/v1/reports                 # List all reports (paginated, filtered)
  POST   /api/v1/reports                 # Create new report
  GET    /api/v1/reports/:id             # Get report by ID
  PUT    /api/v1/reports/:id             # Update report
  DELETE /api/v1/reports/:id             # Delete report (soft delete)

Versions:
  GET    /api/v1/reports/:id/versions    # List versions for report
  POST   /api/v1/reports/:id/versions    # Save new version
  GET    /api/v1/versions/:versionId     # Get specific version
  DELETE /api/v1/versions/:versionId     # Delete version

AI Proxy (with Monthly Quota):
  POST   /api/v1/ai/modify               # Proxy to Gemini API (server-side key)

Background Jobs:
  POST   /api/v1/jobs/migration          # Start localStorage migration job
  GET    /api/v1/jobs/:jobId/status      # Check job status

Health:
  GET    /api/v1/health                  # Health check (PostgreSQL, Redis, disk)

Admin:
  GET    /api/v1/admin/users             # List users (admin only)
  PUT    /api/v1/admin/users/:id/role    # Update user role (admin only)
```

**Acceptance Criteria**:
- API responds with correct status codes for success/error cases
- CORS headers allow frontend origin
- API versioning via `/v1/` prefix
- OpenAPI/Swagger documentation auto-generated (optional but recommended)

---

#### FR-2: PostgreSQL Database Schema

**WHEN** the database is initialized,
**IF** Prisma migrations are applied,
**THEN** the system **SHALL** create the following schema:

**Schema Definition** (Prisma schema.prisma):
```prisma
// Users and Authentication
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  fullName      String?
  avatarUrl     String?
  role          Role      @default(ANALYST)

  // OAuth Provider Info
  oauthProvider String    // 'google', 'github'
  oauthId       String    // Provider's user ID

  // Organization (Future multi-tenant)
  organizationId String?
  organization  Organization? @relation(fields: [organizationId], references: [id])

  // Timestamps
  createdAt     DateTime  @default(now())
  lastLoginAt   DateTime?
  isActive      Boolean   @default(true)

  // Relations
  reports       Report[]
  versions      ReportVersion[]
  auditLogs     AuditLog[]
  sessions      Session[]
  aiUsageLogs   AiUsageLog[]

  @@unique([oauthProvider, oauthId])
  @@index([email])
  @@index([organizationId])
}

enum Role {
  ADMIN
  LEAD
  ANALYST
  VIEWER
}

// Organizations (Multi-tenant support)
model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  createdAt   DateTime @default(now())

  users       User[]
  reports     Report[]
}

// Reports (Core entity)
model Report {
  id              String    @id @default(uuid())
  title           String
  htmlContent     String    @db.Text
  status          ReportStatus @default(DRAFT)

  // Forensic Context (JSONB for flexibility)
  forensicContext Json?

  // Ownership
  createdBy       String
  creator         User      @relation(fields: [createdBy], references: [id])
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime? // Soft delete

  // Relations
  versions        ReportVersion[]

  @@index([createdBy])
  @@index([organizationId])
  @@index([status])
  @@index([createdAt])
}

enum ReportStatus {
  DRAFT
  IN_REVIEW
  FINAL
  ARCHIVED
}

// Version History
model ReportVersion {
  id                String   @id @default(uuid())
  reportId          String
  report            Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)

  versionNumber     Int
  htmlContent       String   @db.Text
  changeDescription String?

  // User context
  createdBy         String
  creator           User     @relation(fields: [createdBy], references: [id])

  // Forensic metadata (inherited from report, can be version-specific)
  forensicContext   Json?

  // Auto-save tracking
  isAutoSave        Boolean  @default(false)

  // Diff stats (calculated on save)
  diffStats         Json?

  // Timestamps
  createdAt         DateTime @default(now())

  @@unique([reportId, versionNumber])
  @@index([reportId])
  @@index([createdAt])
}

// Audit Logging (Compliance) - PostgreSQL Native Partitioning
model AuditLog {
  id            String   @id @default(uuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])

  action        String   // 'create', 'update', 'delete', 'view', 'export'
  resourceType  String   // 'report', 'user', 'version'
  resourceId    String?

  details       Json?    // Context-specific audit details
  ipAddress     String?
  userAgent     String?

  timestamp     DateTime @default(now())

  @@index([userId])
  @@index([resourceType, resourceId])
  @@index([timestamp])
}
// NOTE: PostgreSQL partitioning configured in migrations, not schema.prisma
// CREATE TABLE audit_logs_2025 PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

// OAuth Sessions (Hybrid JWT: 15-min access + 30-day refresh)
model Session {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken  String   @unique
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  lastUsedAt    DateTime @default(now())
  ipAddress     String?
  userAgent     String?

  @@index([userId])
  @@index([refreshToken])
}

// AI Usage Tracking (Monthly Quota Enforcement: 100 commands/month)
model AiUsageLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  command     String
  tokensUsed  Int
  costUsd     Decimal  @db.Decimal(10, 4)
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}
```

**Migration Strategy**:
- Use Prisma Migrate for version-controlled schema changes
- Seed script for initial MOCK_USERS migration (if needed)
- Indexes on high-query columns (email, reportId, timestamp)
- Foreign key constraints with CASCADE delete for versions
- Audit log partitioning (yearly) configured in migration SQL

**Acceptance Criteria**:
- `prisma migrate dev` runs successfully
- All tables created with correct columns and constraints
- Prisma Client generates TypeScript types for all models
- Indexes improve query performance (measured via EXPLAIN ANALYZE)

---

#### FR-3: Hybrid JWT OAuth 2.0 Authentication Flow

**WHEN** a user initiates login,
**IF** they select an OAuth provider (Google or GitHub),
**THEN** the system **SHALL** implement the following Hybrid JWT OAuth 2.0 flow:

**Hybrid JWT Strategy**:
- **Access Token**: 15-minute JWT (stateless, httpOnly cookie)
- **Refresh Token**: 30-day token stored in database Session table
- **Revocation**: Delete refresh token from database (immediate access termination)
- **Auto-refresh**: If access token <5min remaining, auto-refresh in middleware

**Authentication Flow**:
```
1. User clicks "Sign in with Google" on frontend
   ↓
2. Frontend redirects to backend: GET /api/v1/auth/oauth/google
   ↓
3. Backend redirects to Google OAuth consent screen
   (with client_id, redirect_uri, scope: email, profile)
   ↓
4. User approves consent
   ↓
5. Google redirects to backend callback: GET /api/v1/auth/callback?code=...
   ↓
6. Backend exchanges authorization code for access token
   ↓
7. Backend fetches user profile from Google API (email, name, avatar)
   ↓
8. Backend creates/updates User record in database
   ↓
9. Backend generates access token (15-min JWT) + refresh token (30-day, stored in DB)
   ↓
10. Backend sets access token in httpOnly cookie, returns refresh token to frontend
   ↓
11. Frontend stores refresh token securely, fetches user via GET /api/v1/auth/me
```

**@fastify/oauth2 Integration**:
```typescript
// Example configuration
import fastifyOAuth2 from '@fastify/oauth2';

app.register(fastifyOAuth2, {
  name: 'googleOAuth',
  scope: ['email', 'profile'],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
    auth: fastifyOAuth2.GOOGLE_CONFIGURATION
  },
  startRedirectPath: '/api/v1/auth/oauth/google',
  callbackUri: process.env.BACKEND_URL + '/api/v1/auth/callback'
});

app.get('/api/v1/auth/callback', async (request, reply) => {
  const { token } = await app.googleOAuth.getAccessTokenFromAuthorizationCodeFlow(request);

  // Fetch user profile
  const userProfile = await fetchGoogleProfile(token.access_token);

  // Find or create user
  const user = await prisma.user.upsert({
    where: { email: userProfile.email },
    update: {
      fullName: userProfile.name,
      avatarUrl: userProfile.picture,
      lastLoginAt: new Date()
    },
    create: {
      email: userProfile.email,
      fullName: userProfile.name,
      avatarUrl: userProfile.picture,
      oauthProvider: 'google',
      oauthId: userProfile.sub,
      role: 'ANALYST'
    }
  });

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken();

  // Store refresh token in database
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    }
  });

  // Set access token cookie
  reply.setCookie('session', accessToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 });

  return reply.redirect(`${process.env.FRONTEND_URL}/dashboard`);
});
```

**Token Refresh Flow**:
```typescript
// POST /api/v1/auth/refresh
app.post('/api/v1/auth/refresh', async (request, reply) => {
  const { refreshToken } = request.body;

  // Validate refresh token in database
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    return reply.status(401).send({ error: 'Invalid or expired refresh token' });
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role
  });

  // Update last used timestamp
  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() }
  });

  reply.setCookie('session', accessToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 });
  return reply.send({ success: true });
});
```

**Token Revocation (Logout)**:
```typescript
// POST /api/v1/auth/logout
app.post('/api/v1/auth/logout', { preHandler: authenticate }, async (request, reply) => {
  const { refreshToken } = request.body;

  // Delete refresh token from database (immediate revocation)
  await prisma.session.delete({ where: { refreshToken } });

  // Clear access token cookie
  reply.clearCookie('session');
  return reply.send({ message: 'Logged out successfully' });
});
```

**Auto-Refresh Middleware**:
```typescript
// Middleware: Auto-refresh if access token expires in <5 minutes
export async function autoRefreshToken(request, reply) {
  const accessToken = request.cookies.session;
  if (!accessToken) return;

  const decoded = jwt.decode(accessToken) as { exp: number };
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  if (expiresIn < 5 * 60) { // Less than 5 minutes remaining
    // Trigger refresh (client should call /api/v1/auth/refresh)
    reply.header('X-Token-Refresh-Required', 'true');
  }
}
```

**Acceptance Criteria**:
- User can authenticate with Google or GitHub OAuth successfully
- Access token expires after 15 minutes (stateless JWT)
- Refresh token stored in database, expires after 30 days
- Token refresh endpoint generates new access token
- Logout deletes refresh token from database (immediate revocation)
- Unauthorized requests return 401 Unauthorized
- Access tokens <5min remaining trigger auto-refresh

---

#### FR-4: API Authentication Middleware

**WHEN** the API receives a request,
**IF** the endpoint requires authentication,
**THEN** the system **SHALL** validate the session token and attach user context:

**Middleware Implementation**:
```typescript
// middleware/authenticate.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Extract JWT from httpOnly cookie or Authorization header
    const token = request.cookies.session ||
                  request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: No token provided' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    // Fetch user from database (Redis cache in production for 15-min TTL)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid user' });
    }

    // Attach user to request context
    request.user = user;

  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
}

// Usage in routes
app.get('/api/v1/reports', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user.id; // Type-safe user access
  // ...
});
```

**Role-Based Access Control (RBAC)**:
```typescript
// middleware/authorize.ts
export function authorize(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Forbidden: Insufficient permissions'
      });
    }
  };
}

// Usage
app.delete('/api/v1/reports/:id', {
  preHandler: [authenticate, authorize(['ADMIN', 'LEAD'])]
}, async (request, reply) => {
  // Only admins and leads can delete reports
});
```

**Acceptance Criteria**:
- Authenticated requests include `request.user` with userId, email, role
- Unauthenticated requests to protected endpoints return 401
- Insufficient permissions return 403 Forbidden
- Middleware performance overhead <5ms per request
- Redis caching reduces database queries for user lookup (15-min TTL)

---

#### FR-5: Report CRUD API Endpoints

**WHEN** the frontend manages reports,
**IF** the user is authenticated,
**THEN** the system **SHALL** provide the following endpoints:

**GET /api/v1/reports** - List Reports
```typescript
// Query parameters: page, limit, status, sortBy, search
async function getReports(request, reply) {
  const { page = 1, limit = 20, status, search } = request.query;
  const userId = request.user.id;

  // Redis caching: 60-second TTL for list endpoint
  const cacheKey = `reports:${userId}:${page}:${limit}:${status}:${search}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return reply.send(JSON.parse(cachedData));
  }

  const reports = await prisma.report.findMany({
    where: {
      createdBy: userId, // User sees only their reports (or organization's if LEAD/ADMIN)
      status: status || undefined,
      deletedAt: null, // Exclude soft-deleted
      title: search ? { contains: search, mode: 'insensitive' } : undefined
    },
    include: {
      creator: { select: { id: true, email: true, fullName: true } },
      _count: { select: { versions: true } } // Version count
    },
    orderBy: { updatedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  const total = await prisma.report.count({ where: { createdBy: userId, deletedAt: null } });

  const response = {
    data: reports,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };

  // Cache for 60 seconds
  await redis.setex(cacheKey, 60, JSON.stringify(response));

  return reply.send(response);
}
```

**POST /api/v1/reports** - Create Report
```typescript
async function createReport(request, reply) {
  const { title, htmlContent, forensicContext } = request.body;
  const userId = request.user.id;

  // Sanitize HTML (server-side defense-in-depth)
  const sanitizedHtml = sanitizeHtml(htmlContent);

  const report = await prisma.report.create({
    data: {
      title,
      htmlContent: sanitizedHtml,
      forensicContext: forensicContext || {},
      createdBy: userId,
      status: 'DRAFT'
    }
  });

  // Create initial version (version 1)
  await prisma.reportVersion.create({
    data: {
      reportId: report.id,
      versionNumber: 1,
      htmlContent: sanitizedHtml,
      changeDescription: 'Initial report creation',
      createdBy: userId,
      isAutoSave: false
    }
  });

  // Audit log
  await auditLog(userId, 'create', 'report', report.id, request);

  // Invalidate cache
  await redis.del(`reports:${userId}:*`);

  return reply.status(201).send({ data: report });
}
```

**PUT /api/v1/reports/:id** - Update Report
```typescript
async function updateReport(request, reply) {
  const { id } = request.params;
  const { title, htmlContent, forensicContext, status } = request.body;
  const userId = request.user.id;

  // Verify ownership or permissions
  const existingReport = await prisma.report.findUnique({ where: { id } });
  if (!existingReport || existingReport.createdBy !== userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  // Sanitize HTML
  const sanitizedHtml = htmlContent ? sanitizeHtml(htmlContent) : undefined;

  const updated = await prisma.report.update({
    where: { id },
    data: {
      title: title || undefined,
      htmlContent: sanitizedHtml || undefined,
      forensicContext: forensicContext || undefined,
      status: status || undefined,
      updatedAt: new Date()
    }
  });

  await auditLog(userId, 'update', 'report', id, request);

  // Invalidate cache
  await redis.del(`reports:${userId}:*`);

  return reply.send({ data: updated });
}
```

**DELETE /api/v1/reports/:id** - Soft Delete Report
```typescript
async function deleteReport(request, reply) {
  const { id } = request.params;
  const userId = request.user.id;

  // Verify ownership or ADMIN role
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || (report.createdBy !== userId && request.user.role !== 'ADMIN')) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  // Soft delete
  await prisma.report.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await auditLog(userId, 'delete', 'report', id, request);

  // Invalidate cache
  await redis.del(`reports:${userId}:*`);

  return reply.status(204).send();
}
```

**Acceptance Criteria**:
- All endpoints enforce authentication and authorization
- HTML content sanitized on create/update (SPEC-SECURITY-001)
- Soft delete preserves data for recovery
- Audit logs record all CRUD operations
- Pagination works correctly (page, limit, total count)
- Search filters by title (case-insensitive)
- Redis caching improves performance (60-second TTL for list, invalidate on write)

---

#### FR-6: Version History API Endpoints

**WHEN** the frontend manages version history,
**IF** versions are stored in the database,
**THEN** the system **SHALL** migrate localStorage functionality to API endpoints:

**POST /api/v1/reports/:id/versions** - Save Version
```typescript
async function saveVersion(request, reply) {
  const { id: reportId } = request.params;
  const { htmlContent, changeDescription, isAutoSave, forensicContext } = request.body;
  const userId = request.user.id;

  // Verify report access
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.createdBy !== userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  // Get next version number
  const latestVersion = await prisma.reportVersion.findFirst({
    where: { reportId },
    orderBy: { versionNumber: 'desc' }
  });
  const versionNumber = (latestVersion?.versionNumber || 0) + 1;

  // Calculate diff stats (if previous version exists)
  let diffStats = null;
  if (latestVersion) {
    diffStats = calculateDiffStats(latestVersion.htmlContent, htmlContent);
  }

  const version = await prisma.reportVersion.create({
    data: {
      reportId,
      versionNumber,
      htmlContent: sanitizeHtml(htmlContent),
      changeDescription: changeDescription || `Version ${versionNumber}`,
      createdBy: userId,
      isAutoSave: isAutoSave || false,
      forensicContext: forensicContext || report.forensicContext,
      diffStats
    }
  });

  await auditLog(userId, 'create', 'version', version.id, request);

  return reply.status(201).send({ data: version });
}
```

**GET /api/v1/reports/:id/versions** - List Versions
```typescript
async function getVersions(request, reply) {
  const { id: reportId } = request.params;
  const { page = 1, limit = 50 } = request.query;

  const versions = await prisma.reportVersion.findMany({
    where: { reportId },
    include: {
      creator: { select: { id: true, email: true, fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  return reply.send({ data: versions });
}
```

**Acceptance Criteria**:
- Version numbers auto-increment correctly
- Diff stats calculated and stored with each version
- Auto-save versions flagged appropriately
- API parity with localStorage service (SPEC-VERSION-001)

---

#### FR-7: localStorage Migration Strategy with Background Job Queue

**WHEN** users upgrade from v0.1.5 to backend-enabled version,
**IF** they have existing localStorage version history,
**THEN** the system **SHALL** provide a migration assistant with background job processing:

**Migration Flow**:
```
1. User logs in with OAuth for first time
   ↓
2. Frontend detects localStorage data (dfir-cortex:versions:*)
   ↓
3. Display migration prompt:
   "We detected 23 saved versions in your browser. Migrate to cloud?"
   [Skip for Now] [Migrate Data]
   ↓
4. If user selects "Migrate Data":
   - Export localStorage to JSON (SPEC-VERSION-001 exportVersionsToJSON)
   - POST /api/v1/jobs/migration with JSON payload
   ↓
5. Backend creates background job (BullMQ):
   - Returns 202 Accepted with job ID
   - User can poll /api/v1/jobs/:jobId/status
   ↓
6. Background job validates and imports versions:
   - Create report if not exists
   - Create version records with original timestamps
   - Preserve forensic metadata and diff stats
   - Auto-retry: 3 attempts with exponential backoff
   ↓
7. On success:
   - Job status: 'completed'
   - Clear localStorage (with user confirmation)
   - Redirect to migrated reports
   ↓
8. On error:
   - Job status: 'failed' with error message
   - Keep localStorage intact
   - Allow retry or manual export
```

**Backend Migration Endpoint (Background Job)**:
```typescript
// POST /api/v1/jobs/migration
async function createMigrationJob(request, reply) {
  const { versions } = request.body; // Array from localStorage export
  const userId = request.user.id;

  // Create background job (BullMQ)
  const job = await migrationQueue.add('import-versions', {
    userId,
    versions
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });

  return reply.status(202).send({
    data: {
      jobId: job.id,
      status: 'pending',
      message: 'Migration started. Track progress at /api/v1/jobs/' + job.id + '/status'
    }
  });
}

// GET /api/v1/jobs/:jobId/status
async function getJobStatus(request, reply) {
  const { jobId } = request.params;
  const job = await migrationQueue.getJob(jobId);

  if (!job) {
    return reply.status(404).send({ error: 'Job not found' });
  }

  const status = await job.getState();
  return reply.send({
    data: {
      jobId: job.id,
      status, // 'pending', 'active', 'completed', 'failed'
      progress: job.progress(),
      result: job.returnvalue,
      error: job.failedReason
    }
  });
}

// BullMQ Worker Process
migrationQueue.process('import-versions', async (job) => {
  const { userId, versions } = job.data;

  // Create report from first version
  const firstVersion = versions[versions.length - 1]; // Oldest first
  const report = await prisma.report.create({
    data: {
      title: extractTitleFromHtml(firstVersion.htmlContent) || 'Migrated Report',
      htmlContent: firstVersion.htmlContent,
      createdBy: userId,
      createdAt: new Date(firstVersion.timestamp)
    }
  });

  // Import all versions
  let imported = 0;
  for (const v of versions.sort((a, b) => a.timestamp - b.timestamp)) {
    await prisma.reportVersion.create({
      data: {
        reportId: report.id,
        versionNumber: v.versionNumber,
        htmlContent: sanitizeHtml(v.htmlContent),
        changeDescription: v.changeDescription,
        createdBy: userId,
        isAutoSave: v.isAutoSave,
        forensicContext: v.forensicContext,
        diffStats: v.diffStats,
        createdAt: new Date(v.timestamp)
      }
    });
    imported++;
    job.updateProgress((imported / versions.length) * 100);
  }

  return {
    reportId: report.id,
    versionsImported: versions.length
  };
});
```

**Acceptance Criteria**:
- Users prompted to migrate on first backend login
- Migration runs as background job (202 Accepted status)
- User can track progress via /api/v1/jobs/:jobId/status endpoint
- Migration preserves all version data (timestamps, metadata, diff stats)
- Migration fails gracefully with auto-retry (3 attempts, exponential backoff)
- Users can skip migration and manually export later
- localStorage cleared only after successful import (with confirmation)

---

#### FR-8: Server-Side AI Proxy with Monthly Quota Enforcement

**WHEN** the frontend requests AI-powered report modification,
**IF** the backend proxies the request to Gemini API,
**THEN** the system **SHALL** hide the API key, apply rate limiting, and enforce monthly quota:

**AI Proxy Endpoint with Monthly Quota**:
```typescript
// POST /api/v1/ai/modify
async function aiModifyReport(request, reply) {
  const { reportHtml, userCommand } = request.body;
  const userId = request.user.id;

  // Rate limiting (10 requests per minute per user)
  const rateLimitKey = `ai-rate-limit:${userId}`;
  const requestCount = await redis.incr(rateLimitKey);
  if (requestCount === 1) {
    await redis.expire(rateLimitKey, 60); // 1 minute window
  }
  if (requestCount > 10) {
    return reply.status(429).send({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  // Monthly quota enforcement (100 AI commands/month)
  const monthKey = `ai-quota:${userId}:${new Date().toISOString().slice(0, 7)}`; // YYYY-MM
  const monthlyUsage = await redis.incr(monthKey);
  if (monthlyUsage === 1) {
    await redis.expire(monthKey, 60 * 60 * 24 * 31); // 31 days
  }
  if (monthlyUsage > 100) {
    return reply.status(429).send({
      error: 'Monthly quota exceeded (100 AI commands/month)',
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // Call Gemini API (server-side key from environment variables)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const modifiedHtml = await generateReportModification(reportHtml, userCommand, geminiApiKey);

  // Sanitize AI response (defense-in-depth)
  const sanitizedHtml = sanitizeHtml(modifiedHtml);

  // Log AI usage
  await prisma.aiUsageLog.create({
    data: {
      userId,
      command: userCommand,
      tokensUsed: modifiedHtml.length, // Approximate
      costUsd: 0.01 // Estimated
    }
  });

  // Audit log AI usage
  await auditLog(userId, 'ai-modify', 'report', null, request, { command: userCommand });

  return reply.send({ data: { htmlContent: sanitizedHtml } });
}
```

**Acceptance Criteria**:
- Gemini API key never exposed to frontend
- Rate limiting prevents abuse (10 req/min per user)
- Monthly quota enforced (100 commands/month per user)
- AI responses sanitized before returning to frontend
- Audit logs track AI command usage
- AiUsageLog table records all AI usage with timestamps
- Graceful error handling for API failures

---

#### FR-9: Monorepo Repository Structure

**WHEN** the project is restructured as a monorepo,
**IF** frontend and backend coexist in the same repository,
**THEN** the system **SHALL** use the following structure:

**Monorepo Structure**:
```
dfir-report/
├── frontend/          # Existing React app (moved from root)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # New Fastify API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── prisma/
│   ├── Dockerfile
│   └── package.json
├── shared/            # Shared TypeScript types
│   └── types/
│       ├── report.types.ts
│       ├── user.types.ts
│       └── index.ts
├── docker-compose.yml # Development environment (PostgreSQL + Redis + Backend + Frontend)
├── package.json       # Root workspace config
└── README.md
```

**Root package.json (Workspace Configuration)**:
```json
{
  "name": "dfir-report-monorepo",
  "private": true,
  "workspaces": [
    "frontend",
    "backend",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w backend && npm run build -w frontend",
    "test": "npm run test -w backend && npm run test -w frontend",
    "lint": "npm run lint -w backend && npm run lint -w frontend"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Acceptance Criteria**:
- Frontend moved to `/frontend` directory without breaking changes
- Backend implemented in `/backend` directory
- Shared types in `/shared` directory (used by both frontend and backend)
- Single `npm install` installs all workspace dependencies
- Unified CI/CD pipeline (test frontend + backend together)
- Docker Compose orchestrates all services (PostgreSQL, Redis, Backend, Frontend)

---

#### FR-10: Health Check Endpoint

**WHEN** the backend is deployed,
**IF** monitoring or orchestration platforms query the health endpoint,
**THEN** the system **SHALL** provide comprehensive health checks:

**Health Check Endpoint**:
```typescript
// GET /api/v1/health
app.get('/api/v1/health', async (request, reply) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    storage: 'unknown'
  };

  // PostgreSQL connection check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
  }

  // Redis connection check
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch (error) {
    checks.redis = 'error';
  }

  // Disk space check (basic)
  checks.storage = 'ok'; // Placeholder for disk space check

  const allHealthy = Object.values(checks).every(status => status === 'ok');

  return reply.status(allHealthy ? 200 : 503).send({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.3.0'
  });
});
```

**Acceptance Criteria**:
- Health check responds within 500ms
- PostgreSQL connection verified with `SELECT 1` query
- Redis connection verified with `PING` command
- Returns 503 Service Unavailable if any check fails
- Includes uptime and version information

---

### Non-Functional Requirements

#### NFR-1: API Performance Benchmarks with Redis Caching

**WHEN** the API handles requests,
**IF** performance targets are met,
**THEN** the system **SHALL** achieve:

| Endpoint | Target Latency (P95) | Measurement Method |
|----------|---------------------|-------------------|
| GET /api/v1/reports (list) | <300ms → <50ms (cached) | Redis 60-second TTL |
| GET /api/v1/reports/:id | <200ms | Database query time + serialization |
| POST /api/v1/reports | <500ms | Includes version creation, audit log |
| POST /api/v1/reports/:id/versions | <400ms | Includes diff calculation, sanitization |
| POST /api/v1/ai/modify | <8000ms | Gemini API latency + sanitization |
| GET /api/v1/auth/me | <100ms → <5ms (cached) | Redis 15-minute TTL for user sessions |

**Redis Caching Strategy**:
1. **User sessions**: 15-minute TTL (reduce database queries)
2. **Report metadata**: 60-second TTL (list endpoint performance)
3. **Rate limiting**: 1-minute sliding window
4. **Cache invalidation**: On write operations (create/update/delete)

**Performance Impact**:
- User lookup: 100ms → 5ms (20x faster)
- Report list: 300ms → 50ms (6x faster)

**Optimization Strategies**:
- Database connection pooling (10-20 connections)
- Redis caching for user sessions and frequent queries
- Lazy loading of large HTML content (stream responses)
- CDN caching for static API documentation

---

#### NFR-2: Security Hardening and Deployment Platform

**WHEN** the backend handles sensitive data,
**IF** security best practices are applied,
**THEN** the system **SHALL**:

**Deployment Platform**:
- **PRIMARY**: Self-hosted Docker Compose (development) + Docker Swarm/Kubernetes (production)
- **Deliverables**:
  - `docker-compose.yml`: PostgreSQL, Redis, Backend, Frontend
  - `Dockerfile`: Multi-stage build for backend
  - Health checks for PostgreSQL, Redis
  - Documentation: Port mappings, environment variables, volume mounts

**docker-compose.yml Example**:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:18.1-alpine
    environment:
      POSTGRES_DB: dfir_cortex
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/dfir_cortex
      REDIS_URL: redis://redis:6379
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      JWT_SECRET: ${JWT_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      FRONTEND_URL: http://localhost:5173
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src
    command: npm run dev

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost:3000
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev

volumes:
  postgres_data:
```

**Application Security**:
- **Input Validation**: Zod schema validation for all request bodies
- **Output Encoding**: JSON serialization prevents injection
- **SQL Injection**: Prisma ORM parameterized queries (no raw SQL)
- **XSS Prevention**: Server-side HTML sanitization (SPEC-SECURITY-001)
- **CSRF Protection**: SameSite cookies + CSRF tokens for state-changing requests
- **Rate Limiting**: 100 requests/minute per user (sliding window)
- **HTTPS Only**: Redirect HTTP to HTTPS, HSTS headers
- **Secret Management**: Environment variables (never committed to git)

**Database Security**:
- **Encryption at Rest**: PostgreSQL TDE or cloud provider encryption
- **Encryption in Transit**: TLS 1.3 for database connections
- **Least Privilege**: Database user with limited permissions (no DROP, TRUNCATE)
- **Backup Encryption**: Encrypted backups with separate key management

**OWASP Top 10 Compliance**:
- A01 Broken Access Control: RBAC middleware enforces permissions
- A02 Cryptographic Failures: HTTPS, encrypted database, secure cookies
- A03 Injection: Prisma ORM prevents SQL injection
- A05 Security Misconfiguration: Security headers (Helmet.js)
- A07 Identification/Authentication: OAuth 2.0, Hybrid JWT best practices

---

#### NFR-3: Audit Logging and Compliance

**WHEN** users perform actions,
**IF** compliance requirements (SOC 2, GDPR, HIPAA) are enforced,
**THEN** the system **SHALL** log:

**Audit Log Events**:
- User authentication (login, logout, failed attempts)
- Report CRUD operations (create, read, update, delete)
- Version saves (auto-save and manual)
- AI command usage (prompt, sanitized response)
- Permission changes (admin role updates)
- Data exports (CSV, JSON, PDF)

**Audit Log Partitioning** (PostgreSQL Native):
```sql
-- PostgreSQL native partitioning by year
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  -- other columns...
) PARTITION BY RANGE (timestamp);

CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Note: Partitioning configured in Prisma migrations, not schema.prisma
```

**Log Retention**:
- Operational logs: 90 days (debugging, monitoring)
- Audit logs: 7 years (compliance requirement)
- PII redaction: Sensitive data masked in logs (email → e***@domain.com)

**GDPR Compliance**:
- Right to Access: `GET /api/v1/users/me/data-export` → JSON export of all user data
- Right to Erasure: `DELETE /api/v1/users/me` → Anonymize user data, preserve audit logs
- Consent Management: Track user consent for analytics, AI processing
- Data Minimization: Collect only necessary data (no tracking cookies)

---

#### NFR-4: Scalability and High Availability

**WHEN** the system scales to support multiple users,
**IF** infrastructure handles growth,
**THEN** the system **SHALL**:

**Horizontal Scaling**:
- Stateless API servers (scale to N instances behind load balancer)
- Database read replicas for query performance (writes to primary, reads from replicas)
- Redis cluster for distributed session storage
- Background job queue (BullMQ, backed by Redis) for heavy operations (PDF export, data migration)

**Target Capacity**:
- 1,000 concurrent users (authenticated sessions)
- 10,000 reports total (across all users)
- 100,000 versions (average 10 versions per report)
- 5MB average report size (500KB HTML after compression)

**Database Performance**:
- Connection pooling: 20 connections per API instance
- Query optimization: Indexes on high-query columns (userId, reportId, timestamp)
- Partition strategy: Archive reports older than 2 years to separate table

---

## SPECIFICATIONS

### Technical Design

#### Technology Stack Summary (FINALIZED)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Runtime** | Node.js | 20 LTS | Stable, ecosystem mature |
| **Framework** | Fastify | 5.x | 3x faster than Express, TypeScript-native |
| **Database** | PostgreSQL | 18.1 | ACID, JSONB, partitioning |
| **ORM** | Prisma | 6.x | Type-safe, migrations |
| **Cache** | Redis | 7.x | Sessions, rate limiting, job queue |
| **Job Queue** | BullMQ | 5.x | Background processing (localStorage migration, large diffs) |
| **Auth** | @fastify/oauth2 | 8.x | Google + GitHub OAuth |
| **Session** | Hybrid JWT | jsonwebtoken 9.x | 15-min access + 30-day refresh |
| **Validation** | Zod | 3.x | TypeScript-native |
| **Sanitization** | DOMPurify | 3.x | XSS prevention |
| **Logging** | Winston | 3.x | JSON structured logs |
| **Testing** | Vitest | 2.x | Fast, Vite-native |
| **Deployment** | Docker | 27.x | Self-hosted containers |

**OAuth Providers (Phase 1)**:
1. **Google OAuth 2.0** (largest user base)
   - Scopes: profile, email
   - Provider: @fastify/oauth2

2. **GitHub OAuth** (developer-focused)
   - Scopes: user:email
   - Provider: @fastify/oauth2

**Phase 2 (Future)**: Microsoft OAuth (enterprise), Auth0 (SSO)

---

#### Project Structure

```
dfir-report/                # Monorepo root
├── frontend/               # Existing React app
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/                # New Fastify API
│   ├── src/
│   │   ├── index.ts                  # Application entry point
│   │   ├── config/
│   │   │   ├── env.ts                # Environment variable validation (Zod)
│   │   │   ├── database.ts           # Prisma client initialization
│   │   │   └── oauth.ts              # @fastify/oauth2 strategies
│   │   ├── routes/
│   │   │   ├── auth.routes.ts        # Authentication endpoints
│   │   │   ├── reports.routes.ts     # Report CRUD endpoints
│   │   │   ├── versions.routes.ts    # Version history endpoints
│   │   │   ├── ai.routes.ts          # AI proxy endpoint
│   │   │   ├── jobs.routes.ts        # Background job endpoints
│   │   │   └── admin.routes.ts       # Admin user management
│   │   ├── middleware/
│   │   │   ├── authenticate.ts       # JWT verification, user attachment
│   │   │   ├── authorize.ts          # RBAC permission checks
│   │   │   ├── validate.ts           # Zod request validation
│   │   │   ├── rateLimiter.ts        # Rate limiting (Redis-backed)
│   │   │   ├── errorHandler.ts       # Global error handling
│   │   │   └── logger.ts             # Request logging middleware
│   │   ├── services/
│   │   │   ├── authService.ts        # OAuth user creation, JWT signing
│   │   │   ├── reportService.ts      # Report business logic
│   │   │   ├── versionService.ts     # Version history management
│   │   │   ├── aiService.ts          # Gemini API proxy
│   │   │   ├── sanitizationService.ts # HTML sanitization (SPEC-SECURITY-001)
│   │   │   ├── auditService.ts       # Audit log creation
│   │   │   └── migrationService.ts   # localStorage data import
│   │   ├── jobs/
│   │   │   └── migrationWorker.ts    # BullMQ worker for localStorage migration
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts        # Zod schemas for auth requests
│   │   │   ├── report.schema.ts      # Zod schemas for report requests
│   │   │   └── version.schema.ts     # Zod schemas for version requests
│   │   ├── types/
│   │   │   └── index.ts              # Shared TypeScript types
│   │   └── utils/
│   │       ├── diff.ts               # Diff calculation utilities
│   │       ├── logger.ts             # Winston logger configuration
│   │       └── errors.ts             # Custom error classes
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema
│   │   ├── migrations/               # Prisma migrations
│   │   └── seed.ts                   # Database seeding script
│   ├── Dockerfile                    # Multi-stage Docker build
│   ├── package.json
│   └── vitest.config.ts
├── shared/                 # Shared TypeScript types
│   └── types/
│       ├── report.types.ts
│       ├── user.types.ts
│       └── index.ts
├── docker-compose.yml      # Development environment (PostgreSQL + Redis + Backend + Frontend)
├── package.json            # Root workspace config
└── README.md
```

---

#### Deployment Architecture

**Development Environment** (docker-compose.yml):
- PostgreSQL 18.1 container (port 5432)
- Redis 7 container (port 6379)
- Backend Fastify container (port 3000)
- Frontend Vite dev server (port 5173)

**Production Deployment** (Self-Hosted Docker):
- **Option A: Docker Compose** (simple deployment)
  - Single-server deployment with docker-compose
  - Nginx reverse proxy for HTTPS termination
  - Let's Encrypt SSL certificates
  - Pros: Simple setup, low cost
  - Cons: Single point of failure, manual scaling

- **Option B: Docker Swarm** (orchestration)
  - Multi-node cluster with Docker Swarm
  - Built-in load balancing and service discovery
  - Rolling updates and health checks
  - Pros: High availability, auto-scaling
  - Cons: More complex setup

- **Option C: Kubernetes** (enterprise)
  - K8s cluster (self-hosted or managed)
  - Helm charts for deployment
  - Horizontal pod autoscaling
  - Pros: Production-grade, industry standard
  - Cons: Steep learning curve, operational overhead

**Recommended**: Docker Compose for Personal mode, Docker Swarm/Kubernetes for Team mode

---

#### Security Implementation Details

**Environment Variables** (.env.example):
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/db

# OAuth (Phase 1: Google + GitHub)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
OAUTH_CALLBACK_URL=https://api.dfir-cortex.com/api/v1/auth/callback

# JWT (Hybrid: 15-min access + 30-day refresh)
JWT_SECRET=generate_random_256_bit_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Gemini API
GEMINI_API_KEY=AIzaxxxxxxxxxx

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=https://dfir-cortex.com

# Logging
LOG_LEVEL=info
```

**Security Headers** (Helmet.js):
```typescript
import helmet from '@fastify/helmet';

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});
```

---

## TRACEABILITY

### Related Documentation

- **Product Vision**: `.moai/project/product.md`
  - Line 218-224: "Phase 2: Production-Ready Foundation (v0.5.0) - Real user authentication (OAuth 2.0), database integration, enhanced RBAC"
  - Section: "Problem Statement #2: Lack of Proper Access Controls"

- **Architecture**: `.moai/project/structure.md`
  - Line 29-50: "Future Architecture Vision (v0.5.0+) - 3-Tier Web Application Architecture"
  - Line 261-266: "PostgreSQL Database Schema (report_versions, users, audit_logs)"

- **Tech Stack**: `.moai/project/tech.md`
  - Line 80-102: "Backend Technology Stack (Planned - v0.5.0) - Node.js, Express, PostgreSQL, Prisma"
  - Line 617-623: "Secured by Default (S) - Immediate Actions (v0.5.0): Move Gemini API to backend, implement real authentication"

### Dependencies

**Upstream (Required Before Implementation)**:
- ✅ SPEC-SECURITY-001: HTML Sanitization (COMPLETED) - Server-side sanitization required
- ✅ SPEC-VERSION-001: Version History (COMPLETED) - Migration strategy builds on localStorage version structure

**Downstream (Blocked by This SPEC)**:
- SPEC-COLLAB-001: Real-time Collaborative Editing (v1.0.0) - Requires backend WebSocket support
- SPEC-ANALYTICS-001: Usage Analytics Dashboard (v1.0.0) - Requires audit log foundation
- SPEC-BACKUP-001: Automated Cloud Backup (v1.0.0) - Requires database persistence

### Quality Gates (TRUST 5)

**Test-First Development (T)**:
- ✅ Unit tests for all services (auth, reports, versions, AI proxy) - 90%+ coverage
- ✅ Integration tests for API endpoints (request/response validation)
- ✅ E2E tests for OAuth flow and localStorage migration
- ✅ Performance tests for API latency benchmarks (k6 or Artillery)

**Readable Code (R)**:
- ✅ Clear module separation (routes, services, middleware)
- ✅ TypeScript interfaces for all data structures (Prisma-generated + custom)
- ✅ JSDoc comments for complex business logic
- ✅ Consistent error handling and logging patterns

**Unified Patterns (U)**:
- ✅ Centralized authentication middleware (single source of truth)
- ✅ Consistent API response format (data, error, pagination)
- ✅ Reusable validation schemas (Zod)
- ✅ Shared sanitization service (backend and frontend parity)

**Secured by Default (S)**:
- ✅ OAuth 2.0 authentication (Google + GitHub, no passwords stored)
- ✅ Hybrid JWT-based sessions (15-min access + 30-day refresh tokens)
- ✅ Server-side HTML sanitization (SPEC-SECURITY-001)
- ✅ Rate limiting on all endpoints (10 AI req/min, 100 req/min global)
- ✅ Monthly AI quota enforcement (100 commands/month per user)
- ✅ Audit logging for compliance (SOC 2, GDPR, HIPAA)
- ✅ HTTPS-only deployment (HSTS headers)

**Trackable Changes (T)**:
- ✅ All commits tagged with SPEC-BACKEND-001
- ✅ Prisma migrations track database schema evolution
- ✅ Audit logs provide forensic trail of all actions
- ✅ API versioning (/v1/) allows backward-compatible changes

---

## RISKS & MITIGATION

### Risk 1: OAuth Provider Outage

**Probability**: Low (Google/GitHub SLAs: 99.9% uptime)
**Impact**: Critical (Users cannot authenticate)

**Mitigation**:
1. **Multiple Providers**: Support Google and GitHub (fallback options)
2. **Grace Period**: Extend existing sessions during provider outages (24-hour extension)
3. **Offline Mode**: Local development supports bypassing OAuth (dev-only flag)
4. **Status Page**: Monitor OAuth provider status (status.cloud.google.com, github.com/status)

---

### Risk 2: Database Migration Failures

**Probability**: Medium (Prisma migrations can fail on schema conflicts)
**Impact**: High (Application downtime, data corruption risk)

**Mitigation**:
1. **Dry Run**: Test migrations on staging database before production
2. **Rollback Strategy**: Prisma supports migration rollback (`prisma migrate resolve --rolled-back`)
3. **Backup Before Migrate**: Automated database snapshot before schema changes
4. **Blue-Green Deployment**: Deploy new version alongside old, switch traffic after validation
5. **Migration Validation**: Post-migration health checks verify data integrity

---

### Risk 3: Performance Degradation Under Load

**Probability**: Medium (First production deployment, unknown usage patterns)
**Impact**: Medium (Slow API responses, poor user experience)

**Mitigation**:
1. **Load Testing**: Pre-launch stress tests with k6 (1,000 concurrent users)
2. **Database Indexing**: Indexes on all query-heavy columns (userId, reportId, timestamp)
3. **Redis Caching**: Cache user sessions (15-min TTL), report lists (60-sec TTL)
4. **Query Optimization**: Prisma query profiling, EXPLAIN ANALYZE for slow queries
5. **Auto-Scaling**: Docker Swarm/Kubernetes auto-scaling based on CPU/memory metrics

---

### Risk 4: localStorage Migration Data Loss

**Probability**: Low (Migration endpoint well-tested, background job with retry)
**Impact**: Critical (Users lose version history)

**Mitigation**:
1. **Non-Destructive**: Migration does NOT clear localStorage automatically (requires user confirmation)
2. **Background Job**: Migration runs as BullMQ job (non-blocking UI, 3 retry attempts)
3. **Job Tracking**: Users can monitor progress via /api/v1/jobs/:jobId/status
4. **Validation**: Backend validates imported data structure before database write
5. **Transactional**: Database transaction ensures all-or-nothing import (rollback on error)
6. **Manual Recovery**: Support team can manually import JSON if migration fails

---

### Risk 5: Gemini API Cost Explosion

**Probability**: Medium (AI usage unpredictable, potential abuse)
**Impact**: High (Unexpected API costs, budget overrun)

**Mitigation**:
1. **Rate Limiting**: 10 AI requests per minute per user (prevents spam)
2. **Monthly Quota**: 100 AI commands per month per user (enforced via Redis)
3. **Cost Monitoring**: Daily budget alerts via cloud provider (e.g., Google Cloud Billing Alerts)
4. **Usage Tracking**: AiUsageLog table records all AI usage with timestamps
5. **Caching**: Cache AI responses for identical commands (reduce API calls)
6. **Fallback**: Disable AI proxy if daily budget exceeded (graceful degradation)

---

## APPROVAL & SIGN-OFF

**Status**: Draft (Finalized, Ready for `/moai:2-run` Implementation)

**Architecture Decisions (FINALIZED)**:
- ✅ **Deployment Platform**: Self-hosted Docker (Compose for dev, Swarm/Kubernetes for prod)
- ✅ **Authentication Strategy**: Hybrid JWT (15-min access + 30-day refresh tokens)
- ✅ **Repository Structure**: Monorepo (`/frontend` + `/backend` + `/shared`)
- ✅ **OAuth Providers**: Google + GitHub (Phase 1)
- ✅ **Background Jobs**: BullMQ for localStorage migration, large diff calculations
- ✅ **Monthly Quota**: 100 AI commands/month per user (Redis enforcement)
- ✅ **Redis Caching**: User sessions (15-min), report lists (60-sec), rate limiting
- ✅ **Database Models**: Session, AiUsageLog added; Audit log partitioning configured
- ✅ **Health Checks**: PostgreSQL, Redis, disk space checks

**Backend-Expert Recommendations Applied**:
- ✅ Job queue (BullMQ) for long operations (localStorage migration, PDF export, large diffs)
- ✅ Monthly quota enforcement (100 AI commands/month, Redis tracking)
- ✅ Audit log partitioning (PostgreSQL native, yearly partitions)
- ✅ Redis caching strategy (sessions, rate limiting, query caching)
- ✅ Health check endpoint (database, Redis, storage)

**Next Steps**:
1. **TDD Implementation**: `/moai:2-run SPEC-BACKEND-001` for RED-GREEN-REFACTOR cycle
2. **Quality Gate Validation**: `/moai:3-sync SPEC-BACKEND-001` for TRUST 5 compliance
3. **Deployment**: Docker Compose setup for development, Docker Swarm/Kubernetes for production

---

**End of SPEC-BACKEND-001**
