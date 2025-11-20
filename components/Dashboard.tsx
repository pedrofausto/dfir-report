import React, { useState, useRef } from 'react';
import { User, UserRole, ChatMessage } from '../types';
import { INITIAL_REPORT_HTML } from '../constants';
import { generateReportModification } from '../services/geminiService';
import ReportRenderer, { ReportRendererRef } from './ReportRenderer';
import ChatInterface from './ChatInterface';
import { LogOut, FileCode, ShieldCheck, LayoutDashboard, Download, Loader2, FileText } from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [htmlContent, setHtmlContent] = useState<string>(INITIAL_REPORT_HTML);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  
  const reportRendererRef = useRef<ReportRendererRef>(null);

  const handleSendMessage = async (text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);

    try {
      // Call the "MCP" service (Gemini)
      const newHtml = await generateReportModification(htmlContent, text);
      
      setHtmlContent(newHtml);
      
      const responseMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I've updated the report based on your request. The visual model has been regenerated.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, responseMessage]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I encountered an error attempting to modify the HTML structure. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRendererRef.current) return;
    
    setIsExporting(true);
    try {
        // Get the RENDERED content from the iframe to ensure JS-generated elements (like Timeline) are included
        const renderedBody = reportRendererRef.current.getBodyContent();
        const renderedHead = reportRendererRef.current.getHeadContent();

        // Create a temporary container to parse metadata
        const parser = new DOMParser();
        const tempDoc = parser.parseFromString(renderedBody, 'text/html');
        
        const reportTitle = tempDoc.querySelector('h1')?.textContent || "Incident Response Report";
        const incidentMeta = tempDoc.querySelector('.header-meta')?.textContent || "DFIR Analysis";
        
        // Create Export Container
        const element = document.createElement('div');
        element.className = 'pdf-export-container';
        
        // --- STYLES ---
        // Parse styles from the HEAD content we extracted from the iframe
        // This ensures we get the CSS variables and styles defined in the report
        const styleMatch = renderedHead.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        const extractedStyles = styleMatch ? styleMatch.map(tag => {
            return tag.replace(/<style[^>]*>|<\/style>/gi, '')
                      .replace(/:root/g, '.pdf-export-container')
                      .replace(/body/g, '.pdf-export-container');
        }).join('\n') : '';
        
        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
            ${extractedStyles}
            .pdf-export-container {
                font-family: 'Inter', sans-serif;
                background-color: #0f1419;
                color: #e4e6eb;
                width: 100%;
                padding: 0;
                /* Reset styles that might conflict */
                box-sizing: border-box;
            }
            .pdf-cover-page {
                height: 1120px; /* Approx A4 height at 96dpi */
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                border-bottom: 1px solid #2d3748;
                background: radial-gradient(circle at center, #1a1f2e 0%, #0f1419 100%);
                margin-bottom: 0;
                padding: 40px;
                position: relative;
            }
            .pdf-page-break {
                page-break-after: always;
                height: 0;
                display: block;
                clear: both;
            }
            .cover-logo {
                font-size: 60px;
                margin-bottom: 20px;
            }
            .cover-title {
                font-size: 42px;
                font-weight: 700;
                margin-bottom: 20px;
                color: #3b82f6;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .cover-meta {
                font-size: 18px;
                color: #a8b3cf;
                margin-bottom: 60px;
                font-family: 'JetBrains Mono', monospace;
            }
            .cover-footer {
                position: absolute;
                bottom: 50px;
                width: 100%;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #2d3748;
                padding-top: 20px;
            }
            .classification-banner {
                background-color: #ef4444;
                color: white;
                padding: 5px 20px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 4px;
                margin-bottom: 40px;
                font-size: 14px;
                border-radius: 4px;
            }
            /* Ensure grid items wrap correctly in PDF */
            .pdf-export-container .quick-stats,
            .pdf-export-container .attack-vectors {
                display: block !important;
            }
            .pdf-export-container .stat-card,
            .pdf-export-container .vector-card {
                display: inline-block;
                width: 48%;
                margin: 1%;
                vertical-align: top;
                page-break-inside: avoid;
            }
        `;
        element.appendChild(styleTag);
        
        // --- COVER PAGE ---
        if (includeCoverPage) {
            const cover = document.createElement('div');
            cover.className = 'pdf-cover-page';
            
            cover.innerHTML = `
                <div class="classification-banner">TLP:AMBER - STRICTLY CONFIDENTIAL</div>
                <div class="cover-logo">🛡️</div>
                <h1 class="cover-title">${reportTitle}</h1>
                <div class="cover-meta">
                    <p>${incidentMeta}</p>
                    <p style="margin-top: 20px;">Generated By: ${user.username.toUpperCase()}</p>
                    <p>Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                </div>
                
                <div style="margin-top: 40px; padding: 20px; background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 8px; max-width: 600px;">
                    <h3 style="color: #3b82f6; margin-bottom: 10px; font-size: 16px;">EXECUTIVE SUMMARY</h3>
                    <p style="font-size: 14px; color: #e4e6eb; line-height: 1.6;">
                        This document contains sensitive digital forensics analysis regarding Incident #${incidentMeta.match(/#\d+/) ? incidentMeta.match(/#\d+/)?.[0] : 'Unknown'}. 
                        Unauthorized distribution is prohibited.
                    </p>
                </div>

                <div class="cover-footer">
                    DFIR CORTEX SYSTEM | AUTOMATED REPORT GENERATION | ID: ${Date.now().toString(36).toUpperCase()}
                </div>
            `;
            element.appendChild(cover);
            
            // Force Page Break
            const breakDiv = document.createElement('div');
            breakDiv.className = 'pdf-page-break';
            element.appendChild(breakDiv);
        }
        
        // --- MAIN CONTENT ---
        const bodyContent = document.createElement('div');
        bodyContent.innerHTML = renderedBody;
        // Add padding for PDF view
        bodyContent.style.padding = '40px'; 
        
        // Remove script tags to prevent double execution or weird artifacts
        const scripts = bodyContent.querySelectorAll('script');
        scripts.forEach(s => s.remove());

        element.appendChild(bodyContent);
        
        const filename = `DFIR-Report-${new Date().toISOString().split('T')[0]}.pdf`;

        const opt = {
          margin: [0, 0, 0, 0], // No margin on the PDF itself, we handle padding in CSS
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, 
              useCORS: true,
              letterRendering: true,
              backgroundColor: '#0f1419',
              logging: false,
              allowTaint: true
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        const html2pdf = (window as any).html2pdf;
        if (html2pdf) {
            await html2pdf().set(opt).from(element).save();
        } else {
            console.error("html2pdf library not loaded");
            alert("Export functionality is currently unavailable.");
        }
    } catch (error) {
        console.error("Export PDF Error:", error);
        alert("Failed to export PDF.");
    } finally {
        setIsExporting(false);
    }
  };

  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.ANALYST;

  return (
    <div className="flex flex-col h-screen bg-cyber-900 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-cyber-800 border-b border-cyber-600 flex items-center justify-between px-6 z-20 shadow-md shrink-0">
        <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-cyber-500" />
            <div>
                <h1 className="text-white font-bold font-mono tracking-wide">DFIR CORTEX</h1>
                <div className="flex items-center gap-2">
                     <span className="text-[10px] bg-cyber-600 text-cyber-300 px-1.5 rounded border border-cyber-500">CLASSIFIED</span>
                     <span className="text-[10px] text-gray-400">Case #3167</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-cyber-900 rounded-full border border-cyber-600">
                <img src={user.avatarUrl} alt="User" className="w-8 h-8 rounded-full border border-gray-500" />
                <div className="flex flex-col">
                    <span className="text-sm text-white font-medium leading-none">{user.username}</span>
                    <span className="text-xs text-cyber-500 font-mono leading-none mt-1">{user.role}</span>
                </div>
            </div>
            <button 
                onClick={onLogout}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-cyber-700 rounded-full"
                title="Logout"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Content Area - Column Layout */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top: Report View - Takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="h-10 bg-cyber-800 border-b border-cyber-600 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Report Preview</span>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Cover Page Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer group" title="Include Cover Page in PDF">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeCoverPage ? 'bg-cyber-500 border-cyber-500' : 'border-gray-500 bg-transparent'}`}>
                           {includeCoverPage && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                        </div>
                        <input 
                            type="checkbox" 
                            checked={includeCoverPage} 
                            onChange={() => setIncludeCoverPage(!includeCoverPage)} 
                            className="hidden"
                        />
                        <span className={`text-xs ${includeCoverPage ? 'text-cyber-500' : 'text-gray-500'} group-hover:text-white transition-colors`}>
                            Cover Page
                        </span>
                    </label>

                    <div className="h-4 w-px bg-cyber-600 mx-1"></div>

                    <button 
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 text-xs bg-cyber-700 hover:bg-cyber-600 text-white px-3 py-1 rounded border border-cyber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export to PDF"
                    >
                        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        <span>{isExporting ? 'Generating PDF...' : 'Export PDF'}</span>
                    </button>

                    {canEdit && (
                        <button 
                            onClick={() => setShowChat(!showChat)}
                            className={`text-xs px-3 py-1 rounded border ${showChat ? 'bg-cyber-500 text-white border-cyber-500' : 'bg-cyber-900 text-gray-400 border-cyber-600'}`}
                        >
                            {showChat ? 'Hide AI Assistant' : 'Show AI Assistant'}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 bg-gray-100 p-4 overflow-hidden relative">
                <ReportRenderer ref={reportRendererRef} htmlContent={htmlContent} />
                
                {/* Overlay for Viewer Role */}
                {!canEdit && (
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm border border-white/10">
                        Read Only Mode
                    </div>
                )}

                {/* AI Processing Loading Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-cyber-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-50 transition-opacity duration-300">
                      <div className="bg-cyber-800 p-6 rounded-xl border border-cyber-600 shadow-2xl flex flex-col items-center">
                          <div className="relative">
                            <Loader2 className="w-10 h-10 text-cyber-500 animate-spin" />
                            <div className="absolute inset-0 bg-cyber-500/20 blur-xl rounded-full"></div>
                          </div>
                          <p className="text-white font-mono font-bold tracking-wider mt-4">AI REGENERATING REPORT</p>
                          <p className="text-cyber-400 text-xs mt-1 font-mono">Applying forensic updates...</p>
                      </div>
                  </div>
                )}
            </div>
        </div>

        {/* Bottom: Chat/MCP Interface (Only for Admin/Analyst) - Fixed reduced height */}
        {canEdit && (
            <div 
                className={`w-full transition-all duration-300 ease-in-out border-t border-cyber-600 bg-cyber-800 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20 ${
                    showChat ? 'h-[300px]' : 'h-0 overflow-hidden'
                }`}
            >
                <ChatInterface 
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isProcessing={isProcessing}
                    user={user}
                />
            </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;