## Features

### Version History and Management (SPEC-VERSION-001)

This application provides comprehensive version history management for forensic reports:

- **Auto-Save**: Automatic saving every 30 seconds with debouncing to prevent excessive operations
- **Version Timeline**: Virtual scrolling UI displaying all versions in reverse chronological order
- **Diff Viewer**: Side-by-side HTML comparison with color-coded additions (green) and deletions (red)
- **Version Restoration**: Restore previous versions with confirmation and automatic sanitization
- **Forensic Metadata**: Track investigation context including case ID, incident type, analyst assignment
- **Storage Management**: Automatic quota management (5MB) with intelligent pruning of old auto-saves
- **Compression**: Large HTML content automatically compressed with lz-string for efficient storage

#### Implementation Components

- **Storage**: `services/versionStorageService.ts` - localStorage management with quota handling
- **Utilities**: `services/versionUtils.ts` - Version comparison, sorting, and analysis
- **Hooks**:
  - `hooks/useAutoSave.ts` - Auto-save state and control
  - `hooks/useVersionHistory.ts` - Version history state management
- **Components**:
  - `components/VersionTimeline.tsx` - Virtual scrolled version list
  - `components/VersionHistoryPanel.tsx` - Sidebar with version controls
  - `components/VersionDiffViewer.tsx` - Diff comparison modal
  - `components/ForensicMetadataEditor.tsx` - Investigation context editor
  - `components/VersionRestorationModal.tsx` - Restoration workflow

For integration instructions, see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md).

### Security Features

#### XSS Protection with DOMPurify

This application implements comprehensive HTML sanitization to prevent Cross-Site Scripting (XSS) vulnerabilities:

- **Automatic Sanitization**: All HTML content is automatically sanitized using DOMPurify before rendering in the report viewer
- **Defense-in-Depth**: Client-side sanitization combined with iframe sandboxing provides multi-layer protection
- **OWASP Compliance**: Implementation follows OWASP A7:2017 (XSS Prevention) and A03:2021 (Injection) guidelines
- **Version History Integration**: All restored versions are automatically sanitized for security

#### Implementation Details

- **Service**: `services/sanitizationService.ts` - Centralized sanitization utility
- **Integration Points**:
  - ReportRenderer component: Sanitizes HTML before iframe rendering
  - Dashboard component: Sanitizes AI-generated content before state update
  - Version restoration: Sanitizes HTML before restoring to prevent XSS
- **Configuration**: Whitelist-based filtering allows safe HTML tags while blocking dangerous elements and event handlers

For detailed security architecture and threat model analysis, see [SECURITY.md](.moai/docs/SECURITY.md).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
