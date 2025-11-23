# SPEC-VERSION-001: Report Version History and Management System

**TAG**: `SPEC-VERSION-001`
**Status**: Draft
**Created**: 2025-11-22
**Owner**: @user
**Project**: dfir-report
**Priority**: HIGH (Core Feature)

---

## TAG BLOCK

```yaml
tag_id: SPEC-VERSION-001
domain: VERSION
subdomain: HISTORY_MANAGEMENT
version: 1.0.0
status: draft
created_at: 2025-11-22
updated_at: 2025-11-22
owner: @user
project: dfir-report
dependencies:
  - SPEC-SECURITY-001  # HTML sanitization required for stored versions
```

---

## OVERVIEW

### Purpose

Implement a comprehensive version history and management system for DFIR reports using localStorage persistence, enabling analysts to track report evolution, compare changes, and restore previous versions with forensic-grade metadata tracking.

### Background

**Current State**:
- Reports exist only in-memory (lost on page refresh)
- No version tracking or change history
- No ability to compare report versions
- Missing forensic context (case ID, incident type, investigation phase)
- No auto-save functionality (data loss risk during long editing sessions)

**User Impact**:
- Analysts lose hours of work from accidental browser closes
- No audit trail for report modifications (compliance risk)
- Unable to recover from incorrect AI modifications
- Difficult to track investigation progress over time
- Missing context linkage between reports and cases

### Goals

1. **Primary**: Implement localStorage-based version persistence with auto-save (30s interval)
2. **Secondary**: Provide visual timeline interface for version navigation and comparison
3. **Tertiary**: Track comprehensive forensic metadata (case ID, incident type, evidence tags, investigation phase)

---

## ENVIRONMENT

### WHEN the application manages report versions

**Trigger Events**:
- User completes AI-powered report modification (manual save trigger)
- Auto-save timer expires (30-second intervals during active editing)
- User explicitly requests version save via "Save Version" action
- User browses version history timeline
- User initiates version comparison between any two versions
- User restores a previous version
- User adds forensic metadata to current report (case ID, incident type, etc.)

**Context**:
- React 19.2.0 SPA with TypeScript 5.8.2
- Client-side only architecture (no backend yet)
- localStorage browser API (5-10MB quota limit)
- Existing components: Dashboard, ReportRenderer, ChatInterface
- Existing security: HTML sanitization (SPEC-SECURITY-001)
- Existing services: geminiService, sanitizationService

**Preconditions**:
- User authenticated with valid session
- localStorage available in browser (not disabled)
- Report HTML content exists (INITIAL_REPORT_HTML or user-modified)
- Sanitization service operational (SPEC-SECURITY-001)

---

## ASSUMPTIONS

### Technology Assumptions

1. **localStorage Availability**:
   - Browser supports localStorage API (all modern browsers since 2010)
   - User has not disabled localStorage via browser settings
   - Incognito/private mode may have reduced quota but still functional
   - localStorage quota is minimum 5MB (typically 5-10MB across browsers)

2. **Performance Characteristics**:
   - localStorage synchronous read/write acceptable for <1MB data chunks
   - JSON serialization/deserialization overhead minimal for version metadata
   - Auto-save 30s interval balances data protection and performance
   - Diff algorithm performance acceptable for reports up to 1MB HTML

3. **Client-Side Diff Library**:
   - Production-stable diff libraries available (react-diff-viewer-continued 3.x, diff 5.x)
   - TypeScript type definitions available
   - Performance suitable for real-time comparison rendering
   - License compatible with MIT-licensed project

### User Behavior Assumptions

1. **Version Management Patterns**:
   - Analysts work on reports for 30+ minutes (justifies auto-save)
   - Typical report has 10-50 versions over investigation lifecycle
   - Users compare recent versions (last 5-10) more frequently than historical
   - Version restoration is intentional (requires confirmation)

2. **Forensic Metadata Usage**:
   - Case ID follows organizational format (e.g., "INC-2025-001", "CASE-12345")
   - Incident types from predefined taxonomy (Malware, Phishing, Data Breach, etc.)
   - Evidence tags are free-form but case-specific (e.g., "ransomware-sample", "email-headers")
   - Investigation phases follow standard workflow (Triage, Analysis, Reporting, Closed)

3. **Storage Constraints**:
   - Users accept localStorage 5-10MB limit (approximately 50-100 versions per report)
   - Old versions can be pruned when quota exceeded (FIFO or manual)
   - Export/backup to JSON file acceptable workaround for long-term archival

---

## REQUIREMENTS

### Functional Requirements

#### FR-1: Version Data Model

**WHEN** the system stores a report version,
**IF** the version contains all required metadata,
**THEN** the system **SHALL** persist a version record with the following structure:

```typescript
interface ReportVersion {
  // Core Version Identity
  id: string;                      // UUID v4
  reportId: string;                // Parent report UUID
  versionNumber: number;           // Sequential: 1, 2, 3...
  timestamp: number;               // Unix epoch milliseconds

  // Content
  htmlContent: string;             // Full report HTML (sanitized)
  changeDescription: string;       // User or auto-generated summary (max 500 chars)

  // User Context
  createdBy: {
    userId: string;                // From currentUser.id
    username: string;              // From currentUser.username
    role: string;                  // From currentUser.role
  };

  // Forensic Metadata (Optional - Analyst-provided)
  forensicContext?: {
    caseId?: string;               // e.g., "INC-2025-001"
    incidentType?: string;         // e.g., "Malware Analysis"
    evidenceTags?: string[];       // e.g., ["ransomware", "lateral-movement"]
    investigationPhase?: string;   // e.g., "Analysis", "Reporting"
    priority?: 'low' | 'medium' | 'high' | 'critical';
    assignedTo?: string;           // Analyst username
    notes?: string;                // Free-form notes (max 1000 chars)
  };

  // Auto-save Tracking
  isAutoSave: boolean;             // True if auto-saved, false if manual

  // Comparison Metadata
  diffStats?: {
    additions: number;             // Lines added vs. previous version
    deletions: number;             // Lines deleted vs. previous version
    modifications: number;         // Lines changed
  };
}
```

**Acceptance Criteria**:
- All required fields must be present (id, reportId, versionNumber, timestamp, htmlContent, createdBy, isAutoSave)
- Optional forensicContext fields validated when provided (non-empty strings, valid enum values)
- htmlContent sanitized via SPEC-SECURITY-001 before storage
- Version size estimated before save (warn if approaching localStorage quota)

---

#### FR-2: localStorage Persistence Service

**WHEN** the system saves or retrieves versions,
**IF** localStorage is available,
**THEN** the system **SHALL** provide a `VersionStorageService` with the following operations:

**Service Interface** (`services/versionStorageService.ts`):
```typescript
class VersionStorageService {
  // Write Operations
  saveVersion(version: ReportVersion): Promise<void>;
  updateForensicMetadata(versionId: string, metadata: Partial<ForensicContext>): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
  deleteOldestVersions(count: number): Promise<void>;  // Quota management

  // Read Operations
  getVersion(versionId: string): Promise<ReportVersion | null>;
  getAllVersions(reportId: string): Promise<ReportVersion[]>;
  getLatestVersion(reportId: string): Promise<ReportVersion | null>;
  getVersionByNumber(reportId: string, versionNumber: number): Promise<ReportVersion | null>;

  // Utility
  getStorageUsage(): { used: number, available: number, percentage: number };
  exportVersionsToJSON(reportId: string): Promise<string>;
  importVersionsFromJSON(jsonData: string): Promise<number>;  // Returns imported count
}
```

**Storage Strategy**:
- Key format: `dfir-cortex:versions:{reportId}` → Array<ReportVersion>
- Metadata key: `dfir-cortex:metadata:{reportId}` → Report-level metadata
- Settings key: `dfir-cortex:settings:version-config` → User preferences
- Quota monitoring: Track storage before each write operation
- Error handling: Graceful fallback if localStorage quota exceeded

**Acceptance Criteria**:
- All methods handle localStorage errors gracefully (try-catch with user notifications)
- Quota exceeded triggers automatic oldest-version pruning or user prompt
- Data corruption detected via JSON parsing errors (fallback to empty array)
- Export/import maintains version integrity (validate on import)

---

#### FR-3: Auto-Save Functionality

**WHEN** the user actively edits a report,
**IF** 30 seconds have elapsed since the last save,
**THEN** the system **SHALL** automatically save the current report state as a new version.

**Implementation Requirements**:
- Debounced timer: Reset on each user modification (AI command, manual edit)
- Auto-save triggered only if content changed since last version
- Visual indicator: "Auto-saving..." toast notification (3s duration)
- Non-blocking: Auto-save runs asynchronously without freezing UI
- Pause auto-save during active typing/AI processing
- Configurable interval via settings (default: 30s, range: 15s-120s)

**Auto-Save Version Metadata**:
- `isAutoSave: true`
- `changeDescription: "Auto-saved at [HH:mm:ss]"`
- Forensic metadata inherited from last manual save

**Acceptance Criteria**:
- Auto-save does not interrupt user workflows (no modal dialogs)
- Timer resets properly on content changes
- Auto-save skipped if content identical to last version (deep equality check)
- User can disable auto-save via settings (default: enabled)
- Clear visual feedback when auto-save occurs

---

#### FR-4: Version Timeline UI Component

**WHEN** the user opens the version history panel,
**IF** versions exist for the current report,
**THEN** the system **SHALL** display a visual timeline with the following features:

**Timeline Component** (`components/VersionTimeline.tsx`):
- **Layout**: Vertical timeline with chronological ordering (newest at top)
- **Version Cards**: Each version displayed as card with:
  - Version number (#1, #2, #3...)
  - Timestamp (relative: "2 hours ago", absolute: "2025-11-22 14:30:15")
  - User avatar/name (who created version)
  - Change description (truncated to 100 chars with "Read more...")
  - Forensic metadata badges (case ID, incident type, phase)
  - Auto-save indicator (🔄 icon if isAutoSave=true)
  - Diff stats preview (e.g., "+15 / -3 lines")
- **Actions per Version**:
  - "View" button → Navigate to version detail view
  - "Compare" button → Add to comparison queue
  - "Restore" button → Restore this version (with confirmation)
  - "Export" button → Download version as HTML/JSON
  - "Delete" button → Remove version (with confirmation)
- **Filtering Controls**:
  - Filter by date range (last 24h, 7 days, 30 days, all)
  - Filter by user (show only my versions)
  - Filter by auto-save vs. manual
  - Search by change description or case ID
- **Performance Optimization**:
  - Virtual scrolling for 100+ versions (react-window library)
  - Lazy load version content (load HTML only when expanded)

**Acceptance Criteria**:
- Timeline renders within 500ms for 50 versions
- Scroll performance smooth (60fps) with virtual scrolling
- Responsive design (mobile-friendly with stacked cards)
- Keyboard navigation supported (Tab, Enter, Escape)
- Loading states for async operations (skeleton screens)

---

#### FR-5: Version Comparison (Diff View)

**WHEN** the user selects two versions for comparison,
**IF** both versions exist,
**THEN** the system **SHALL** display a side-by-side diff view with the following:

**Diff View Component** (`components/VersionDiff.tsx`):
- **Layout**: Split-pane with left (old version) and right (new version)
- **Diff Rendering**:
  - Line-by-line comparison with syntax highlighting
  - Color coding: Green (+) for additions, Red (-) for deletions, Yellow (~) for modifications
  - Unified diff option (GitHub-style single pane)
  - HTML preview mode (rendered side-by-side iframes)
- **Diff Library Integration**:
  - Use `diff` library (5.x) for diff algorithm
  - Use `react-diff-viewer-continued` (3.x) for UI rendering
  - Fallback to custom diff if libraries unavailable
- **Navigation Controls**:
  - Jump to next/previous change
  - Expand/collapse unchanged sections
  - Search within diff
- **Metadata Comparison**:
  - Show forensic metadata changes (case ID updated, tags added, etc.)
  - Highlight timestamp, user, and version number differences
- **Export Options**:
  - Export diff as HTML report
  - Copy diff to clipboard (plain text)

**Acceptance Criteria**:
- Diff calculation completes within 2 seconds for 1MB HTML
- Rendering supports reports up to 10,000 lines
- Color coding accessible (WCAG AA contrast ratios)
- Mobile-responsive (stacked view on small screens)
- Keyboard shortcuts (N: next change, P: previous change, Esc: close)

---

#### FR-6: Version Restoration

**WHEN** the user restores a previous version,
**IF** the user confirms the restoration action,
**THEN** the system **SHALL**:
1. Create a new version capturing the current state (before restoration)
2. Load the selected version's HTML content into the active report
3. Set forensic metadata to match the restored version
4. Display confirmation toast: "Restored to Version #X"
5. Update version timeline to show new version with description: "Restored from Version #X"

**Restoration Workflow**:
- User clicks "Restore" on version card
- Confirmation modal:
  ```
  Restore to Version #5?

  This will:
  - Save your current work as a new version
  - Load Version #5 content into the editor
  - Preserve all version history

  [Cancel] [Restore Version]
  ```
- On confirm:
  - Save current state as auto-save version
  - Load restored version content (sanitized)
  - Scroll to top of report
  - Update forensic metadata form

**Acceptance Criteria**:
- Current state always saved before restoration (no data loss)
- Restoration is instant (<500ms for 1MB HTML)
- Version history updated immediately with restoration event
- User can undo restoration via version history (restore previous version)
- Forensic metadata correctly transferred to restored state

---

#### FR-7: Forensic Metadata Management

**WHEN** the user edits forensic metadata,
**IF** the metadata fields are valid,
**THEN** the system **SHALL** provide a metadata editor with the following:

**Metadata Editor Component** (`components/ForensicMetadataEditor.tsx`):
- **Form Fields**:
  - Case ID (text input, max 50 chars, format validation via regex)
  - Incident Type (dropdown: Malware, Phishing, Data Breach, Insider Threat, DDoS, Ransomware, APT, Other)
  - Evidence Tags (multi-select chips, autocomplete from previous tags)
  - Investigation Phase (dropdown: Triage, Containment, Analysis, Reporting, Closed)
  - Priority (radio buttons: Low, Medium, High, Critical)
  - Assigned To (dropdown: list of team members from MOCK_USERS)
  - Notes (textarea, max 1000 chars, markdown support)
- **Validation**:
  - Case ID format: Alphanumeric + hyphens only (e.g., "INC-2025-001", "CASE-12345")
  - Evidence tags: Max 10 tags, each max 30 chars
  - Required fields: None (all optional for flexibility)
- **Persistence**:
  - Save to current version's `forensicContext`
  - Auto-save metadata changes after 3s debounce
  - Display "Saved" indicator on successful update
- **UI Integration**:
  - Collapsible panel in Dashboard (default: collapsed)
  - Inline editing in version timeline cards
  - Bulk edit mode for applying metadata to multiple versions

**Acceptance Criteria**:
- Metadata validation prevents invalid formats (real-time error messages)
- Autocomplete suggests previous tags (localStorage cache)
- Form state persists across page refreshes (draft mode)
- Changes reflected immediately in version timeline
- Markdown rendering in notes field (preview mode)

---

### Non-Functional Requirements

#### NFR-1: Storage Efficiency

**WHEN** the system stores versions,
**IF** storage quota is limited,
**THEN** the system **SHALL** optimize storage usage:

- **Compression**: gzip HTML content before localStorage (LZ-string library)
- **Delta Storage**: Store diffs instead of full HTML for incremental versions (configurable)
- **Quota Monitoring**: Display storage usage in settings (e.g., "4.2 MB / 10 MB used (42%)")
- **Automatic Pruning**: When quota >90%, prompt user to delete old versions or enable auto-pruning
- **Efficient Serialization**: Use JSON.stringify with no pretty-printing (minimize whitespace)

**Target Metrics**:
- 50-100 versions per report within 5MB quota
- Compression reduces storage by 60-80% for typical HTML
- Quota check overhead <10ms per save operation

---

#### NFR-2: Performance Benchmarks

**WHEN** the system performs version operations,
**IF** the performance target is met,
**THEN** the system **SHALL** achieve:

| Operation | Target Latency (P95) | Measurement Method |
|-----------|---------------------|-------------------|
| Save version to localStorage | <100ms | console.time/timeEnd |
| Load version timeline (50 versions) | <500ms | React Profiler |
| Render diff view (1MB HTML) | <2000ms | Diff calculation + render time |
| Auto-save trigger | <50ms | Timer precision check |
| Restore version | <500ms | Load + sanitize + render |
| Export to JSON | <1000ms | Serialization time |

**Optimization Strategies**:
- Memoize diff calculations (React useMemo)
- Debounce metadata updates (3s)
- Lazy load version HTML content (load on demand)
- Web Worker for diff algorithm (future enhancement)

---

#### NFR-3: Data Integrity

**WHEN** the system persists or retrieves versions,
**IF** data corruption is detected,
**THEN** the system **SHALL**:

- Validate JSON structure on retrieval (try-catch with error logging)
- Sanitize HTML content via SPEC-SECURITY-001 before rendering
- Maintain backup copy in separate localStorage key (emergency recovery)
- Log corruption events to console (for debugging)
- Display user-friendly error message with recovery options:
  ```
  Version data corrupted. Options:
  - Restore from backup
  - Export remaining versions
  - Clear corrupted data and start fresh
  ```

**Data Validation Checks**:
- Required fields present (id, reportId, versionNumber, timestamp, htmlContent)
- Timestamp is valid Unix epoch (positive integer)
- versionNumber is sequential (no gaps)
- htmlContent is non-empty string

---

#### NFR-4: Accessibility (WCAG 2.1 AA)

**WHEN** users interact with version history features,
**IF** accessibility standards are enforced,
**THEN** the system **SHALL**:

- Provide keyboard navigation for all interactive elements (Tab, Enter, Escape)
- Use semantic HTML (nav, article, section, button)
- Add ARIA labels for screen readers (e.g., "Version 5, created by John Doe, 2 hours ago")
- Ensure color contrast ratios meet WCAG AA (4.5:1 for text)
- Support screen reader announcements for auto-save, version restoration
- Provide focus indicators for keyboard users
- Test with NVDA/JAWS screen readers

---

## SPECIFICATIONS

### Technical Design

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard Component                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Report Content (htmlContent state)                    │ │
│  │  - Auto-save timer (30s interval)                      │ │
│  │  - Forensic metadata state                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────┬───────────────────────────────┬───────────────────────┘
      │                               │
      │ (Save/Load)                   │ (Render)
      ▼                               ▼
┌──────────────────────┐      ┌────────────────────────────┐
│ VersionStorageService│      │   Version UI Components    │
│  (localStorage API)  │      │  - VersionTimeline.tsx     │
│  - saveVersion()     │      │  - VersionDiff.tsx         │
│  - getAllVersions()  │      │  - ForensicMetadataEditor  │
│  - getStorageUsage() │      │  - VersionCard.tsx         │
└──────┬───────────────┘      └────────────────────────────┘
       │                               │
       │ (Diff calculation)            │ (Rendering)
       ▼                               ▼
┌──────────────────────┐      ┌────────────────────────────┐
│  Diff Library (5.x)  │      │   Sanitization Service     │
│  - diffLines()       │      │   (SPEC-SECURITY-001)      │
│  - diffWords()       │      │   - sanitizeHtml()         │
└──────────────────────┘      └────────────────────────────┘
       │
       │ (UI Rendering)
       ▼
┌──────────────────────┐
│ react-diff-viewer    │
│ (3.x)                │
│ - Side-by-side view  │
│ - Syntax highlighting│
└──────────────────────┘
```

#### Component Hierarchy

```
Dashboard.tsx (Modified)
├── ForensicMetadataEditor.tsx (NEW)
│   ├── Input fields for case ID, incident type, etc.
│   └── Auto-save debounced updates
├── ReportRenderer.tsx (Existing)
│   └── Renders current version HTML
├── ChatInterface.tsx (Existing)
│   └── AI commands trigger version saves
└── VersionHistoryPanel.tsx (NEW - Collapsible Side Panel)
    ├── VersionTimeline.tsx (NEW)
    │   ├── VersionCard.tsx (NEW)
    │   │   ├── Metadata display
    │   │   ├── Action buttons (View, Compare, Restore, Delete)
    │   │   └── Diff stats preview
    │   └── Virtual scrolling (react-window)
    └── VersionDiff.tsx (NEW - Modal/Full-screen)
        ├── Diff rendering (react-diff-viewer-continued)
        ├── Side-by-side layout
        └── Metadata comparison
```

#### Data Flow

**Save Version Flow**:
```
1. User triggers save (AI command complete, manual save button, auto-save timer)
   ↓
2. Dashboard collects current state:
   - htmlContent (sanitized via SPEC-SECURITY-001)
   - currentUser (userId, username, role)
   - forensicContext (from metadata editor)
   - changeDescription (auto-generated or user-provided)
   ↓
3. Create ReportVersion object:
   - Generate UUID for version.id
   - Increment versionNumber
   - Set timestamp (Date.now())
   - Set isAutoSave flag
   ↓
4. VersionStorageService.saveVersion(version):
   - Check localStorage quota
   - Serialize to JSON
   - Save to localStorage key
   - Update in-memory cache
   ↓
5. Update UI:
   - Refresh version timeline
   - Display "Saved" toast notification
   - Reset auto-save timer
```

**Load Version Flow**:
```
1. Component mount → VersionStorageService.getAllVersions(reportId)
   ↓
2. Retrieve from localStorage (key: dfir-cortex:versions:{reportId})
   ↓
3. Parse JSON → Array<ReportVersion>
   ↓
4. Sort by timestamp (descending)
   ↓
5. Render VersionTimeline with version cards
   ↓
6. User selects version → Load htmlContent → Sanitize → Render in ReportRenderer
```

**Diff Comparison Flow**:
```
1. User selects two versions (versionA, versionB)
   ↓
2. Load both versions' htmlContent from localStorage
   ↓
3. Diff library calculates differences:
   - diffLines(versionA.htmlContent, versionB.htmlContent)
   ↓
4. react-diff-viewer renders:
   - Old version (left pane)
   - New version (right pane)
   - Highlighted changes (additions, deletions, modifications)
   ↓
5. Calculate diff stats:
   - Count additions, deletions, modifications
   - Store in versionB.diffStats
```

---

#### Service Implementation

**VersionStorageService** (`services/versionStorageService.ts`):

```typescript
import { ReportVersion, ForensicContext } from '../types';

const STORAGE_PREFIX = 'dfir-cortex:versions:';
const QUOTA_WARNING_THRESHOLD = 0.9; // 90%

export class VersionStorageService {
  /**
   * Save a new version to localStorage
   * @throws QuotaExceededError if storage limit reached
   */
  async saveVersion(version: ReportVersion): Promise<void> {
    try {
      // Validate version structure
      this.validateVersion(version);

      // Check quota before save
      const usage = this.getStorageUsage();
      if (usage.percentage > QUOTA_WARNING_THRESHOLD) {
        console.warn('[VersionStorage] Approaching quota limit:', usage);
        // Trigger auto-pruning or user prompt
        this.handleQuotaWarning();
      }

      // Load existing versions
      const versions = await this.getAllVersions(version.reportId);

      // Add new version (sorted by timestamp descending)
      versions.push(version);
      versions.sort((a, b) => b.timestamp - a.timestamp);

      // Serialize and save
      const key = `${STORAGE_PREFIX}${version.reportId}`;
      localStorage.setItem(key, JSON.stringify(versions));

      console.log(`[VersionStorage] Saved version #${version.versionNumber}`);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete old versions.');
      }
      throw error;
    }
  }

  /**
   * Retrieve all versions for a report
   */
  async getAllVersions(reportId: string): Promise<ReportVersion[]> {
    try {
      const key = `${STORAGE_PREFIX}${reportId}`;
      const data = localStorage.getItem(key);

      if (!data) return [];

      const versions: ReportVersion[] = JSON.parse(data);

      // Validate and sanitize each version
      return versions.map(v => this.sanitizeVersion(v));
    } catch (error) {
      console.error('[VersionStorage] Failed to load versions:', error);
      return []; // Graceful fallback
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageUsage(): { used: number, available: number, percentage: number } {
    let used = 0;
    for (let key in localStorage) {
      if (key.startsWith('dfir-cortex:')) {
        used += localStorage.getItem(key)?.length || 0;
      }
    }

    // Estimate available (5MB typical minimum)
    const available = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = (used / available) * 100;

    return { used, available, percentage };
  }

  /**
   * Export versions to JSON file
   */
  async exportVersionsToJSON(reportId: string): Promise<string> {
    const versions = await this.getAllVersions(reportId);
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      reportId,
      versionCount: versions.length,
      versions
    }, null, 2);
  }

  // Private helper methods
  private validateVersion(version: ReportVersion): void {
    if (!version.id || !version.reportId || !version.htmlContent) {
      throw new Error('Invalid version: missing required fields');
    }
  }

  private sanitizeVersion(version: ReportVersion): ReportVersion {
    // Ensure required fields exist with defaults
    return {
      ...version,
      changeDescription: version.changeDescription || 'No description',
      isAutoSave: version.isAutoSave ?? false,
      diffStats: version.diffStats || { additions: 0, deletions: 0, modifications: 0 }
    };
  }

  private handleQuotaWarning(): void {
    // Future: Implement auto-pruning or user prompt modal
    console.warn('[VersionStorage] Storage quota warning - consider pruning old versions');
  }
}

// Singleton instance
export const versionStorage = new VersionStorageService();
```

---

#### Auto-Save Implementation

**Dashboard.tsx** (Modified):

```typescript
import { useEffect, useRef, useState } from 'react';
import { versionStorage } from '../services/versionStorageService';
import { sanitizeHtml } from '../services/sanitizationService';
import { ReportVersion } from '../types';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function Dashboard() {
  const [htmlContent, setHtmlContent] = useState<string>(INITIAL_REPORT_HTML);
  const [currentVersion, setCurrentVersion] = useState<ReportVersion | null>(null);
  const [forensicMetadata, setForensicMetadata] = useState<ForensicContext>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(htmlContent);

  // Auto-save effect
  useEffect(() => {
    // Reset timer on content change
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // Only save if content changed
      if (htmlContent !== lastSavedContentRef.current) {
        handleAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [htmlContent]);

  const handleAutoSave = async () => {
    try {
      const sanitizedHtml = sanitizeHtml(htmlContent);

      const newVersion: ReportVersion = {
        id: crypto.randomUUID(),
        reportId: 'default-report', // Future: Multiple reports support
        versionNumber: (currentVersion?.versionNumber || 0) + 1,
        timestamp: Date.now(),
        htmlContent: sanitizedHtml,
        changeDescription: `Auto-saved at ${new Date().toLocaleTimeString()}`,
        createdBy: {
          userId: currentUser.id,
          username: currentUser.username,
          role: currentUser.role
        },
        forensicContext: forensicMetadata,
        isAutoSave: true
      };

      await versionStorage.saveVersion(newVersion);
      setCurrentVersion(newVersion);
      lastSavedContentRef.current = htmlContent;

      // Show toast notification
      showToast('Auto-saved successfully', 'success');
    } catch (error) {
      console.error('[AutoSave] Failed:', error);
      showToast('Auto-save failed', 'error');
    }
  };

  // Manual save handler
  const handleManualSave = async (description: string) => {
    // Similar to handleAutoSave but with isAutoSave: false
    // and user-provided changeDescription
  };

  return (
    <div className="dashboard">
      <ForensicMetadataEditor
        metadata={forensicMetadata}
        onChange={setForensicMetadata}
      />
      <ReportRenderer htmlContent={htmlContent} />
      <ChatInterface onReportUpdate={setHtmlContent} />
      <VersionHistoryPanel
        reportId="default-report"
        onVersionRestore={(version) => setHtmlContent(version.htmlContent)}
      />
    </div>
  );
}
```

---

### Security Considerations

#### HTML Sanitization (SPEC-SECURITY-001 Integration)

**WHEN** versions are loaded from localStorage,
**IF** the HTML content may contain malicious code,
**THEN** the system **SHALL** sanitize all HTML before rendering:

- Apply `sanitizeHtml()` from SPEC-SECURITY-001 to all version content
- Sanitize on save (before localStorage write)
- Sanitize on load (before rendering in ReportRenderer or VersionDiff)
- Log sanitization events for security audit trail

**Defense-in-Depth**:
1. Input sanitization (save time)
2. Output sanitization (load time)
3. Iframe sandbox (ReportRenderer existing protection)
4. CSP headers (SPEC-SECURITY-002 planned)

---

#### localStorage Security

**WHEN** sensitive forensic data is stored in localStorage,
**IF** the browser is shared or compromised,
**THEN** the system **SHALL**:

- **Warning**: Display notice that localStorage is not encrypted (client-side only)
- **Limitation**: Do not store PII or classified data in forensic metadata
- **Recommendation**: Use private browsing for sensitive investigations
- **Future**: Encrypt localStorage data when backend implemented (v0.5.0)

**Known Risks**:
- XSS attacks can read localStorage (mitigated by SPEC-SECURITY-001)
- Malicious browser extensions can access localStorage
- Shared computers expose data to other users
- No server-side backup (data loss if localStorage cleared)

---

## TRACEABILITY

### Related Documentation

- **Product Vision**: `.moai/project/product.md`
  - Line 220: "Phase 2: Production-Ready Foundation (v0.5.0) - Report versioning and change history"
  - Section: "Problem Statement #1: Manual Report Creation Inefficiency"

- **Architecture**: `.moai/project/structure.md`
  - Line 263: "report_versions (id, report_id, html_content, version_number, created_at)" (Future database schema)
  - Section: "Data Storage & Management - Current Data Architecture (MVP)" - Identified data loss risk

- **Tech Stack**: `.moai/project/tech.md`
  - Line 636: "Trackable Changes (T) - No SPEC-to-code traceability, no automated changelog generation"
  - Section: "TRUST 5 Principles Implementation"

### Dependencies

**Upstream (Required Before Implementation)**:
- ✅ SPEC-SECURITY-001: HTML Sanitization with DOMPurify (COMPLETED)
  - All stored and rendered versions must be sanitized
  - Integration point: `sanitizeHtml()` called in save/load operations

**Downstream (Blocked by This SPEC)**:
- SPEC-BACKEND-001: Server-side Report Persistence (v0.5.0)
  - Will migrate localStorage versions to PostgreSQL database
  - Will add multi-user collaboration and real-time sync

- SPEC-COLLAB-001: Real-time Collaborative Editing (v1.0.0)
  - Requires version history foundation
  - Will add conflict resolution and operational transforms

### Quality Gates (TRUST 5)

**Test-First Development (T)**:
- ✅ Write failing tests before implementation (TDD required)
- ✅ Unit tests for VersionStorageService (90%+ coverage)
- ✅ Integration tests for auto-save workflow
- ✅ E2E tests for version comparison and restoration
- ✅ Performance tests for localStorage quota management

**Readable Code (R)**:
- ✅ Clear component names (VersionTimeline, VersionDiff, ForensicMetadataEditor)
- ✅ TypeScript interfaces for all data structures
- ✅ JSDoc comments for complex algorithms (diff calculation, quota management)
- ✅ Consistent naming conventions (PascalCase components, camelCase functions)

**Unified Patterns (U)**:
- ✅ Consistent error handling (try-catch with user-friendly messages)
- ✅ Centralized storage service (single source of truth)
- ✅ Reusable components (VersionCard used in timeline and search results)
- ✅ Shared TypeScript types (ReportVersion, ForensicContext)

**Secured by Default (S)**:
- ✅ HTML sanitization via SPEC-SECURITY-001 (XSS prevention)
- ✅ Quota management prevents storage exhaustion
- ✅ Input validation for forensic metadata (regex patterns, max lengths)
- ⚠️ localStorage encryption planned for v0.5.0 backend

**Trackable Changes (T)**:
- ✅ All commits tagged with SPEC-VERSION-001
- ✅ Version metadata tracks user, timestamp, change description
- ✅ Diff stats calculated and stored for audit trail
- ✅ Export functionality for compliance reporting

---

## RISKS & MITIGATION

### Risk 1: localStorage Quota Exceeded

**Probability**: Medium (Analysts working on large reports with many versions)
**Impact**: High (Users unable to save new versions, data loss risk)

**Mitigation Strategies**:
1. **Proactive Monitoring**:
   - Display storage usage in UI (e.g., "4.2 MB / 10 MB used (42%)")
   - Warning threshold at 90% quota usage
   - Critical alert at 95% with forced action

2. **Automatic Pruning**:
   - User-configurable: Delete oldest auto-save versions first
   - Keep manual saves and milestone versions (user-flagged)
   - Prompt user before deletion: "Delete 10 oldest auto-saves to free 1.2 MB?"

3. **Compression**:
   - Implement LZ-string compression for HTML content
   - Estimated 60-80% size reduction
   - Fallback to uncompressed if decompression fails

4. **Export/Archive**:
   - One-click export to JSON file (download to disk)
   - Import previously exported versions when needed
   - Clear localStorage after export (optional)

**Acceptance Criteria**:
- User never loses data silently (always warned before quota exceeded)
- Auto-pruning successfully recovers >20% quota space
- Export/import roundtrip maintains data integrity

---

### Risk 2: Performance Degradation with Large Version Counts

**Probability**: Medium (Long-running investigations with 100+ versions)
**Impact**: Medium (UI lag, slow timeline rendering)

**Mitigation Strategies**:
1. **Virtual Scrolling**:
   - Use `react-window` for version timeline (render only visible items)
   - Estimated 10x performance improvement for 100+ versions
   - Lazy load version HTML content (fetch on expand)

2. **Pagination**:
   - Load 20 versions per page (infinite scroll or numbered pagination)
   - Cache loaded pages in memory (React state)
   - Background preload next page for smooth scrolling

3. **Indexing**:
   - Store version index separately (lightweight metadata only)
   - Full version loaded on demand (when viewing or comparing)
   - Index structure: `{ id, versionNumber, timestamp, changeDescription, diffStats }`

4. **Performance Budgets**:
   - Timeline render: <500ms for 50 versions (measured via React Profiler)
   - Diff calculation: <2000ms for 1MB HTML (measured via console.time)
   - Auto-save: <100ms overhead (non-blocking)

**Acceptance Criteria**:
- No visible lag with 100 versions loaded
- Scroll performance maintains 60fps
- Diff view loads within 2 seconds for largest reports

---

### Risk 3: Data Loss from localStorage Clearance

**Probability**: Low (User manually clears browser data, incognito mode expires)
**Impact**: Critical (All version history lost)

**Mitigation Strategies**:
1. **User Education**:
   - Warning on first use: "Version history stored locally. Clear browser data = data loss."
   - Link to export documentation in settings
   - Recommend periodic exports for important cases

2. **Automatic Backups**:
   - Daily export to downloads folder (configurable)
   - Retention: Last 7 days of auto-exports
   - Restore from backup on next session if localStorage empty

3. **Future Backend Migration**:
   - v0.5.0: Sync localStorage to backend database
   - Automatic cloud backup for enterprise users
   - Multi-device sync (access versions from any browser)

4. **Graceful Degradation**:
   - If localStorage unavailable: Disable version history gracefully
   - Display clear message: "Version history requires localStorage. Enable in browser settings."
   - Continue report editing without version tracking (reduced functionality)

**Acceptance Criteria**:
- Users warned about localStorage limitations before first save
- Export documentation easily accessible (help icon in UI)
- System detects localStorage unavailable and displays helpful error

---

### Risk 4: Version Conflict in Multi-Tab Scenarios

**Probability**: Low (User opens same report in multiple browser tabs)
**Impact**: Medium (Version number conflicts, overwritten saves)

**Mitigation Strategies**:
1. **Tab Synchronization**:
   - Use `storage` event listener to detect localStorage changes
   - Reload version timeline when another tab saves
   - Display notification: "Version history updated in another tab. Reload?"

2. **Version Number Generation**:
   - Use timestamp + random suffix for unique version IDs (no sequential numbers)
   - Sort by timestamp instead of version number
   - Resolve conflicts by latest timestamp wins

3. **Optimistic Locking**:
   - Check last modified timestamp before save
   - If changed since last load: Prompt user to refresh or force save
   - Merge conflicts manually (no automatic resolution)

4. **Future Solution**:
   - v0.5.0 backend: Centralized version control with conflict detection
   - Operational transforms for real-time collaborative editing (v1.0.0)

**Acceptance Criteria**:
- Multi-tab saves do not corrupt version history
- Users notified of conflicts with resolution options
- No silent data loss from concurrent edits

---

## APPROVAL & SIGN-OFF

**Status**: Draft (Pending User Review)

**Recommended Expert Consultations**:
- 🔵 **frontend-expert**: Component architecture review, React best practices for version timeline UI
- 🟢 **backend-expert**: Future migration path to server-side storage, PostgreSQL schema design
- 🟡 **ui-ux-expert**: Version timeline UX design, accessibility compliance (WCAG AA)

**User Approval Required**:
- [ ] Review SPEC requirements and acceptance criteria
- [ ] Confirm forensic metadata fields match organizational needs
- [ ] Approve auto-save interval (30s default) and behavior
- [ ] Verify storage quota management approach acceptable

**Next Steps**:
1. User approval via AskUserQuestion
2. Optional expert consultations (frontend-expert recommended for UI design)
3. TDD implementation via `/moai:2-run SPEC-VERSION-001`
4. Quality gate validation via `/moai:3-sync SPEC-VERSION-001`

---

**End of SPEC-VERSION-001**
