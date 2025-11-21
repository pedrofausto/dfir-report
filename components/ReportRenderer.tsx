import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { sanitizeHtml, logSanitizationEvent } from '../services/sanitizationService';

export interface ReportRendererRef {
  getBodyContent: () => string;
  getHeadContent: () => string;
}

interface ReportRendererProps {
  htmlContent: string;
}

const ReportRenderer = forwardRef<ReportRendererRef, ReportRendererProps>(({ htmlContent }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    getBodyContent: () => {
      return iframeRef.current?.contentDocument?.body?.innerHTML || '';
    },
    getHeadContent: () => {
      return iframeRef.current?.contentDocument?.head?.innerHTML || '';
    }
  }));

  // Update iframe content when htmlContent changes
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        // Sanitize HTML before writing to iframe to prevent XSS attacks
        const sanitizationResult = sanitizeHtml(htmlContent);

        // Log security event if dangerous content was removed
        logSanitizationEvent('ReportRenderer.tsx', sanitizationResult);

        // Write only sanitized HTML to iframe
        doc.open();
        doc.write(sanitizationResult.sanitized);
        doc.close();
      }
    }
  }, [htmlContent]);

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner border border-gray-200">
      <iframe 
        ref={iframeRef}
        title="DFIR Report Preview"
        className="w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-same-origin allow-modals" 
      />
    </div>
  );
});

export default ReportRenderer;