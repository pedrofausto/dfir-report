import React, { useState } from 'react';
import { User, UserRole, ChatMessage } from '../types';
import { INITIAL_REPORT_HTML } from '../constants';
import { generateReportModification } from '../services/geminiService';
import ReportRenderer from './ReportRenderer';
import ChatInterface from './ChatInterface';
import { LogOut, FileCode, ShieldCheck, LayoutDashboard, Download, Loader2 } from 'lucide-react';

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
    setIsExporting(true);
    try {
        const element = document.createElement('div');
        element.className = 'pdf-export-container';
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Extract styles and modify them for the container scope to ensure PDF looks correct
        // We replace :root and body selectors to target our container div
        const styles = Array.from(doc.querySelectorAll('style')).map(style => {
            let css = style.innerHTML;
            css = css.replace(/:root/g, '.pdf-export-container');
            css = css.replace(/body/g, '.pdf-export-container');
            return css;
        }).join('\n');
        
        const styleTag = document.createElement('style');
        styleTag.innerHTML = styles;
        element.appendChild(styleTag);
        
        // Copy body content
        const bodyContent = document.createElement('div');
        bodyContent.innerHTML = doc.body.innerHTML;
        element.appendChild(bodyContent);
        
        // Force container styles to match the dark theme for the PDF snapshot
        element.style.backgroundColor = '#0f1419'; 
        element.style.color = '#e4e6eb';
        element.style.padding = '20px';
        element.style.width = '100%'; 
        
        const filename = `DFIR-Report-${new Date().toISOString().split('T')[0]}.pdf`;

        const opt = {
          margin: [5, 5, 5, 5],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, 
              useCORS: true,
              backgroundColor: '#0f1419',
              logging: false
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
      <header className="h-16 bg-cyber-800 border-b border-cyber-600 flex items-center justify-between px-6 z-20 shadow-md">
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

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left/Center: Report View */}
        <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${showChat && canEdit ? 'mr-0' : ''}`}>
            <div className="h-10 bg-cyber-800 border-b border-cyber-600 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Report Preview</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 text-xs bg-cyber-700 hover:bg-cyber-600 text-white px-3 py-1 rounded border border-cyber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export to PDF"
                    >
                        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
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
                <ReportRenderer htmlContent={htmlContent} />
                
                {/* Overlay for Viewer Role indicating read-only mode generally, though the chat is hidden anyway */}
                {!canEdit && (
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm border border-white/10">
                        Read Only Mode
                    </div>
                )}
            </div>
        </div>

        {/* Right: Chat/MCP Interface (Only for Admin/Analyst) */}
        {canEdit && (
            <div 
                className={`w-[400px] transition-all duration-300 ease-in-out transform border-l border-cyber-600 bg-cyber-800 flex flex-col shadow-2xl z-10 ${
                    showChat ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'
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