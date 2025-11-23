# Project Architecture and Structure

**Document**: Project Structure Documentation
**Version**: 0.2.0
**Last Updated**: 2025-11-23
**Status**: Complete

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Core Modules](#core-modules)
4. [Feature Architecture](#feature-architecture)
5. [Data Flow](#data-flow)
6. [Integration Points](#integration-points)

---

## Project Overview

This project is a forensic report analysis and editing application built with React and TypeScript. It provides:

- **Report Viewing**: Render and preview HTML-based forensic reports
- **AI Enhancement**: Integrate Gemini API for report improvements
- **Version Control**: Track report modifications with comprehensive history
- **Security**: Implement XSS protection and data sanitization
- **Storage**: Manage versions with localStorage quota management

### Technology Stack

- **Frontend Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS for component styling
- **Testing**: Vitest with React Testing Library
- **Sanitization**: DOMPurify for XSS prevention
- **Compression**: lz-string for version storage optimization
- **Virtualization**: react-window for efficient list rendering

---

## Directory Structure

```
dfir-report/
├── src/                           # Root source directory
│   ├── components/                # React components
│   │   ├── Dashboard.tsx           # Main application component
│   │   ├── ReportRenderer.tsx      # Report preview component
│   │   ├── ChatInterface.tsx       # AI chat interface
│   │   ├── VersionTimeline.tsx     # Version list with virtual scroll
│   │   ├── VersionHistoryPanel.tsx # Version sidebar panel
│   │   ├── VersionDiffViewer.tsx   # Diff comparison modal
│   │   ├── ForensicMetadataEditor.tsx # Investigation metadata form
│   │   ├── VersionRestorationModal.tsx # Version restore confirmation
│   │   └── __tests__/              # Component tests
│   ├── services/                  # Business logic services
│   │   ├── sanitizationService.ts  # HTML XSS prevention (SPEC-SECURITY-001)
│   │   ├── versionStorageService.ts # Version persistence layer
│   │   ├── versionUtils.ts         # Version utilities and comparison
│   │   └── __tests__/              # Service unit tests
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAutoSave.ts          # Auto-save state management
│   │   ├── useVersionHistory.ts    # Version history state management
│   │   └── __tests__/              # Hook tests
│   ├── types.ts                    # TypeScript type definitions
│   ├── constants.ts                # Application constants
│   ├── App.tsx                     # Application root
│   └── index.tsx                   # React DOM render entry
├── .moai/                         # MoAI framework documentation
│   ├── specs/                      # SPEC documents
│   │   ├── SPEC-VERSION-001        # Version history requirements
│   │   └── SPEC-SECURITY-001       # Security requirements
│   ├── docs/                       # Technical documentation
│   │   ├── API.md                  # API reference for services and hooks
│   │   ├── SECURITY.md             # Security architecture and threat model
│   │   └── structure.md            # This file
│   ├── reports/                    # Implementation reports
│   │   ├── SPEC-VERSION-001_IMPLEMENTATION_REPORT.md
│   │   └── sync-report-*.md        # Documentation sync reports
│   └── memory/                     # Reference and execution guidelines
├── coverage/                       # Test coverage reports
├── README.md                       # Project overview and features
├── CHANGELOG.md                    # Version history and release notes
├── INTEGRATION_GUIDE.md           # Dashboard integration instructions
├── CLAUDE.md                       # MoAI framework execution rules
├── package.json                    # NPM dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite bundler configuration
├── vitest.config.ts                # Vitest testing configuration
└── vitest.setup.ts                 # Test environment setup

```

---

## Core Modules

### 1. Security Services Module

**Purpose**: Prevent XSS vulnerabilities and secure HTML rendering

**Key Components**:

- **sanitizationService.ts**
  - HTML content filtering using DOMPurify
  - Removes dangerous elements, attributes, and event handlers
  - Detects 30+ OWASP attack patterns
  - Performance: <100ms for documents up to 1MB
  - SPEC: SPEC-SECURITY-001

**Integration Points**:
- ReportRenderer component: Sanitize before iframe rendering
- Dashboard component: Sanitize AI-generated responses
- VersionStorageService: Sanitize before version storage
- VersionRestorationModal: Sanitize before version restoration

**Test Coverage**:
- 51 unit tests for sanitization scenarios
- 38 OWASP XSS cheat sheet validation tests
- Performance benchmarking

---

### 2. Version Storage Module

**Purpose**: Persist report versions with quota management

**Key Components**:

- **versionStorageService.ts**
  - localStorage CRUD operations
  - Automatic HTML sanitization (SPEC-SECURITY-001 integration)
  - Storage quota tracking (5MB default)
  - Automatic pruning of old auto-saves
  - JSON export/import for backup

**Key Methods**:
```
- saveVersion()          // Store version with sanitization
- getAllVersions()       // Retrieve all versions sorted
- getVersionById()       // Get specific version
- deleteVersion()        // Remove version
- getStorageUsage()      // Check quota status
- pruneOldAutoSaves()    // Clean up old versions
- exportVersionsToJSON() // Backup versions
- importVersionsFromJSON() // Restore from backup
```

**Test Coverage**:
- 18 unit tests covering all operations
- Storage quota and pruning scenarios
- Error handling for corrupted data

---

### 3. Version Utilities Module

**Purpose**: Version comparison and analysis

**Key Components**:

- **versionUtils.ts**
  - Version ID generation (UUID v4)
  - Diff calculation (line-by-line comparison)
  - Version sorting and filtering
  - Version comparison and summarization
  - Timestamp formatting (absolute and relative)

**Key Functions**:
```
- generateVersionId()               // Create unique ID
- calculateDiffStats()              // Compare two versions
- sortVersionsByTimestamp()         // Order versions
- filterVersions()                  // Filter by criteria
- compareVersions()                 // Detailed comparison
- getVersionSummary()               // Human-readable summary
- formatVersionTime()               // Absolute time format
- formatVersionTimeRelative()       // Relative time format
```

**Test Coverage**:
- 29 comprehensive tests
- 98.83% code coverage (highest in project)

---

### 4. Auto-Save Hook Module

**Purpose**: Automatic content preservation

**Key Components**:

- **hooks/useAutoSave.ts**
  - Debounced auto-save (default 3s)
  - Interval-based periodic saves (default 30s)
  - Pause/resume functionality
  - Manual save with descriptions
  - User metadata tracking

**Hook API**:
```typescript
useAutoSave(content, options) => {
  isSaving: boolean
  lastAutoSaveTime: number | null
  pauseAutoSave: () => void
  resumeAutoSave: () => void
  isAutoSavePaused: boolean
  manualSave: (description: string) => Promise<void>
}
```

**Debouncing Strategy**:
- Rapid changes (e.g., typing) debounced for 3 seconds
- No save until user pauses editing for 3 seconds
- Prevents excessive version creation
- Interval save (30s) ensures periodic checkpoints

---

### 5. Version History Hook Module

**Purpose**: State management for version operations

**Key Components**:

- **hooks/useVersionHistory.ts**
  - CRUD operations wrapper
  - Version state management
  - Error handling and refresh
  - Version comparison
  - Async operation handling

**Hook API**:
```typescript
useVersionHistory(reportId) => {
  versions: ReportVersion[]
  isLoading: boolean
  error: Error | null
  restoreVersion(versionId): Promise<string>
  deleteVersion(versionId): Promise<void>
  compareVersions(v1Id, v2Id): VersionComparison
  getVersionById(versionId): ReportVersion | null
  getLatestVersion(): ReportVersion | null
  refreshVersions(): Promise<void>
}
```

---

### 6. Version Timeline Component

**Purpose**: Efficient UI for browsing version history

**Key Components**:

- **components/VersionTimeline.tsx**
  - Virtual scrolling with react-window
  - Handles 1000+ versions efficiently
  - Version selection and actions
  - Loading and empty states

- **components/VersionHistoryPanel.tsx**
  - Collapsible sidebar container
  - Version count badge
  - Export functionality
  - Delete confirmation modal

---

### 7. Comparison and Restoration Modules

**Purpose**: Version comparison and restoration UI

**Key Components**:

- **components/VersionDiffViewer.tsx**
  - Side-by-side HTML diff viewer
  - Color-coded changes (green=add, red=delete)
  - Line-by-line statistics
  - Modal dialog interface

- **components/VersionRestorationModal.tsx**
  - Restoration confirmation workflow
  - Change summary display
  - Description input
  - Automatic sanitization
  - Loading states

- **components/ForensicMetadataEditor.tsx**
  - Investigation context form
  - Case ID, incident type, phase tracking
  - Priority assignment
  - Evidence tags
  - Analyst assignment

---

## Feature Architecture

### Version History Feature (SPEC-VERSION-001)

```
┌─────────────────────────────────────────────────┐
│           Application (Dashboard)               │
└────────┬────────────────────────────────────────┘
         │
         ├─→ useAutoSave Hook
         │   └─→ versionStorageService.saveVersion()
         │       └─→ sanitizeHtml() [SPEC-SECURITY-001]
         │
         └─→ useVersionHistory Hook
             ├─→ versionStorageService.getAllVersions()
             ├─→ versionStorageService.getVersionById()
             ├─→ versionStorageService.deleteVersion()
             └─→ versionUtils functions
                 ├─→ calculateDiffStats()
                 ├─→ compareVersions()
                 └─→ formatVersionTime()

┌──────────────────────────────────────┐
│     Version Timeline Components       │
├──────────────────────────────────────┤
│ - VersionTimeline (virtual scroll)   │
│ - VersionHistoryPanel (sidebar)      │
│ - VersionDiffViewer (comparison)     │
│ - ForensicMetadataEditor (form)      │
│ - VersionRestorationModal (workflow) │
└──────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────┐
│   localStorage (5MB quota)            │
│                                       │
│ Version data (auto-sanitized)        │
│ Forensic metadata                    │
│ User tracking information             │
└──────────────────────────────────────┘
```

### Security Architecture (SPEC-SECURITY-001)

```
┌─────────────────────────────────────────┐
│        User Input / AI Response         │
└────────┬────────────────────────────────┘
         │
         ↓ Sanitization Layer
┌─────────────────────────────────────────┐
│  sanitizeHtml() [DOMPurify]              │
│  - Remove scripts                       │
│  - Remove event handlers                │
│  - Block dangerous URLs                 │
│  - OWASP compliant patterns             │
└────────┬────────────────────────────────┘
         │
         ↓ Storage Layer
┌─────────────────────────────────────────┐
│  versionStorageService                  │
│  - localStorage persistence             │
│  - Quota management                     │
│  - Compression (lz-string)              │
└────────┬────────────────────────────────┘
         │
         ↓ Rendering Layer
┌─────────────────────────────────────────┐
│  ReportRenderer / VersionDiffViewer     │
│  - iframe sandbox attribute             │
│  - CSP headers (planned)                │
└─────────────────────────────────────────┘
```

---

## Data Flow

### Creating and Saving a Version

```
1. User edits report content
         ↓
2. Content change triggers useAutoSave hook
         ↓
3. Debounce timer (3s) waits for editing pause
         ↓
4. generateVersionId() creates unique ID
         ↓
5. sanitizeHtml() sanitizes content [SPEC-SECURITY-001]
         ↓
6. versionStorageService.saveVersion()
    - Stores to localStorage
    - Checks quota (5MB)
    - Compresses with lz-string
         ↓
7. ReportVersion object created and persisted
```

### Viewing Version History

```
1. User clicks "History" button
         ↓
2. useVersionHistory hook loads versions
         ↓
3. versionStorageService.getAllVersions()
         ↓
4. sortVersionsByTimestamp() orders versions
         ↓
5. VersionTimeline renders with react-window
    - Virtualization for performance
    - Only visible items rendered
         ↓
6. User selects version
         ↓
7. calculateDiffStats() compares versions
```

### Restoring a Version

```
1. User selects "Restore" action
         ↓
2. VersionRestorationModal shows confirmation
         ↓
3. calculateDiffStats() shows change preview
         ↓
4. User confirms restoration
         ↓
5. Current version saved as backup
         ↓
6. sanitizeHtml() sanitizes restored version
         ↓
7. Content restored to editor
         ↓
8. New auto-save cycle begins
```

---

## Integration Points

### With Security (SPEC-SECURITY-001)

- All HTML content sanitized before storage
- Restored versions sanitized before display
- DOMPurify configuration whitelist-based
- OWASP patterns validated in tests

### With React Components

- Dashboard integrates useAutoSave and useVersionHistory
- ReportRenderer sanitizes before rendering
- VersionHistoryPanel integrates timeline components
- Modals handle restoration workflow

### With Storage

- localStorage quota: 5MB per domain
- Automatic pruning when quota approaches 90%
- Compression reduces storage by 60-80%
- Export/import for backup

### With User Interface

- Virtual scrolling for performance (1000+ versions)
- Debounced auto-save prevents UI lag
- Collapsible sidebar for space efficiency
- Modal dialogs for important operations

---

## Type Definitions

### ReportVersion

```typescript
interface ReportVersion {
  versionId: string;              // UUID v4 unique ID
  reportId: string;               // Report identifier
  htmlContent: string;            // HTML content (sanitized)
  versionNumber: number;          // Sequential counter
  createdAt: number;              // Unix timestamp (ms)
  modifiedAt: number;             // Last modification time
  description?: string;           // User or auto-generated
  isAutoSave: boolean;            // true=auto, false=manual
  createdBy: {
    userId: string;
    username: string;
    role: string;
  };
  forensicContext?: ForensicContext;
}
```

### ForensicContext

```typescript
interface ForensicContext {
  caseId: string;
  incidentType: 'malware' | 'breach' | 'insider' | 'other';
  investigationPhase: 'initial' | 'analysis' | 'containment' | 'recovery';
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  assignedAnalyst: string;
  evidenceTags: string[];
  notes: string;
}
```

### DiffStats

```typescript
interface DiffStats {
  additions: number;              // Lines added
  deletions: number;              // Lines removed
  modifications: number;          // Lines changed
  totalChanges: number;           // Total modified lines
}
```

---

## Performance Characteristics

### Storage

- **Quota**: 5MB per localStorage domain
- **Compression**: lz-string reduces 1MB by 60-80%
- **Per-version Size**: Typically 10-500KB (compressed)
- **Maximum Versions**: ~500 with default quota

### Rendering

- **Virtual Scrolling**: P95 <100ms for timeline rendering
- **Timeline Items**: Only visible items rendered (react-window)
- **Diff Computation**: <50ms for typical diffs
- **Sanitization**: <100ms for documents up to 1MB

### Auto-Save

- **Debounce Delay**: 3 seconds (configurable)
- **Interval Save**: 30 seconds (configurable)
- **Throughput**: Multiple saves per minute
- **No UI Blocking**: Async operations

---

## Quality Metrics

### Test Coverage

- **Total Tests**: 271
- **Pass Rate**: 100%
- **Service Coverage**: 76-99%
- **Component Coverage**: 100% (structural)

### TRUST 5 Compliance

- ✅ **Test-First**: TDD with comprehensive test suite
- ✅ **Readable**: Clear naming and documentation
- ✅ **Unified**: Consistent patterns throughout
- ✅ **Secured**: OWASP best practices applied
- ✅ **Trackable**: Git commit tagging with SPEC IDs

---

## Future Enhancements

1. **Version Tagging**: User-defined tags for important versions
2. **Version Comments**: Inline comments on specific changes
3. **Collaborative Versioning**: Track multiple users' changes
4. **Version Branching**: Create branches from specific versions
5. **Incremental Backup**: Export only changes since last backup
6. **Server Sync**: Sync versions with backend storage
7. **Conflict Resolution**: Merge changes from multiple users

---

**Document Status**: ✅ COMPLETE
**Last Updated**: 2025-11-23
**Related SPECs**: SPEC-VERSION-001, SPEC-SECURITY-001
**Architecture Version**: 0.2.0
