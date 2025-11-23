# Implementation Plan: SPEC-VERSION-001

**TAG**: `SPEC-VERSION-001`
**Project**: dfir-report
**Owner**: @user
**Created**: 2025-11-22

---

## OVERVIEW

This implementation plan outlines the development strategy for the Report Version History and Management System. The plan follows Test-Driven Development (TDD) principles with a RED-GREEN-REFACTOR cycle and prioritizes features based on user impact and technical dependencies.

**Development Mode**: Personal (GitHub Flow)
**Target Branch**: `feature/SPEC-VERSION-001`
**Estimated Scope**: Large feature (comprehensive version management system)

---

## MILESTONES

### Phase 1: Foundation (Data Model & Storage Service)

**Priority**: PRIMARY GOAL
**Dependencies**: SPEC-SECURITY-001 (HTML sanitization)
**Risk Level**: Medium (localStorage quota management complexity)

**Deliverables**:
1. **TypeScript Type Definitions** (`types.ts` updates)
   - `ReportVersion` interface
   - `ForensicContext` interface
   - `VersionDiffStats` interface
   - `StorageUsageStats` interface

2. **VersionStorageService** (`services/versionStorageService.ts`)
   - Core CRUD operations (save, load, delete versions)
   - localStorage abstraction layer
   - Quota monitoring and management
   - Data validation and sanitization
   - Export/import functionality (JSON format)

3. **Comprehensive Unit Tests**
   - `versionStorageService.test.ts` (90%+ coverage)
   - Test cases:
     - Save/load version operations
     - Quota exceeded handling
     - Data corruption recovery
     - Export/import roundtrip integrity
     - Version sorting and filtering

**Technical Approach**:
- Use localStorage browser API (native, no dependencies)
- Key structure: `dfir-cortex:versions:{reportId}` → JSON array
- Synchronous operations acceptable (localStorage is fast)
- Error handling: try-catch with graceful fallbacks
- Validation: Required fields check, timestamp validation, sequential version numbers

**Acceptance Criteria**:
- ✅ All VersionStorageService methods functional
- ✅ Unit tests pass with 90%+ code coverage
- ✅ localStorage quota warning at 90% usage
- ✅ Export produces valid JSON (can be imported without errors)
- ✅ Data corruption detected and logged with recovery options

**Implementation Notes**:
- Start with minimal interface (save, load, delete)
- Add quota management after core operations working
- Export/import can be added last (nice-to-have for Phase 1)

---

### Phase 2: Auto-Save Functionality

**Priority**: PRIMARY GOAL
**Dependencies**: Phase 1 (VersionStorageService)
**Risk Level**: Low (well-understood timer pattern)

**Deliverables**:
1. **Dashboard Auto-Save Integration** (`components/Dashboard.tsx` modifications)
   - Auto-save timer (30s interval, configurable)
   - Debounced save trigger (reset on content change)
   - Change detection (only save if content differs from last version)
   - User feedback (toast notifications for auto-save events)

2. **Auto-Save Settings** (localStorage settings key)
   - Enable/disable auto-save toggle
   - Configurable interval (15s-120s range)
   - Settings persistence across sessions

3. **Integration Tests**
   - `autoSave.test.ts`
   - Test cases:
     - Timer triggers at correct interval
     - Timer resets on content change
     - Auto-save skipped if content unchanged
     - Auto-save paused during AI processing
     - Settings changes respected

**Technical Approach**:
- React `useEffect` with cleanup for timer management
- `useRef` to track last saved content (avoid stale closures)
- Debounce pattern: Clear previous timer on each content change
- Non-blocking: Async save operations don't freeze UI
- Visual feedback: 3-second toast notification ("Auto-saved at HH:mm:ss")

**Acceptance Criteria**:
- ✅ Auto-save triggers every 30s during active editing
- ✅ Timer resets when user modifies content
- ✅ No save if content identical to last version
- ✅ Toast notification confirms successful auto-save
- ✅ Settings toggle enables/disables auto-save immediately

**Implementation Notes**:
- Start with fixed 30s interval (settings UI in later phase)
- Use existing toast notification system (or add simple toast component)
- Log auto-save events to console for debugging

---

### Phase 3: Version Timeline UI

**Priority**: SECONDARY GOAL
**Dependencies**: Phase 1 (VersionStorageService)
**Risk Level**: Medium (UI complexity, virtual scrolling performance)

**Deliverables**:
1. **VersionTimeline Component** (`components/VersionTimeline.tsx`)
   - Vertical timeline layout (newest first)
   - Virtual scrolling for 100+ versions (react-window library)
   - Filter controls (date range, user, auto-save vs. manual)
   - Search functionality (by description or case ID)

2. **VersionCard Component** (`components/VersionCard.tsx`)
   - Version metadata display (number, timestamp, user, description)
   - Forensic metadata badges (case ID, incident type, phase)
   - Action buttons (View, Compare, Restore, Delete)
   - Diff stats preview (+X/-Y lines)
   - Expand/collapse for full description

3. **VersionHistoryPanel Component** (`components/VersionHistoryPanel.tsx`)
   - Collapsible side panel (slide-in from right)
   - Header with close button and storage usage indicator
   - Integration point in Dashboard component

4. **Component Tests**
   - `VersionTimeline.test.tsx`
   - `VersionCard.test.tsx`
   - Test cases:
     - Timeline renders with mock versions
     - Filtering and search work correctly
     - Action buttons trigger correct callbacks
     - Virtual scrolling performance with 100+ items
     - Responsive design (mobile stacked cards)

**Technical Approach**:
- Tailwind CSS for styling (consistent with existing UI)
- Lucide React icons for action buttons
- react-window for virtual scrolling (install via npm)
- Date formatting: `Intl.DateTimeFormat` or date-fns (lightweight)
- Relative timestamps: "2 hours ago" with absolute tooltip

**Acceptance Criteria**:
- ✅ Timeline renders within 500ms for 50 versions
- ✅ Scroll performance smooth (60fps) with virtual scrolling
- ✅ Filter controls work correctly (date range, user, type)
- ✅ Search highlights matching versions
- ✅ Responsive design works on mobile (stacked cards)
- ✅ Keyboard navigation supported (Tab, Enter, Escape)

**Implementation Notes**:
- Start with static mock data for UI development
- Add react-window only if performance issues with >50 versions
- Design system: Match existing Dashboard dark theme, cybersecurity aesthetic

---

### Phase 4: Forensic Metadata Editor

**Priority**: SECONDARY GOAL
**Dependencies**: Phase 1 (VersionStorageService)
**Risk Level**: Low (form handling is well-understood)

**Deliverables**:
1. **ForensicMetadataEditor Component** (`components/ForensicMetadataEditor.tsx`)
   - Form fields: Case ID, Incident Type, Evidence Tags, Investigation Phase, Priority, Assigned To, Notes
   - Input validation (regex for case ID, max lengths, enum values)
   - Autocomplete for evidence tags (localStorage cache)
   - Debounced auto-save (3s after last change)
   - Collapsible panel (default collapsed, expand on click)

2. **Metadata Validation Utilities** (`utils/metadataValidation.ts`)
   - Case ID format validation (alphanumeric + hyphens)
   - Evidence tag validation (max 10 tags, each max 30 chars)
   - Incident type enum check
   - Investigation phase enum check

3. **Component Tests**
   - `ForensicMetadataEditor.test.tsx`
   - Test cases:
     - Form fields render correctly
     - Validation errors display on invalid input
     - Autocomplete suggests previous tags
     - Debounced save triggers after 3s
     - Collapse/expand state persists

**Technical Approach**:
- Controlled form inputs (React state)
- Validation on blur (show errors after user leaves field)
- Dropdown components: Native `<select>` or Headless UI
- Autocomplete: Filter tags from localStorage, display as dropdown
- Debounce: `setTimeout` with cleanup on unmount

**Acceptance Criteria**:
- ✅ All form fields functional with validation
- ✅ Case ID validation prevents invalid formats (real-time feedback)
- ✅ Evidence tags autocomplete from previous entries
- ✅ Metadata saves automatically 3s after last change
- ✅ Collapse/expand animation smooth (Tailwind transitions)
- ✅ Form state persists across page refreshes (localStorage draft)

**Implementation Notes**:
- Start with basic text inputs (no autocomplete initially)
- Add autocomplete as enhancement after core form working
- Markdown rendering in notes field (future enhancement, not MVP)

---

### Phase 5: Version Comparison (Diff View)

**Priority**: SECONDARY GOAL
**Dependencies**: Phase 1 (VersionStorageService)
**Risk Level**: High (complex diff algorithm, library integration, performance)

**Deliverables**:
1. **VersionDiff Component** (`components/VersionDiff.tsx`)
   - Side-by-side diff view (left: old, right: new)
   - Syntax highlighting for HTML
   - Color coding (green: additions, red: deletions, yellow: modifications)
   - Navigation controls (next/previous change)
   - Unified diff option (single pane, GitHub-style)
   - HTML preview mode (rendered iframes side-by-side)

2. **Diff Library Integration**
   - Install `diff` library (5.x) for diff algorithm
   - Install `react-diff-viewer-continued` (3.x) for UI rendering
   - TypeScript type definitions (`@types/diff` if available)

3. **Diff Service** (`services/diffService.ts`)
   - Wrapper around diff library
   - Calculate line-by-line diffs
   - Generate diff stats (additions, deletions, modifications)
   - Optimize for large HTML documents (chunking if needed)

4. **Component Tests**
   - `VersionDiff.test.tsx`
   - `diffService.test.ts`
   - Test cases:
     - Diff calculation correct for known inputs
     - Rendering displays color-coded changes
     - Navigation jumps to next/previous change
     - HTML preview renders sanitized content
     - Performance within 2s for 1MB HTML

**Technical Approach**:
- Use `diff.diffLines()` for line-by-line comparison
- react-diff-viewer-continued provides pre-built UI (less custom code)
- Modal or full-screen view for diff (avoid cramped split-pane in Dashboard)
- Lazy load diff content (calculate on modal open, not on timeline render)
- Performance: Web Worker for diff calculation if latency >2s (future optimization)

**Acceptance Criteria**:
- ✅ Diff calculation completes within 2s for 1MB HTML
- ✅ Color coding accessible (WCAG AA contrast ratios)
- ✅ Navigation controls work (keyboard shortcuts: N, P, Esc)
- ✅ HTML preview sanitizes content via SPEC-SECURITY-001
- ✅ Responsive design (stacked view on mobile)
- ✅ Export diff to HTML or copy to clipboard

**Implementation Notes**:
- Start with text-only diff (no HTML preview initially)
- Add HTML preview as enhancement after basic diff working
- Evaluate performance with real report data (may need optimization)
- Consider alternative libraries if react-diff-viewer-continued has issues (fallback: custom diff renderer)

---

### Phase 6: Version Restoration

**Priority**: FINAL GOAL
**Dependencies**: Phase 1 (VersionStorageService), Phase 3 (VersionTimeline UI)
**Risk Level**: Low (simple state update with confirmation modal)

**Deliverables**:
1. **Restoration Logic** (`components/Dashboard.tsx` modifications)
   - Restore button click handler
   - Confirmation modal ("Restore to Version #X?")
   - Save current state before restoration (no data loss)
   - Load restored version HTML into active report
   - Update forensic metadata to match restored version

2. **Confirmation Modal Component** (`components/ConfirmationModal.tsx`)
   - Reusable modal for destructive actions
   - Props: title, message, onConfirm, onCancel
   - Keyboard support (Enter to confirm, Esc to cancel)
   - Accessible (ARIA labels, focus management)

3. **Integration Tests**
   - `versionRestoration.test.ts`
   - Test cases:
     - Restore button displays confirmation modal
     - Current state saved before restoration
     - Restored version HTML loaded correctly
     - Forensic metadata updated to match restored version
     - Version history shows restoration event

**Technical Approach**:
- Modal overlay with Tailwind CSS (fixed position, backdrop blur)
- Focus trap: Lock keyboard focus inside modal
- State management: Track modal open/close, selected version
- Restoration flow:
  1. User clicks "Restore" on version card
  2. Save current state as auto-save version
  3. Load selected version's htmlContent (sanitized)
  4. Update Dashboard state (htmlContent, forensicMetadata)
  5. Close modal, scroll to top of report, display toast

**Acceptance Criteria**:
- ✅ Confirmation modal displays before restoration
- ✅ Current state saved automatically (no data loss)
- ✅ Restoration completes within 500ms
- ✅ Version timeline updates with restoration event
- ✅ Forensic metadata form reflects restored version
- ✅ User can undo restoration via version history

**Implementation Notes**:
- Reuse confirmation modal for delete operations (DRY principle)
- Log restoration events to console for debugging
- Consider "Preview before restore" feature (future enhancement)

---

## TECHNICAL ARCHITECTURE

### Component Hierarchy (Updated Dashboard)

```
Dashboard.tsx
├── Header
│   └── StorageUsageIndicator (NEW)
├── MainContent
│   ├── ForensicMetadataEditor (NEW - Collapsible Panel)
│   ├── ReportRenderer (Existing)
│   └── ChatInterface (Existing)
└── Sidebar
    └── VersionHistoryPanel (NEW - Slide-in Panel)
        ├── PanelHeader
        │   ├── CloseButton
        │   └── StorageUsage
        ├── FilterControls (NEW)
        │   ├── DateRangePicker
        │   ├── UserFilter
        │   └── TypeFilter (Auto-save vs. Manual)
        ├── SearchBar (NEW)
        └── VersionTimeline (NEW)
            └── VersionCard[] (NEW)
                ├── Metadata Display
                ├── ActionButtons
                │   ├── View
                │   ├── Compare
                │   ├── Restore → ConfirmationModal
                │   └── Delete → ConfirmationModal
                └── DiffStatsPreview

Modal Overlays (Rendered at App root)
├── VersionDiff (NEW - Full-screen Modal)
│   ├── DiffHeader (Version A vs. Version B)
│   ├── DiffControls (Next/Prev Change, Unified/Split View)
│   └── DiffRenderer (react-diff-viewer-continued)
└── ConfirmationModal (NEW - Reusable)
    ├── Title
    ├── Message
    └── Actions (Cancel, Confirm)
```

### Data Flow Architecture

```
User Actions (Dashboard)
    ↓
┌───────────────────────────────────────────────────────────┐
│  Dashboard State Management                               │
│  - htmlContent: string                                    │
│  - currentVersion: ReportVersion | null                   │
│  - forensicMetadata: ForensicContext                      │
│  - versionHistory: ReportVersion[]                        │
│  - autoSaveEnabled: boolean                               │
└───────────────┬──────────────────┬────────────────────────┘
                │                  │
                │ (Save/Load)      │ (Render)
                ▼                  ▼
    ┌───────────────────┐  ┌──────────────────────┐
    │ VersionStorage    │  │  UI Components       │
    │ Service           │  │  - VersionTimeline   │
    │ (localStorage)    │  │  - VersionDiff       │
    │                   │  │  - Metadata Editor   │
    └───────┬───────────┘  └──────────────────────┘
            │
            │ (HTML Sanitization)
            ▼
    ┌───────────────────┐
    │ Sanitization      │
    │ Service           │
    │ (SPEC-SECURITY-001)│
    └───────────────────┘
```

### State Management Strategy

**Dashboard Component State**:
```typescript
// Primary report state
const [htmlContent, setHtmlContent] = useState<string>(INITIAL_REPORT_HTML);
const [forensicMetadata, setForensicMetadata] = useState<ForensicContext>({});

// Version management state
const [currentVersion, setCurrentVersion] = useState<ReportVersion | null>(null);
const [versionHistory, setVersionHistory] = useState<ReportVersion[]>([]);
const [selectedVersions, setSelectedVersions] = useState<string[]>([]); // For comparison

// UI state
const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false);
const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

// Refs for auto-save
const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
const lastSavedContentRef = useRef<string>(htmlContent);
```

**Why Local State (Not Global State Management)**:
- Single-page app with single report at a time (no cross-component sharing needs)
- Version history accessed only from Dashboard and child components (prop drilling acceptable)
- Future: Consider Zustand or Redux when multi-report support added (v0.5.0)

---

## TESTING STRATEGY

### Test-Driven Development (TDD) Approach

**RED-GREEN-REFACTOR Cycle**:
1. **RED**: Write failing test for next feature (e.g., `saveVersion()` throws error on invalid input)
2. **GREEN**: Implement minimal code to pass test (basic validation, no optimization)
3. **REFACTOR**: Improve code quality while keeping tests green (extract helpers, add comments)

**Test Coverage Target**: 90%+ (enforced by quality gate)

### Test Categories

#### Unit Tests (90%+ coverage)
**Files to Test**:
- `services/versionStorageService.ts`
- `services/diffService.ts`
- `utils/metadataValidation.ts`

**Example Test Cases**:
```typescript
// versionStorageService.test.ts
describe('VersionStorageService', () => {
  describe('saveVersion', () => {
    it('should save version to localStorage with correct key', () => {
      const version = createMockVersion();
      versionStorage.saveVersion(version);

      const key = `dfir-cortex:versions:${version.reportId}`;
      const stored = localStorage.getItem(key);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject(version);
    });

    it('should throw QuotaExceededError when storage limit reached', () => {
      // Mock localStorage quota exceeded
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const version = createMockVersion();
      expect(() => versionStorage.saveVersion(version)).toThrow('Storage quota exceeded');
    });

    it('should validate required fields before saving', () => {
      const invalidVersion = { id: '123' }; // Missing required fields
      expect(() => versionStorage.saveVersion(invalidVersion)).toThrow('Invalid version');
    });
  });

  describe('getAllVersions', () => {
    it('should return empty array if no versions exist', () => {
      const versions = versionStorage.getAllVersions('nonexistent-report');
      expect(versions).toEqual([]);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('dfir-cortex:versions:test', 'invalid json{');
      const versions = versionStorage.getAllVersions('test');
      expect(versions).toEqual([]); // Graceful fallback
    });
  });
});
```

#### Component Tests (85%+ coverage)
**Files to Test**:
- `components/VersionTimeline.tsx`
- `components/VersionCard.tsx`
- `components/ForensicMetadataEditor.tsx`
- `components/VersionDiff.tsx`
- `components/ConfirmationModal.tsx`

**Example Test Cases**:
```typescript
// VersionTimeline.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionTimeline } from './VersionTimeline';

describe('VersionTimeline', () => {
  it('renders version cards for each version', () => {
    const mockVersions = [
      createMockVersion({ versionNumber: 1 }),
      createMockVersion({ versionNumber: 2 })
    ];

    render(<VersionTimeline versions={mockVersions} />);

    expect(screen.getByText('Version #1')).toBeInTheDocument();
    expect(screen.getByText('Version #2')).toBeInTheDocument();
  });

  it('filters versions by date range', () => {
    const oldVersion = createMockVersion({ timestamp: Date.now() - 86400000 * 10 }); // 10 days ago
    const recentVersion = createMockVersion({ timestamp: Date.now() });

    render(<VersionTimeline versions={[oldVersion, recentVersion]} />);

    // Apply filter: Last 7 days
    fireEvent.click(screen.getByText('Last 7 days'));

    expect(screen.queryByText(`Version #${oldVersion.versionNumber}`)).not.toBeInTheDocument();
    expect(screen.getByText(`Version #${recentVersion.versionNumber}`)).toBeInTheDocument();
  });

  it('calls onRestore when restore button clicked', () => {
    const mockOnRestore = jest.fn();
    const version = createMockVersion();

    render(<VersionTimeline versions={[version]} onRestore={mockOnRestore} />);

    fireEvent.click(screen.getByText('Restore'));
    expect(mockOnRestore).toHaveBeenCalledWith(version);
  });
});
```

#### Integration Tests (Key User Flows)
**Test Scenarios**:
1. **Auto-Save Flow**:
   - User edits report → Wait 30s → Auto-save triggers → Version saved to localStorage → Toast notification appears

2. **Version Comparison Flow**:
   - User selects two versions → Clicks "Compare" → Diff modal opens → Changes highlighted correctly

3. **Version Restoration Flow**:
   - User clicks "Restore" → Confirmation modal appears → User confirms → Current state saved → Restored version loaded

**Example Integration Test**:
```typescript
// autoSave.integration.test.ts
import { render, waitFor, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { versionStorage } from '../services/versionStorageService';

describe('Auto-Save Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should auto-save report after 30 seconds of inactivity', async () => {
    render(<Dashboard />);

    // Simulate user editing report (AI command)
    const chatInput = screen.getByPlaceholderText('Ask me to modify the report...');
    fireEvent.change(chatInput, { target: { value: 'Add executive summary' } });
    fireEvent.click(screen.getByText('Send'));

    // Wait for AI response (mock)
    await waitFor(() => expect(screen.getByText('Executive Summary')).toBeInTheDocument());

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    // Verify auto-save triggered
    await waitFor(() => {
      const versions = versionStorage.getAllVersions('default-report');
      expect(versions).toHaveLength(1);
      expect(versions[0].isAutoSave).toBe(true);
    });

    // Verify toast notification
    expect(screen.getByText(/Auto-saved at/)).toBeInTheDocument();
  });

  it('should reset timer when user makes another edit', async () => {
    render(<Dashboard />);

    // First edit
    fireEvent.change(screen.getByPlaceholderText('Ask me to modify the report...'), {
      target: { value: 'Add summary' }
    });

    // Fast-forward 20 seconds (not enough to trigger)
    jest.advanceTimersByTime(20000);

    // Second edit (resets timer)
    fireEvent.change(screen.getByPlaceholderText('Ask me to modify the report...'), {
      target: { value: 'Add introduction' }
    });

    // Fast-forward another 20 seconds (total 40s, but timer was reset)
    jest.advanceTimersByTime(20000);

    // Verify no auto-save yet (timer reset to 30s from second edit)
    const versions = versionStorage.getAllVersions('default-report');
    expect(versions).toHaveLength(0);

    // Fast-forward remaining 10 seconds (now 30s since second edit)
    jest.advanceTimersByTime(10000);

    // Now auto-save should trigger
    await waitFor(() => {
      const updatedVersions = versionStorage.getAllVersions('default-report');
      expect(updatedVersions).toHaveLength(1);
    });
  });
});
```

#### End-to-End Tests (Playwright - Optional)
**Critical User Journeys**:
1. Analyst completes investigation, saves multiple versions with forensic metadata
2. Analyst compares two versions to review changes
3. Analyst accidentally deletes content, restores previous version

**Example E2E Test**:
```typescript
// version-management.spec.ts
import { test, expect } from '@playwright/test';

test('DFIR analyst can track investigation progress through version history', async ({ page }) => {
  await page.goto('/');

  // Login
  await page.fill('[name=email]', 'analyst@dfir.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // Open forensic metadata editor
  await page.click('text=Forensic Metadata');
  await page.fill('[name=caseId]', 'INC-2025-001');
  await page.selectOption('[name=incidentType]', 'Malware Analysis');

  // Make first edit
  await page.fill('[placeholder="Ask me to modify the report..."]', 'Add executive summary section');
  await page.click('button:has-text("Send")');
  await expect(page.locator('.report-renderer')).toContainText('Executive Summary', { timeout: 10000 });

  // Wait for auto-save (30s)
  await page.waitForTimeout(30000);
  await expect(page.locator('.toast')).toContainText('Auto-saved');

  // Open version history
  await page.click('button:has-text("Version History")');
  await expect(page.locator('.version-timeline')).toBeVisible();

  // Verify version appears
  await expect(page.locator('.version-card')).toContainText('Version #1');
  await expect(page.locator('.version-card')).toContainText('INC-2025-001');
  await expect(page.locator('.version-card')).toContainText('Malware Analysis');

  // Make second edit
  await page.fill('[placeholder="Ask me to modify the report..."]', 'Add technical analysis section');
  await page.click('button:has-text("Send")');
  await page.waitForTimeout(30000); // Auto-save

  // Verify two versions exist
  const versionCards = page.locator('.version-card');
  await expect(versionCards).toHaveCount(2);

  // Compare versions
  await versionCards.first().locator('button:has-text("Compare")').click();
  await versionCards.last().locator('button:has-text("Compare")').click();
  await page.click('button:has-text("View Comparison")');

  // Verify diff view
  await expect(page.locator('.diff-viewer')).toBeVisible();
  await expect(page.locator('.diff-viewer')).toContainText('Technical Analysis'); // Added content

  // Close diff, restore first version
  await page.click('button:has-text("Close")');
  await versionCards.last().locator('button:has-text("Restore")').click();

  // Confirm restoration
  await page.click('button:has-text("Restore Version")');
  await expect(page.locator('.toast')).toContainText('Restored to Version #1');

  // Verify content restored
  await expect(page.locator('.report-renderer')).toContainText('Executive Summary');
  await expect(page.locator('.report-renderer')).not.toContainText('Technical Analysis');
});
```

---

## DEPENDENCIES & LIBRARIES

### New npm Dependencies

**Production Dependencies**:
```json
{
  "dependencies": {
    "diff": "^5.2.0",                           // Diff algorithm library
    "react-diff-viewer-continued": "^3.4.0",    // Diff UI component
    "react-window": "^1.8.10",                  // Virtual scrolling
    "lz-string": "^1.5.0",                      // Compression (optional, Phase 7+)
    "date-fns": "^2.30.0"                       // Date formatting (lightweight alternative to moment.js)
  },
  "devDependencies": {
    "@types/diff": "^5.0.9",                    // TypeScript types for diff
    "@types/react-window": "^1.8.8"             // TypeScript types for react-window
  }
}
```

**Rationale**:
- **diff**: Industry-standard diff algorithm (used by Git, GitHub)
- **react-diff-viewer-continued**: Actively maintained fork of react-diff-viewer (original unmaintained)
- **react-window**: High-performance virtual scrolling (used by Instagram, Facebook)
- **date-fns**: Lightweight (13KB gzipped vs. moment.js 67KB), tree-shakeable, immutable

**Installation Command**:
```bash
npm install diff react-diff-viewer-continued react-window date-fns lz-string
npm install --save-dev @types/diff @types/react-window
```

**Version Pinning Strategy**:
- Use `^` (caret) for minor/patch updates (e.g., `^5.2.0` allows `5.x.x`)
- Critical libraries: Pin exact versions after testing (e.g., `5.2.0` no caret)
- Monthly dependency review via `npm outdated`

---

## RISKS & MITIGATION

### Technical Risks

#### Risk 1: localStorage Quota Exhaustion
**Likelihood**: Medium | **Impact**: High

**Mitigation**:
- Implement quota monitoring from Phase 1
- Display storage usage prominently (header indicator)
- Auto-pruning of oldest auto-save versions at 90% quota
- User education: Warning on first use about localStorage limits
- Export functionality for long-term archival

**Contingency**:
- If quota exceeded mid-save: Prompt user to delete old versions immediately
- Emergency mode: Disable auto-save, manual save only
- Future: Migrate to IndexedDB (larger quota) or backend storage (v0.5.0)

---

#### Risk 2: Diff Algorithm Performance on Large Reports
**Likelihood**: Medium | **Impact**: Medium

**Mitigation**:
- Performance benchmarking with 1MB HTML samples
- Loading indicator during diff calculation (>500ms)
- Lazy load diff (calculate on modal open, not on timeline render)
- Future optimization: Web Worker for async diff calculation

**Contingency**:
- If diff calculation >5s: Display warning, offer simplified diff (word-level instead of line-level)
- Fallback: Plain text comparison (remove HTML tags, diff raw text)
- Alternative library evaluation: jsondiffpatch, fast-diff

---

#### Risk 3: react-diff-viewer-continued Compatibility Issues
**Likelihood**: Low | **Impact**: Medium

**Mitigation**:
- Test library integration early (Phase 5 start)
- Review library GitHub issues for known bugs
- Evaluate alternative: react-diff-view, custom diff renderer

**Contingency**:
- If library incompatible with React 19: Use custom diff renderer (simple side-by-side table)
- Fallback to plain diff output (GitHub-style unified diff)

---

#### Risk 4: Multi-Tab Version Conflicts
**Likelihood**: Low | **Impact**: Medium

**Mitigation**:
- Implement `storage` event listener for cross-tab synchronization
- Display warning: "Version history updated in another tab. Reload?"
- Use timestamp-based version IDs (UUID) instead of sequential numbers

**Contingency**:
- If conflict detected: Prompt user to refresh or force save
- Manual conflict resolution (no automatic merge)

---

### User Experience Risks

#### Risk 5: Complex UI Overwhelming Users
**Likelihood**: Medium | **Impact**: Low

**Mitigation**:
- Progressive disclosure: Collapse advanced features by default
- Onboarding tooltips for first-time users
- Contextual help icons with explanations
- User testing with DFIR analysts (gather feedback)

**Contingency**:
- Simplify UI: Hide less-used features (export, advanced filters)
- Guided tour on first use (interactive walkthrough)

---

## QUALITY GATES

### TRUST 5 Validation Checklist

**Test-First (T)**:
- [ ] All VersionStorageService methods have unit tests (90%+ coverage)
- [ ] Auto-save functionality has integration tests
- [ ] Component tests for all UI components (85%+ coverage)
- [ ] E2E test for critical user journey (version comparison and restoration)
- [ ] Performance benchmarks validate targets (timeline <500ms, diff <2s)

**Readable (R)**:
- [ ] All TypeScript interfaces documented with JSDoc comments
- [ ] Complex algorithms explained (diff calculation, quota management)
- [ ] Component prop types clearly defined
- [ ] Consistent naming conventions (PascalCase components, camelCase functions)
- [ ] Code review completed (self-review or peer review)

**Unified (U)**:
- [ ] Consistent error handling patterns (try-catch with user-friendly messages)
- [ ] Reusable components (ConfirmationModal, VersionCard)
- [ ] Shared utility functions (metadataValidation, diffService)
- [ ] UI design matches existing Dashboard aesthetic (Tailwind dark theme)

**Secured (S)**:
- [ ] All version HTML sanitized via SPEC-SECURITY-001 (save and load)
- [ ] Input validation for forensic metadata (regex patterns, max lengths)
- [ ] localStorage quota management prevents storage exhaustion attacks
- [ ] No XSS vulnerabilities in diff rendering (sanitize before display)

**Trackable (T)**:
- [ ] All commits tagged with SPEC-VERSION-001
- [ ] Git branch: feature/SPEC-VERSION-001
- [ ] Changelog updated with user-facing changes
- [ ] Version metadata tracks user, timestamp, change description

---

## NEXT STEPS

### Phase 1 Kickoff (Immediate)

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/SPEC-VERSION-001
   ```

2. **Install Dependencies**:
   ```bash
   npm install diff react-diff-viewer-continued react-window date-fns
   npm install --save-dev @types/diff @types/react-window
   ```

3. **Create Initial Files** (TDD RED phase):
   - `types.ts` (add ReportVersion, ForensicContext interfaces)
   - `services/versionStorageService.ts` (empty class with method stubs)
   - `services/versionStorageService.test.ts` (failing tests)

4. **Run Tests** (verify RED):
   ```bash
   npm test
   # All tests should fail (no implementation yet)
   ```

5. **Implement Phase 1** (GREEN phase):
   - Write minimal code to pass tests
   - Iterate until all VersionStorageService tests pass

6. **Refactor** (REFACTOR phase):
   - Extract helper functions
   - Add JSDoc comments
   - Optimize code without breaking tests

7. **Commit Progress**:
   ```bash
   git add .
   git commit -m "[SPEC-VERSION-001] Phase 1: Implement VersionStorageService with localStorage persistence"
   ```

### Iteration Strategy

**Daily Goals** (suggested pace):
- **Day 1**: Phase 1 (VersionStorageService + tests)
- **Day 2**: Phase 2 (Auto-save functionality + integration tests)
- **Day 3**: Phase 3 (VersionTimeline UI + component tests)
- **Day 4**: Phase 4 (ForensicMetadataEditor + validation tests)
- **Day 5**: Phase 5 (VersionDiff component + performance tests)
- **Day 6**: Phase 6 (Version restoration + confirmation modal)
- **Day 7**: Integration testing, bug fixes, quality gate validation

**Flexibility**: Adjust pace based on complexity encountered. Phases 5-6 may require 2 days each.

---

## SUCCESS CRITERIA

### MVP Definition (Minimum Viable Product)

**Must-Have Features**:
- ✅ localStorage persistence (versions survive page refresh)
- ✅ Auto-save every 30s (prevent data loss)
- ✅ Version timeline UI (view all versions)
- ✅ Forensic metadata tracking (case ID, incident type)
- ✅ Version restoration (undo changes)

**Nice-to-Have Features** (can defer to v0.5.0):
- ⏳ Version comparison diff view (if Phase 5 exceeds timeline)
- ⏳ Export/import functionality (backup workaround)
- ⏳ Advanced filtering and search (basic timeline sufficient)

### Completion Checklist

**Implementation**:
- [ ] All 6 phases completed
- [ ] Test coverage ≥90% (unit tests)
- [ ] Test coverage ≥85% (component tests)
- [ ] All acceptance criteria met (SPEC requirements)
- [ ] Performance benchmarks validated (timeline <500ms, diff <2s)

**Quality Gates**:
- [ ] TRUST 5 checklist 100% complete
- [ ] No console errors or warnings in production build
- [ ] Accessibility validation (WCAG 2.1 AA compliance)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive design verified

**Documentation**:
- [ ] User-facing documentation updated (how to use version history)
- [ ] Inline code comments for complex logic
- [ ] Changelog entry created (user-facing changes)
- [ ] SPEC acceptance.md validated (Given-When-Then scenarios pass)

**Deployment Ready**:
- [ ] Feature branch merged to develop (via PR)
- [ ] Quality gate validation passed (`/moai:3-sync SPEC-VERSION-001`)
- [ ] Production build tested (`npm run build && npm run preview`)
- [ ] No merge conflicts with main branch

---

**End of Implementation Plan - SPEC-VERSION-001**
