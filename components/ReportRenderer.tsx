import React, { useEffect, useRef } from 'react';

interface ReportRendererProps {
  htmlContent: string;
}

const ReportRenderer: React.FC<ReportRendererProps> = ({ htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe content when htmlContent changes
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        
        // Optional: Inject a script to auto-resize height? 
        // For now, we use flex-grow in the parent to fill space.
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
};

export default ReportRenderer;
