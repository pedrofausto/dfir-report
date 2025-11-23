# Acceptance Criteria: SPEC-VERSION-001

**TAG**: `SPEC-VERSION-001`
**Project**: dfir-report
**Owner**: @user
**Created**: 2025-11-22

---

## OVERVIEW

This document defines comprehensive acceptance criteria for the Report Version History and Management System using Given-When-Then (BDD) format. Each scenario validates a specific functional requirement from the SPEC and ensures the implementation meets user expectations.

**Validation Method**: Automated tests (Vitest, React Testing Library, Playwright)
**Coverage Target**: 90%+ for critical user journeys
**Test Execution**: Run via `/moai:2-run SPEC-VERSION-001` (TDD implementation)

---

## ACCEPTANCE SCENARIOS

### Feature 1: Version Persistence (FR-1, FR-2)

#### Scenario 1.1: Save Version to localStorage

**Given** a DFIR analyst has modified a report via AI commands
**And** the report HTML content is different from the last saved version
**And** localStorage is available in the browser

**When** the user manually clicks "Save Version" button
**Or** the auto-save timer triggers after 30 seconds

**Then** the system shall:
- Generate a unique UUID for the new version
- Increment the version number sequentially (e.g., 1 → 2)
- Sanitize the HTML content via SPEC-SECURITY-001
- Persist the version to localStorage with key `dfir-cortex:versions:{reportId}`
- Include all required metadata (timestamp, user, forensic context)
- Display a success toast notification ("Version #2 saved successfully")
- Update the version timeline UI to show the new version

**Validation**:
```typescript
// Unit Test
test('should save version to localStorage with correct structure', async () => {
  const version: ReportVersion = {
    id: crypto.randomUUID(),
    reportId: 'test-report',
    versionNumber: 1,
    timestamp: Date.now(),
    htmlContent: '<h1>Test Report</h1>',
    changeDescription: 'Initial version',
    createdBy: { userId: '1', username: 'analyst', role: 'Analyst' },
    forensicContext: { caseId: 'INC-2025-001' },
    isAutoSave: false
  };

  await versionStorage.saveVersion(version);

  const saved = localStorage.getItem('dfir-cortex:versions:test-report');
  expect(saved).toBeTruthy();

  const parsed = JSON.parse(saved!);
  expect(parsed).toHaveLength(1);
  expect(parsed[0]).toMatchObject(version);
});
```

---

#### Scenario 1.2: Handle localStorage Quota Exceeded

**Given** the user has saved 100+ versions
**And** localStorage quota is approaching the 5MB limit (90%+ usage)
**And** the user attempts to save a new version

**When** the system detects quota usage exceeds 90%

**Then** the system shall:
- Display a warning modal: "Storage quota at 92%. Delete old versions or enable auto-pruning?"
- Offer options:
  - "Delete 10 Oldest Auto-Saves" (frees ~20% quota)
  - "Export All Versions to JSON" (backup before deletion)
  - "Continue Anyway" (attempt save, may fail)
- Log quota warning to console for debugging
- Prevent silent save failures (always notify user)

**Validation**:
```typescript
// Integration Test
test('should warn user when quota approaching limit', async () => {
  // Fill localStorage to 90% quota
  const largeVersion = createMockVersion({ htmlContent: 'x'.repeat(4.5 * 1024 * 1024) });

  render(<Dashboard />);

  // Attempt to save new version
  await userEvent.click(screen.getByText('Save Version'));

  // Verify warning modal
  expect(screen.getByText(/Storage quota at/)).toBeInTheDocument();
  expect(screen.getByText('Delete 10 Oldest Auto-Saves')).toBeInTheDocument();
  expect(screen.getByText('Export All Versions to JSON')).toBeInTheDocument();
});
```

---

#### Scenario 1.3: Load Versions on Dashboard Mount

**Given** the user has previously saved 5 versions to localStorage
**And** the user logs into the DFIR Cortex application

**When** the Dashboard component mounts
**And** the VersionHistoryPanel initializes

**Then** the system shall:
- Retrieve versions from localStorage key `dfir-cortex:versions:{reportId}`
- Parse JSON and validate version structure
- Sort versions by timestamp (newest first)
- Render version timeline with 5 version cards
- Display loading state during retrieval (<500ms)
- Handle corrupted data gracefully (empty array fallback)

**Validation**:
```typescript
// Integration Test
test('should load and display versions on Dashboard mount', async () => {
  // Pre-populate localStorage with mock versions
  const mockVersions = [
    createMockVersion({ versionNumber: 1, timestamp: Date.now() - 10000 }),
    createMockVersion({ versionNumber: 2, timestamp: Date.now() })
  ];
  localStorage.setItem('dfir-cortex:versions:default-report', JSON.stringify(mockVersions));

  render(<Dashboard />);

  // Open version history panel
  await userEvent.click(screen.getByText('Version History'));

  // Verify versions loaded and displayed
  expect(screen.getByText('Version #1')).toBeInTheDocument();
  expect(screen.getByText('Version #2')).toBeInTheDocument();

  // Verify sorted correctly (newest first)
  const cards = screen.getAllByTestId('version-card');
  expect(cards[0]).toHaveTextContent('Version #2');
  expect(cards[1]).toHaveTextContent('Version #1');
});
```

---

### Feature 2: Auto-Save Functionality (FR-3)

#### Scenario 2.1: Auto-Save After 30 Seconds of Inactivity

**Given** the user is editing a report in the Dashboard
**And** auto-save is enabled (default setting)
**And** the user makes a change via AI command ("Add executive summary")

**When** 30 seconds have elapsed since the last content change
**And** the report content differs from the last saved version

**Then** the system shall:
- Automatically save the current report state as a new version
- Set `isAutoSave: true` in version metadata
- Set `changeDescription: "Auto-saved at [HH:mm:ss]"`
- Inherit forensic metadata from last manual save
- Display a non-intrusive toast notification ("Auto-saved at 14:35:22") for 3 seconds
- Reset the auto-save timer for the next interval

**Validation**:
```typescript
// Integration Test with Fake Timers
test('should auto-save report after 30 seconds', async () => {
  jest.useFakeTimers();

  render(<Dashboard />);

  // Simulate user editing report
  const chatInput = screen.getByPlaceholderText('Ask me to modify the report...');
  await userEvent.type(chatInput, 'Add executive summary');
  await userEvent.click(screen.getByText('Send'));

  // Wait for AI response (mocked)
  await waitFor(() => expect(screen.getByText('Executive Summary')).toBeInTheDocument());

  // Fast-forward 30 seconds
  act(() => {
    jest.advanceTimersByTime(30000);
  });

  // Verify auto-save triggered
  await waitFor(() => {
    const versions = versionStorage.getAllVersions('default-report');
    expect(versions).toHaveLength(1);
    expect(versions[0].isAutoSave).toBe(true);
    expect(versions[0].changeDescription).toMatch(/Auto-saved at/);
  });

  // Verify toast notification
  expect(screen.getByText(/Auto-saved at/)).toBeInTheDocument();

  jest.useRealTimers();
});
```

---

#### Scenario 2.2: Reset Auto-Save Timer on User Edit

**Given** the user made an edit 20 seconds ago
**And** the auto-save timer has 10 seconds remaining
**And** the user makes another edit via AI command

**When** the report content changes

**Then** the system shall:
- Cancel the existing auto-save timer
- Reset the timer to 30 seconds from the new edit
- Not trigger an auto-save until 30 seconds after the latest edit
- Display visual indicator of timer reset (optional, future enhancement)

**Validation**:
```typescript
// Integration Test
test('should reset auto-save timer on subsequent edits', async () => {
  jest.useFakeTimers();

  render(<Dashboard />);

  // First edit
  await userEvent.type(screen.getByPlaceholderText('Ask me to modify the report...'), 'Add summary');
  await userEvent.click(screen.getByText('Send'));

  // Fast-forward 20 seconds (not enough to trigger auto-save)
  act(() => {
    jest.advanceTimersByTime(20000);
  });

  // Second edit (resets timer)
  await userEvent.type(screen.getByPlaceholderText('Ask me to modify the report...'), 'Add introduction');
  await userEvent.click(screen.getByText('Send'));

  // Fast-forward another 20 seconds (total 40s, but timer reset to 30s from second edit)
  act(() => {
    jest.advanceTimersByTime(20000);
  });

  // Verify no auto-save yet (timer reset to 30s from second edit)
  let versions = versionStorage.getAllVersions('default-report');
  expect(versions).toHaveLength(0);

  // Fast-forward remaining 10 seconds (now 30s since second edit)
  act(() => {
    jest.advanceTimersByTime(10000);
  });

  // Now auto-save should trigger
  await waitFor(() => {
    versions = versionStorage.getAllVersions('default-report');
    expect(versions).toHaveLength(1);
  });

  jest.useRealTimers();
});
```

---

#### Scenario 2.3: Skip Auto-Save if Content Unchanged

**Given** the user saved a version manually 10 seconds ago
**And** the auto-save timer is counting down
**And** the user has not made any edits since the manual save

**When** 30 seconds elapse (auto-save timer expires)

**Then** the system shall:
- Compare current report content to last saved version (deep equality check)
- Detect no changes
- Skip creating a new version (avoid duplicate versions)
- Not display a toast notification
- Reset timer for next interval (continue monitoring)

**Validation**:
```typescript
// Integration Test
test('should skip auto-save if content unchanged', async () => {
  jest.useFakeTimers();

  render(<Dashboard />);

  // Manually save version
  await userEvent.click(screen.getByText('Save Version'));

  await waitFor(() => {
    const versions = versionStorage.getAllVersions('default-report');
    expect(versions).toHaveLength(1);
  });

  // Fast-forward 30 seconds (no edits made)
  act(() => {
    jest.advanceTimersByTime(30000);
  });

  // Verify no duplicate auto-save created
  const versions = versionStorage.getAllVersions('default-report');
  expect(versions).toHaveLength(1); // Still only 1 version

  // Verify no toast notification
  expect(screen.queryByText(/Auto-saved/)).not.toBeInTheDocument();

  jest.useRealTimers();
});
```

---

### Feature 3: Version Timeline UI (FR-4)

#### Scenario 3.1: Display Version Timeline with Cards

**Given** the user has saved 10 versions of the report
**And** the user opens the Version History panel

**When** the VersionTimeline component renders

**Then** the system shall:
- Display all 10 versions in a vertical timeline (newest at top)
- Render each version as a card with:
  - Version number (e.g., "Version #10")
  - Timestamp (relative: "2 hours ago", absolute tooltip: "2025-11-22 14:30:15")
  - User who created version (username + avatar/icon)
  - Change description (truncated to 100 chars with "Read more...")
  - Forensic metadata badges (case ID, incident type, investigation phase)
  - Auto-save indicator (🔄 icon if `isAutoSave === true`)
  - Diff stats preview (e.g., "+15 / -3 lines")
- Provide action buttons: View, Compare, Restore, Delete
- Render within 500ms (performance target)

**Validation**:
```typescript
// Component Test
test('should display version timeline with all version cards', () => {
  const mockVersions = Array.from({ length: 10 }, (_, i) =>
    createMockVersion({
      versionNumber: i + 1,
      timestamp: Date.now() - i * 3600000, // Hourly versions
      changeDescription: `Change ${i + 1}`,
      forensicContext: { caseId: 'INC-2025-001', incidentType: 'Malware' },
      isAutoSave: i % 2 === 0 // Every other version is auto-save
    })
  );

  render(<VersionTimeline versions={mockVersions} />);

  // Verify all versions rendered
  mockVersions.forEach(v => {
    expect(screen.getByText(`Version #${v.versionNumber}`)).toBeInTheDocument();
    expect(screen.getByText(v.changeDescription)).toBeInTheDocument();
  });

  // Verify auto-save indicator
  const autoSaveIcons = screen.getAllByLabelText('Auto-saved version');
  expect(autoSaveIcons).toHaveLength(5); // 5 out of 10 are auto-saves

  // Verify forensic metadata badges
  expect(screen.getAllByText('INC-2025-001')).toHaveLength(10);
  expect(screen.getAllByText('Malware')).toHaveLength(10);
});
```

---

#### Scenario 3.2: Filter Versions by Date Range

**Given** the user has versions spanning 30 days
**And** the user opens the Version History panel

**When** the user selects "Last 7 days" filter

**Then** the system shall:
- Hide versions older than 7 days
- Display only versions created in the last 7 days
- Update the version count display (e.g., "Showing 15 of 50 versions")
- Maintain filter selection across panel close/reopen (session persistence)

**Validation**:
```typescript
// Component Test
test('should filter versions by date range', async () => {
  const oldVersion = createMockVersion({
    versionNumber: 1,
    timestamp: Date.now() - 10 * 86400000 // 10 days ago
  });
  const recentVersion = createMockVersion({
    versionNumber: 2,
    timestamp: Date.now() - 2 * 86400000 // 2 days ago
  });

  render(<VersionTimeline versions={[oldVersion, recentVersion]} />);

  // Verify both versions initially visible
  expect(screen.getByText('Version #1')).toBeInTheDocument();
  expect(screen.getByText('Version #2')).toBeInTheDocument();

  // Apply "Last 7 days" filter
  await userEvent.click(screen.getByText('Last 7 days'));

  // Verify old version hidden
  expect(screen.queryByText('Version #1')).not.toBeInTheDocument();
  expect(screen.getByText('Version #2')).toBeInTheDocument();

  // Verify count display
  expect(screen.getByText('Showing 1 of 2 versions')).toBeInTheDocument();
});
```

---

#### Scenario 3.3: Search Versions by Description or Case ID

**Given** the user has 50 versions with various case IDs
**And** the user opens the Version History panel

**When** the user types "INC-2025-042" in the search bar

**Then** the system shall:
- Filter versions to show only those matching the search term
- Search in: change description, case ID, evidence tags, notes
- Highlight matching text in results (optional enhancement)
- Display "No results found" if no matches
- Clear search with "X" button or backspace

**Validation**:
```typescript
// Component Test
test('should search versions by case ID', async () => {
  const matchingVersion = createMockVersion({
    versionNumber: 1,
    forensicContext: { caseId: 'INC-2025-042' }
  });
  const nonMatchingVersion = createMockVersion({
    versionNumber: 2,
    forensicContext: { caseId: 'INC-2025-001' }
  });

  render(<VersionTimeline versions={[matchingVersion, nonMatchingVersion]} />);

  // Type search query
  const searchInput = screen.getByPlaceholderText('Search versions...');
  await userEvent.type(searchInput, 'INC-2025-042');

  // Verify filtered results
  expect(screen.getByText('Version #1')).toBeInTheDocument();
  expect(screen.queryByText('Version #2')).not.toBeInTheDocument();

  // Verify case ID displayed
  expect(screen.getByText('INC-2025-042')).toBeInTheDocument();
});
```

---

### Feature 4: Forensic Metadata Editor (FR-7)

#### Scenario 4.1: Edit Forensic Metadata with Validation

**Given** the user is creating a new report version
**And** the ForensicMetadataEditor panel is expanded

**When** the user fills out the form:
- Case ID: "INC-2025-123"
- Incident Type: "Ransomware"
- Evidence Tags: "sodinokibi", "lateral-movement", "smb-exploitation"
- Investigation Phase: "Analysis"
- Priority: "Critical"
- Assigned To: "Alice Johnson"
- Notes: "Attacked via RDP brute-force, encrypted 500+ files"

**Then** the system shall:
- Validate case ID format (alphanumeric + hyphens only)
- Accept valid incident type from dropdown enum
- Allow up to 10 evidence tags, each max 30 chars
- Save metadata to current version's `forensicContext`
- Auto-save metadata changes after 3 seconds of inactivity
- Display "Saved" indicator on successful update
- Show validation errors inline (e.g., "Invalid case ID format")

**Validation**:
```typescript
// Component Test
test('should validate and save forensic metadata', async () => {
  const onMetadataChange = jest.fn();

  render(<ForensicMetadataEditor metadata={{}} onChange={onMetadataChange} />);

  // Fill out form
  await userEvent.type(screen.getByLabelText('Case ID'), 'INC-2025-123');
  await userEvent.selectOptions(screen.getByLabelText('Incident Type'), 'Ransomware');
  await userEvent.type(screen.getByLabelText('Evidence Tags'), 'sodinokibi, lateral-movement');
  await userEvent.selectOptions(screen.getByLabelText('Investigation Phase'), 'Analysis');
  await userEvent.click(screen.getByLabelText('Critical'));
  await userEvent.type(screen.getByLabelText('Notes'), 'Attacked via RDP brute-force');

  // Verify validation passed (no error messages)
  expect(screen.queryByText(/Invalid case ID/)).not.toBeInTheDocument();

  // Wait for debounced auto-save (3s)
  await waitFor(() => {
    expect(onMetadataChange).toHaveBeenCalledWith({
      caseId: 'INC-2025-123',
      incidentType: 'Ransomware',
      evidenceTags: ['sodinokibi', 'lateral-movement'],
      investigationPhase: 'Analysis',
      priority: 'critical',
      notes: 'Attacked via RDP brute-force'
    });
  }, { timeout: 3500 });

  // Verify "Saved" indicator
  expect(screen.getByText('Saved')).toBeInTheDocument();
});
```

---

#### Scenario 4.2: Reject Invalid Case ID Format

**Given** the user is editing forensic metadata
**And** the Case ID field is focused

**When** the user enters "CASE@#$123!" (contains invalid characters)
**And** the user blurs the field (clicks outside)

**Then** the system shall:
- Display validation error: "Case ID must be alphanumeric with hyphens only (e.g., INC-2025-001)"
- Highlight the input field in red border
- Prevent saving metadata until fixed
- Show error icon next to field

**Validation**:
```typescript
// Component Test
test('should reject invalid case ID format', async () => {
  render(<ForensicMetadataEditor metadata={{}} onChange={jest.fn()} />);

  const caseIdInput = screen.getByLabelText('Case ID');

  // Enter invalid case ID
  await userEvent.type(caseIdInput, 'CASE@#$123!');
  await userEvent.tab(); // Blur field

  // Verify validation error displayed
  expect(screen.getByText(/Case ID must be alphanumeric with hyphens only/)).toBeInTheDocument();

  // Verify field highlighted
  expect(caseIdInput).toHaveClass('border-red-500');

  // Verify no save triggered
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});
```

---

### Feature 5: Version Comparison (FR-5)

#### Scenario 5.1: Compare Two Versions with Diff View

**Given** the user has two versions to compare:
- Version #1: `<h1>Report</h1><p>Initial findings.</p>`
- Version #2: `<h1>Report</h1><p>Initial findings. Added analysis.</p>`

**And** the user selects both versions for comparison

**When** the user clicks "View Comparison" button

**Then** the system shall:
- Open a modal/full-screen diff view
- Display Version #1 content on the left pane
- Display Version #2 content on the right pane
- Highlight changes:
  - Green background: "Added analysis." (addition)
  - No red highlights (no deletions in this example)
- Calculate diff stats: +1 addition, 0 deletions, 0 modifications
- Provide navigation controls: Next Change, Previous Change
- Allow exporting diff to HTML or copying to clipboard

**Validation**:
```typescript
// Integration Test
test('should display diff view comparing two versions', async () => {
  const versionOld = createMockVersion({
    versionNumber: 1,
    htmlContent: '<h1>Report</h1><p>Initial findings.</p>'
  });
  const versionNew = createMockVersion({
    versionNumber: 2,
    htmlContent: '<h1>Report</h1><p>Initial findings. Added analysis.</p>'
  });

  render(<VersionDiff versionA={versionOld} versionB={versionNew} />);

  // Verify header
  expect(screen.getByText('Version #1 vs. Version #2')).toBeInTheDocument();

  // Verify diff stats
  expect(screen.getByText('+1 / -0 / ~0')).toBeInTheDocument();

  // Verify highlighted addition
  const addedText = screen.getByText('Added analysis.');
  expect(addedText).toHaveClass('diff-addition'); // Green highlight

  // Verify navigation controls
  expect(screen.getByLabelText('Next change')).toBeInTheDocument();
  expect(screen.getByLabelText('Previous change')).toBeInTheDocument();
});
```

---

#### Scenario 5.2: Navigate Between Changes in Diff

**Given** the user is viewing a diff with 5 changes
**And** the user is currently viewing the first change

**When** the user clicks "Next Change" button

**Then** the system shall:
- Scroll viewport to the second change
- Highlight the active change (border or background color)
- Update navigation status (e.g., "Change 2 of 5")
- Disable "Previous" button on first change
- Disable "Next" button on last change

**Validation**:
```typescript
// Component Test
test('should navigate between diff changes', async () => {
  const versionOld = createMockVersion({
    htmlContent: '<p>Line 1</p><p>Line 2</p><p>Line 3</p>'
  });
  const versionNew = createMockVersion({
    htmlContent: '<p>Line 1 modified</p><p>Line 2</p><p>Line 3 modified</p>'
  });

  render(<VersionDiff versionA={versionOld} versionB={versionNew} />);

  // Verify status
  expect(screen.getByText('Change 1 of 2')).toBeInTheDocument();

  // Click "Next Change"
  await userEvent.click(screen.getByLabelText('Next change'));

  // Verify scrolled to second change
  expect(screen.getByText('Change 2 of 2')).toBeInTheDocument();

  // Verify "Next" button disabled (last change)
  expect(screen.getByLabelText('Next change')).toBeDisabled();

  // Click "Previous Change"
  await userEvent.click(screen.getByLabelText('Previous change'));

  // Verify back to first change
  expect(screen.getByText('Change 1 of 2')).toBeInTheDocument();
});
```

---

### Feature 6: Version Restoration (FR-6)

#### Scenario 6.1: Restore Previous Version with Confirmation

**Given** the user is viewing the version timeline
**And** the current report is at Version #5
**And** the user identifies an error introduced in Version #4

**When** the user clicks "Restore" on Version #3 card

**Then** the system shall:
- Display confirmation modal:
  ```
  Restore to Version #3?

  This will:
  - Save your current work as Version #6
  - Load Version #3 content into the editor
  - Preserve all version history

  [Cancel] [Restore Version]
  ```
- Wait for user confirmation

**And when** the user clicks "Restore Version"

**Then** the system shall:
- Save current state (Version #5 content) as Version #6 (auto-save)
- Load Version #3 HTML content (sanitized)
- Update Dashboard htmlContent state
- Update forensic metadata to match Version #3
- Display toast: "Restored to Version #3"
- Scroll to top of report
- Close confirmation modal
- Update version timeline to show Version #6 with description "Restored from Version #3"

**Validation**:
```typescript
// Integration Test
test('should restore previous version with confirmation', async () => {
  const versionToRestore = createMockVersion({
    versionNumber: 3,
    htmlContent: '<h1>Correct Version</h1>',
    forensicContext: { caseId: 'INC-2025-001' }
  });
  const currentVersion = createMockVersion({
    versionNumber: 5,
    htmlContent: '<h1>Error Version</h1>'
  });

  render(<Dashboard currentVersion={currentVersion} />);

  // Open version history
  await userEvent.click(screen.getByText('Version History'));

  // Click "Restore" on Version #3
  await userEvent.click(screen.getByTestId('restore-version-3'));

  // Verify confirmation modal
  expect(screen.getByText('Restore to Version #3?')).toBeInTheDocument();
  expect(screen.getByText(/Save your current work as Version #6/)).toBeInTheDocument();

  // Confirm restoration
  await userEvent.click(screen.getByText('Restore Version'));

  // Verify current state saved as Version #6
  await waitFor(() => {
    const versions = versionStorage.getAllVersions('default-report');
    const version6 = versions.find(v => v.versionNumber === 6);
    expect(version6).toBeTruthy();
    expect(version6.htmlContent).toContain('Error Version');
    expect(version6.changeDescription).toBe('Restored from Version #3');
  });

  // Verify Version #3 content loaded
  expect(screen.getByText('Correct Version')).toBeInTheDocument();

  // Verify forensic metadata updated
  expect(screen.getByDisplayValue('INC-2025-001')).toBeInTheDocument();

  // Verify toast notification
  expect(screen.getByText('Restored to Version #3')).toBeInTheDocument();
});
```

---

#### Scenario 6.2: Cancel Version Restoration

**Given** the user clicked "Restore" on a version
**And** the confirmation modal is displayed

**When** the user clicks "Cancel" button
**Or** presses the Escape key

**Then** the system shall:
- Close the confirmation modal
- Not save the current state
- Not load the selected version
- Maintain the current report content unchanged
- Return focus to the version timeline

**Validation**:
```typescript
// Component Test
test('should cancel version restoration', async () => {
  const versionToRestore = createMockVersion({ versionNumber: 3 });

  render(<ConfirmationModal
    title="Restore to Version #3?"
    onConfirm={jest.fn()}
    onCancel={jest.fn()}
  />);

  // Click "Cancel"
  await userEvent.click(screen.getByText('Cancel'));

  // Verify modal closed (component unmounted)
  expect(screen.queryByText('Restore to Version #3?')).not.toBeInTheDocument();

  // Verify no storage operations
  const versions = versionStorage.getAllVersions('default-report');
  expect(versions).toHaveLength(0); // No new versions saved
});

test('should close modal on Escape key', async () => {
  const onCancel = jest.fn();

  render(<ConfirmationModal
    title="Restore to Version #3?"
    onConfirm={jest.fn()}
    onCancel={onCancel}
  />);

  // Press Escape key
  await userEvent.keyboard('{Escape}');

  // Verify onCancel called
  expect(onCancel).toHaveBeenCalled();
});
```

---

### Feature 7: Storage Management

#### Scenario 7.1: Display Storage Usage Indicator

**Given** the user has saved 30 versions
**And** localStorage usage is at 3.2 MB / 10 MB (32%)

**When** the user views the Version History panel

**Then** the system shall:
- Display storage usage in panel header: "Storage: 3.2 MB / 10 MB (32%)"
- Show visual progress bar (green: <70%, yellow: 70-90%, red: >90%)
- Update usage in real-time after each save operation

**Validation**:
```typescript
// Component Test
test('should display storage usage indicator', () => {
  // Mock storage usage
  jest.spyOn(versionStorage, 'getStorageUsage').mockReturnValue({
    used: 3.2 * 1024 * 1024, // 3.2 MB in bytes
    available: 10 * 1024 * 1024, // 10 MB
    percentage: 32
  });

  render(<VersionHistoryPanel />);

  // Verify storage display
  expect(screen.getByText('Storage: 3.2 MB / 10 MB (32%)')).toBeInTheDocument();

  // Verify progress bar color (green)
  const progressBar = screen.getByRole('progressbar');
  expect(progressBar).toHaveClass('bg-green-500');
});
```

---

#### Scenario 7.2: Export Versions to JSON File

**Given** the user wants to backup all versions
**And** the user has 50 versions stored

**When** the user clicks "Export All Versions" button

**Then** the system shall:
- Generate JSON file with structure:
  ```json
  {
    "exportDate": "2025-11-22T14:30:15.000Z",
    "reportId": "default-report",
    "versionCount": 50,
    "versions": [...]
  }
  ```
- Trigger browser download: `dfir-cortex-versions-default-report-20251122.json`
- Display toast: "Exported 50 versions to JSON"
- File size approximately 2-5 MB (uncompressed)

**Validation**:
```typescript
// Integration Test
test('should export versions to JSON file', async () => {
  const mockVersions = Array.from({ length: 50 }, (_, i) => createMockVersion({ versionNumber: i + 1 }));
  localStorage.setItem('dfir-cortex:versions:default-report', JSON.stringify(mockVersions));

  render(<VersionHistoryPanel />);

  // Mock download trigger
  const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  const downloadLinkSpy = jest.spyOn(document, 'createElement');

  // Click export
  await userEvent.click(screen.getByText('Export All Versions'));

  // Verify JSON content
  const exportedData = await versionStorage.exportVersionsToJSON('default-report');
  const parsed = JSON.parse(exportedData);

  expect(parsed.reportId).toBe('default-report');
  expect(parsed.versionCount).toBe(50);
  expect(parsed.versions).toHaveLength(50);

  // Verify toast
  expect(screen.getByText('Exported 50 versions to JSON')).toBeInTheDocument();
});
```

---

### Feature 8: Security & Validation

#### Scenario 8.1: Sanitize HTML Before Saving Version

**Given** the user has modified a report via AI command
**And** the AI response contains malicious HTML:
  ```html
  <h1>Report</h1><script>alert('XSS')</script><p>Content</p>
  ```

**When** the system saves the version to localStorage

**Then** the system shall:
- Apply `sanitizeHtml()` from SPEC-SECURITY-001
- Remove the `<script>` tag and content
- Persist sanitized HTML:
  ```html
  <h1>Report</h1><p>Content</p>
  ```
- Log sanitization event: `[SECURITY] Removed malicious content before version save`
- Save version successfully with clean HTML

**Validation**:
```typescript
// Integration Test
test('should sanitize HTML before saving version', async () => {
  const maliciousHtml = '<h1>Report</h1><script>alert("XSS")</script><p>Content</p>';

  const version: ReportVersion = {
    id: crypto.randomUUID(),
    reportId: 'test-report',
    versionNumber: 1,
    timestamp: Date.now(),
    htmlContent: maliciousHtml,
    changeDescription: 'Test',
    createdBy: { userId: '1', username: 'test', role: 'Analyst' },
    isAutoSave: false
  };

  // Spy on sanitization service
  const sanitizeSpy = jest.spyOn(sanitizationService, 'sanitizeHtml');

  await versionStorage.saveVersion(version);

  // Verify sanitization called
  expect(sanitizeSpy).toHaveBeenCalledWith(maliciousHtml);

  // Verify malicious content removed
  const saved = localStorage.getItem('dfir-cortex:versions:test-report');
  const parsed = JSON.parse(saved);
  expect(parsed[0].htmlContent).not.toContain('<script>');
  expect(parsed[0].htmlContent).toContain('<h1>Report</h1>');
  expect(parsed[0].htmlContent).toContain('<p>Content</p>');
});
```

---

#### Scenario 8.2: Sanitize HTML Before Rendering in Diff View

**Given** a stored version contains potentially unsafe HTML (from legacy data)
**And** the user opens the diff view comparing this version to another

**When** the VersionDiff component renders the HTML content

**Then** the system shall:
- Sanitize both versions' HTML before rendering
- Display sanitized content in diff panes
- Prevent XSS execution in diff preview
- Log sanitization events if dangerous content detected

**Validation**:
```typescript
// Component Test
test('should sanitize HTML before rendering in diff view', () => {
  const versionWithScript = createMockVersion({
    htmlContent: '<h1>Test</h1><script>alert(1)</script>'
  });
  const versionClean = createMockVersion({
    htmlContent: '<h1>Test</h1><p>Safe</p>'
  });

  const sanitizeSpy = jest.spyOn(sanitizationService, 'sanitizeHtml');

  render(<VersionDiff versionA={versionWithScript} versionB={versionClean} />);

  // Verify sanitization called for both versions
  expect(sanitizeSpy).toHaveBeenCalledTimes(2);

  // Verify script tag not rendered
  expect(screen.queryByText(/alert\(1\)/)).not.toBeInTheDocument();

  // Verify safe content rendered
  expect(screen.getByText('Test')).toBeInTheDocument();
  expect(screen.getByText('Safe')).toBeInTheDocument();
});
```

---

## PERFORMANCE ACCEPTANCE CRITERIA

### Scenario P.1: Version Timeline Renders Within 500ms

**Given** the user has 50 saved versions
**And** the user opens the Version History panel

**When** the VersionTimeline component initializes

**Then** the system shall:
- Load versions from localStorage within 100ms
- Render initial visible version cards within 500ms total
- Use virtual scrolling if performance degrades with 100+ versions
- Maintain 60fps scroll performance

**Validation**:
```typescript
// Performance Test
test('should render version timeline within 500ms for 50 versions', async () => {
  const mockVersions = Array.from({ length: 50 }, (_, i) => createMockVersion({ versionNumber: i + 1 }));

  const startTime = performance.now();

  render(<VersionTimeline versions={mockVersions} />);

  await waitFor(() => {
    expect(screen.getAllByTestId('version-card')).toHaveLength(50);
  });

  const endTime = performance.now();
  const renderTime = endTime - startTime;

  expect(renderTime).toBeLessThan(500); // 500ms target
});
```

---

### Scenario P.2: Diff Calculation Completes Within 2 Seconds

**Given** the user is comparing two versions with 1MB HTML each
**And** the user clicks "View Comparison"

**When** the VersionDiff component calculates the diff

**Then** the system shall:
- Complete diff calculation within 2000ms (P95 latency)
- Display loading indicator if calculation exceeds 500ms
- Render diff results progressively (show header first, then diff content)

**Validation**:
```typescript
// Performance Test
test('should calculate diff within 2 seconds for 1MB HTML', async () => {
  const largeHtml1 = '<p>' + 'x'.repeat(1024 * 1024) + '</p>'; // 1MB
  const largeHtml2 = '<p>' + 'y'.repeat(1024 * 1024) + '</p>'; // 1MB (different)

  const versionOld = createMockVersion({ htmlContent: largeHtml1 });
  const versionNew = createMockVersion({ htmlContent: largeHtml2 });

  const startTime = performance.now();

  render(<VersionDiff versionA={versionOld} versionB={versionNew} />);

  await waitFor(() => {
    expect(screen.getByTestId('diff-renderer')).toBeInTheDocument();
  }, { timeout: 2500 });

  const endTime = performance.now();
  const diffTime = endTime - startTime;

  expect(diffTime).toBeLessThan(2000); // 2s target
});
```

---

## ACCESSIBILITY ACCEPTANCE CRITERIA

### Scenario A.1: Keyboard Navigation Through Version Timeline

**Given** the user is navigating with keyboard only (no mouse)
**And** the Version History panel is open

**When** the user presses Tab key repeatedly

**Then** the system shall:
- Focus each version card in sequential order
- Display visible focus indicator (blue outline)
- Allow Enter key to expand version card details
- Allow Space key to select version for comparison
- Allow Escape key to close version history panel
- Support arrow keys for navigation (Up/Down)

**Validation**:
```typescript
// Accessibility Test
test('should support keyboard navigation', async () => {
  const mockVersions = [
    createMockVersion({ versionNumber: 1 }),
    createMockVersion({ versionNumber: 2 })
  ];

  render(<VersionTimeline versions={mockVersions} />);

  // Tab to first version card
  await userEvent.tab();
  expect(screen.getByTestId('version-card-1')).toHaveFocus();

  // Tab to second version card
  await userEvent.tab();
  expect(screen.getByTestId('version-card-2')).toHaveFocus();

  // Press Enter to expand
  await userEvent.keyboard('{Enter}');
  expect(screen.getByTestId('version-card-2-details')).toBeVisible();

  // Press Escape to close
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByTestId('version-card-2-details')).not.toBeVisible();
});
```

---

### Scenario A.2: Screen Reader Announces Version Information

**Given** a screen reader user (NVDA, JAWS) is using the application
**And** the Version History panel is open

**When** the screen reader focuses a version card

**Then** the system shall:
- Announce: "Version 5, created by John Doe, 2 hours ago, Manual save, Case ID INC-2025-001, Malware Analysis"
- Provide ARIA labels for action buttons: "Restore Version 5", "Compare Version 5", "Delete Version 5"
- Announce auto-save indicator: "Auto-saved version" (if applicable)
- Announce diff stats: "15 additions, 3 deletions"

**Validation**:
```typescript
// Accessibility Test (ARIA labels)
test('should provide ARIA labels for screen readers', () => {
  const version = createMockVersion({
    versionNumber: 5,
    createdBy: { userId: '1', username: 'John Doe', role: 'Analyst' },
    forensicContext: { caseId: 'INC-2025-001', incidentType: 'Malware Analysis' },
    isAutoSave: false,
    diffStats: { additions: 15, deletions: 3, modifications: 0 }
  });

  render(<VersionCard version={version} />);

  // Verify main ARIA label
  const card = screen.getByRole('article');
  expect(card).toHaveAccessibleName(/Version 5, created by John Doe/);

  // Verify action button labels
  expect(screen.getByLabelText('Restore Version 5')).toBeInTheDocument();
  expect(screen.getByLabelText('Compare Version 5')).toBeInTheDocument();
  expect(screen.getByLabelText('Delete Version 5')).toBeInTheDocument();

  // Verify diff stats announcement
  expect(screen.getByLabelText('15 additions, 3 deletions')).toBeInTheDocument();
});
```

---

## DEFINITION OF DONE

### Feature Complete Checklist

- [ ] All 7 functional requirements (FR-1 through FR-7) implemented
- [ ] All 28 acceptance scenarios pass (automated tests green)
- [ ] Performance benchmarks validated (timeline <500ms, diff <2s)
- [ ] Accessibility compliance (WCAG 2.1 AA) verified
- [ ] Security validation (HTML sanitization on save/load/render)
- [ ] Code coverage ≥90% (unit + integration tests)
- [ ] No console errors or warnings in production build
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive design verified (tablet and phone)
- [ ] User documentation updated (how to use version history)
- [ ] Code review completed (self-review + optional peer review)

### Quality Gates (TRUST 5)

**Test-First (T)**:
- [ ] All tests written before implementation (TDD RED-GREEN-REFACTOR)
- [ ] Vitest unit tests: 90%+ coverage for services and utilities
- [ ] React Testing Library component tests: 85%+ coverage
- [ ] Playwright E2E tests: Critical user journey validated

**Readable (R)**:
- [ ] TypeScript interfaces documented with JSDoc
- [ ] Complex algorithms explained (diff calculation, quota management)
- [ ] Consistent code style (Prettier formatting, ESLint rules)
- [ ] Component props clearly defined and typed

**Unified (U)**:
- [ ] Reusable components (ConfirmationModal, VersionCard)
- [ ] Centralized error handling (try-catch with user-friendly messages)
- [ ] Shared utility functions (metadataValidation, diffService)
- [ ] Consistent UI patterns (Tailwind classes, dark theme)

**Secured (S)**:
- [ ] HTML sanitization applied on save/load/render (SPEC-SECURITY-001)
- [ ] Input validation for forensic metadata (regex patterns, max lengths)
- [ ] localStorage quota management (prevent exhaustion attacks)
- [ ] No XSS vulnerabilities (all tests pass OWASP XSS payloads)

**Trackable (T)**:
- [ ] All commits tagged with SPEC-VERSION-001
- [ ] Git branch: feature/SPEC-VERSION-001
- [ ] Changelog updated with user-facing changes
- [ ] Version metadata tracks user, timestamp, change description

---

**End of Acceptance Criteria - SPEC-VERSION-001**
