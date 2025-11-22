<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1aYdkXAtobi5TkpYAB4Xm0ekjtERK9Xt_

## Security Features

### XSS Protection with DOMPurify

This application implements comprehensive HTML sanitization to prevent Cross-Site Scripting (XSS) vulnerabilities:

- **Automatic Sanitization**: All HTML content is automatically sanitized using DOMPurify before rendering in the report viewer
- **Defense-in-Depth**: Client-side sanitization combined with iframe sandboxing provides multi-layer protection
- **OWASP Compliance**: Implementation follows OWASP A7:2017 (XSS Prevention) and A03:2021 (Injection) guidelines

#### Implementation Details

- **Service**: `services/sanitizationService.ts` - Centralized sanitization utility
- **Integration Points**:
  - ReportRenderer component: Sanitizes HTML before iframe rendering
  - Dashboard component: Sanitizes AI-generated content before state update
- **Configuration**: Whitelist-based filtering allows safe HTML tags while blocking dangerous elements and event handlers

For detailed security architecture and threat model analysis, see [SECURITY.md](.moai/docs/SECURITY.md).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
