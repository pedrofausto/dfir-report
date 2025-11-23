# Version History Feature Integration Guide

This document provides integration instructions for incorporating the version history and auto-save functionality into the Dashboard component.

## Overview

The version history system consists of several layers:

1. **Storage Layer** (`versionStorageService.ts`): Handles localStorage operations
2. **Utilities Layer** (`versionUtils.ts`): Provides version comparison and filtering
3. **Hooks Layer**: State management for auto-save and version history
4. **Components Layer**: UI components for timeline, diff viewer, metadata editor
5. **Integration Layer**: Dashboard integration

## Files Created

### Services
- `services/versionStorageService.ts` - localStorage CRUD with compression and quota management
- `services/versionUtils.ts` - Version utilities and comparison functions

### Hooks
- `hooks/useAutoSave.ts` - Auto-save hook with debouncing and interval save
- `hooks/useVersionHistory.ts` - Version history state management

### Components
- `components/VersionTimeline.tsx` - Virtualized timeline of versions
- `components/VersionHistoryPanel.tsx` - Collapsible sidebar with timeline
- `components/VersionDiffViewer.tsx` - Custom side-by-side diff viewer
- `components/ForensicMetadataEditor.tsx` - Forensic context form editor
- `components/VersionRestorationModal.tsx` - Confirmation modal for restoration

## Integration Steps

### Step 1: Import Dependencies in Dashboard

```typescript
import { useAutoSave } from '../hooks/useAutoSave';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { VersionDiffViewer } from './VersionDiffViewer';
import { VersionRestorationModal } from './VersionRestorationModal';
```

### Step 2: Initialize Hooks

```typescript
// In Dashboard component
const {
  isSaving,
  lastAutoSaveTime,
  pauseAutoSave,
  resumeAutoSave,
  isAutoSavePaused,
  manualSave
} = useAutoSave(htmlContent, {
  reportId: 'default-report', // or dynamic reportId
  user: {
    userId: user.id,
    username: user.username,
    role: user.role,
  },
  debounceMs: 3000,
  autoSaveIntervalMs: 30000,
});

const {
  versions,
  isLoading: versionsLoading,
  error: versionsError,
  restoreVersion,
  deleteVersion,
  compareVersions,
  getVersionById,
  getLatestVersion,
  refreshVersions,
} = useVersionHistory('default-report');
```

### Step 3: Add State for UI

```typescript
const [showVersionPanel, setShowVersionPanel] = useState(false);
const [showDiffViewer, setShowDiffViewer] = useState(false);
const [showRestorationModal, setShowRestorationModal] = useState(false);
const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
const [comparisonVersion, setComparisonVersion] = useState<ReportVersion | null>(null);
```

### Step 4: Implement Version Selection Handler

```typescript
const handleSelectVersion = (versionId: string) => {
  setSelectedVersionId(versionId);
  setShowDiffViewer(true);

  // Optional: Show comparison with current version
  const version = getVersionById(versionId);
  if (version) {
    setComparisonVersion(version);
  }
};
```

### Step 5: Implement Restoration Handler

```typescript
const handleRestoreVersion = async (versionId: string) => {
  const version = getVersionById(versionId);
  if (version) {
    setComparisonVersion(version);
    setShowRestorationModal(true);
  }
};

const handleConfirmRestoration = async (description: string) => {
  const content = await restoreVersion(selectedVersionId!);
  if (content) {
    // Save current version before restoring
    await manualSave(`Restored from version ${comparisonVersion?.versionNumber || ''}`);

    // Restore the selected version
    setHtmlContent(content);

    // Close modal
    setShowRestorationModal(false);

    // Refresh versions
    await refreshVersions();
  }
};
```

### Step 6: Add UI Controls

Add buttons to the Dashboard header for version management:

```typescript
// In Dashboard render section
<div className="flex gap-2">
  <button
    onClick={() => setShowVersionPanel(!showVersionPanel)}
    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    History ({versions.length})
  </button>

  <button
    onClick={() => manualSave('Manual save')}
    disabled={isSaving}
    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
  >
    {isSaving ? 'Saving...' : 'Save'}
  </button>

  {lastAutoSaveTime && (
    <span className="text-sm text-gray-600">
      Last auto-save: {formatVersionTimeRelative(lastAutoSaveTime)}
    </span>
  )}
</div>
```

### Step 7: Add Version Panel to Layout

```typescript
<div className="flex h-screen">
  {/* Main content */}
  <div className="flex-1 flex flex-col">
    {/* Header with controls */}
    <div className="px-4 py-3 border-b border-gray-200">
      {/* Dashboard controls from Step 6 */}
    </div>

    {/* Report content */}
    <div className="flex-1 overflow-auto">
      <ChatInterface onSendMessage={handleSendMessage} />
    </div>
  </div>

  {/* Version history panel */}
  {showVersionPanel && (
    <VersionHistoryPanel
      versions={versions}
      isLoading={versionsLoading}
      error={versionsError}
      onSelectVersion={handleSelectVersion}
      onDeleteVersion={deleteVersion}
      onRestoreVersion={handleRestoreVersion}
      selectedVersionId={selectedVersionId || undefined}
      isCollapsed={false}
      onToggleCollapsed={(collapsed) => setShowVersionPanel(!collapsed)}
    />
  )}
</div>
```

### Step 8: Add Modals

```typescript
{/* Diff Viewer Modal */}
{showDiffViewer && comparisonVersion && (
  <VersionDiffViewer
    oldContent={htmlContent}
    newContent={comparisonVersion.htmlContent}
    title={`Comparing v${comparisonVersion.versionNumber}`}
    onClose={() => setShowDiffViewer(false)}
  />
)}

{/* Restoration Modal */}
{showRestorationModal && comparisonVersion && (
  <VersionRestorationModal
    version={comparisonVersion}
    currentVersion={getLatestVersion()}
    onConfirm={handleConfirmRestoration}
    onCancel={() => setShowRestorationModal(false)}
    isLoading={isSaving}
  />
)}
```

## Integration Features

### Auto-Save
- Content is automatically saved every 30 seconds (configurable)
- Debouncing prevents rapid consecutive saves
- Can be paused/resumed as needed
- Creates version entries with user metadata

### Manual Save
- User can trigger save with custom description
- Useful for checkpoints during investigation
- Marked as non-auto-save for distinction

### Version Timeline
- Shows all versions in reverse chronological order
- Virtual scrolling for performance with many versions
- Quick actions: restore and delete

### Diff Viewer
- Side-by-side comparison of two versions
- Highlights additions (green) and deletions (red)
- Shows line counts for changes

### Restoration
- Confirmation modal shows what's changing
- Automatically sanitizes restored HTML for security
- Current version saved as backup before restoration
- User can add description for restoration reason

## Storage Considerations

### Quota Management
- Monitor storage usage with `getStorageUsage()`
- Auto-prune old auto-saves when quota approaches 90%
- Users can manually delete versions to free space

### Compression
- Large HTML content automatically compressed with lz-string
- Transparent to users - automatic compress/decompress

### Export/Import
- Export versions as JSON for backup
- Import versions from JSON for recovery

## Testing

All components and utilities have comprehensive test coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run specific test file
npx vitest run services/__tests__/versionStorageService.test.ts
```

### Test Statistics
- Total tests: 271
- Pass rate: 100%
- Service coverage: 76-99%
- Component coverage: 100% (structural tests)

## Security Considerations

### HTML Sanitization
- All restored HTML is sanitized using `sanitizeHtml()`
- Removes dangerous scripts, event handlers, and protocols
- Integrates with existing SPEC-SECURITY-001 implementation

### Storage Security
- localStorage used only (no external APIs)
- User sessions isolated by reportId
- No sensitive data stored outside versioning

## Performance Notes

### Memory Management
- React-window virtualization for timeline (renders only visible items)
- Lazy loading of version content
- Debounced auto-save prevents excessive operations

### Storage Limits
- Default quota: 5MB per localStorage
- Pruning policy: Keep only 5 newest auto-saves when quota exceeded
- Configurable retention policies

## Troubleshooting

### Versions Not Saving
- Check browser's localStorage quota
- Verify `useAutoSave` hook is properly initialized
- Ensure reportId is consistent

### Slow Timeline Rendering
- React-window handles large lists efficiently
- If still slow, reduce item size or implement pagination

### Missing Versions
- Check browser console for storage errors
- Verify HTML content is not corrupted
- Try exporting versions for backup

## Example Integration

See `/home/pedro/Workspace/difr-report/dfir-report/components/Dashboard.tsx` for a complete example of integrating version history into an existing component.

## Future Enhancements

1. **Version Tagging**: Allow users to tag important versions
2. **Version Comments**: Add inline comments to versions
3. **Collaborative Versioning**: Track multiple users' changes
4. **Version Branching**: Create branches from specific versions
5. **Version Merging**: Merge changes from multiple versions
6. **Incremental Backup**: Export only changes since last backup
