import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../types';
import { Send, Bot, User as UserIcon, Loader2, Terminal, Sparkles, Zap, Command } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  user: User;
}

const SUGGESTIONS = [
  "Update the executive summary to",
  "Change threat actor confidence to",
  "Add a timeline event for",
  "Set severity level to",
  "Include a new IOC for",
  "Modify the remediation plan to",
  "Analyze the attack vector",
  "Regenerate the incident description",
  "Highlight the critical findings",
  "Translate the summary to English"
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isProcessing, user }) => {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.length > 1) {
      const match = SUGGESTIONS.find(s => s.toLowerCase().startsWith(val.toLowerCase()));
      if (match && match !== val) {
        setSuggestion(match);
      } else {
        setSuggestion('');
      }
    } else {
      setSuggestion('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      setInput(suggestion + ' ');
      setSuggestion('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
    setSuggestion('');
  };

  return (
    <div className="flex flex-col h-full bg-cyber-800">
      <div className="p-4 border-b border-cyber-600 bg-cyber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyber-400" />
          <span className="font-mono font-bold text-white">MCP Command Center</span>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-cyber-800 px-2 py-1 rounded border border-cyber-700" title="Low Latency Mode Active">
                <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] text-cyber-300 font-mono">FAST MODEL</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-cyber-400 font-mono">CONNECTED</span>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
           <div className="text-center mt-4 text-gray-500 select-none">
                <div className="relative inline-block mb-4">
                    <Bot className="w-10 h-10 mx-auto opacity-20" />
                    <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-cyber-400 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-gray-400">Awaiting commands</p>
                <p className="text-xs mt-1 opacity-50 max-w-[200px] mx-auto">
                    Type to see AI suggestions.
                </p>
           </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex max-w-[85%] gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-cyber-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                    : 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                }`}
              >
                {msg.role === 'user' ? (
                  <UserIcon className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>

              <div
                className={`p-3 rounded-lg text-sm leading-relaxed shadow-md transition-all duration-200 ${
                  msg.role === 'user'
                    ? 'bg-cyber-600 text-white rounded-tr-none border border-cyber-500/30'
                    : 'bg-cyber-700 text-gray-200 rounded-tl-none border border-cyber-600 hover:border-purple-500/30'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex w-full justify-start animate-in fade-in duration-300">
            <div className="flex max-w-[85%] gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="p-3 rounded-lg bg-cyber-700 rounded-tl-none border border-cyber-600 text-sm text-gray-400 flex items-center gap-2">
                    <span className="animate-pulse">Synthesizing response...</span>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-cyber-900 border-t border-cyber-600">
        <form onSubmit={handleSubmit} className="relative">
            <div className="relative bg-cyber-800 rounded-lg border border-cyber-600 focus-within:ring-2 focus-within:ring-cyber-500 focus-within:border-transparent transition-all shadow-lg">
                
                {/* Ghost Text Overlay */}
                <div className="absolute inset-0 py-3 pl-4 pr-12 font-mono text-sm pointer-events-none whitespace-pre flex items-center overflow-hidden">
                    <span className="opacity-0 text-transparent">{input}</span>
                    {suggestion && input.length > 0 && (
                        <span className="text-gray-600 opacity-50 flex items-center">
                            {suggestion.slice(input.length)}
                            <span className="ml-2 text-[10px] border border-gray-700 rounded px-1 text-gray-500 hidden sm:inline-block">TAB</span>
                        </span>
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={suggestion ? "" : "Command the HTML model..."}
                    disabled={isProcessing}
                    className="w-full bg-transparent text-white rounded-lg py-3 pl-4 pr-12 focus:outline-none font-mono text-sm relative z-10 placeholder-gray-600 disabled:opacity-50"
                    autoComplete="off"
                    spellCheck="false"
                />
                
                <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="absolute right-2 top-2 bottom-2 px-3 bg-cyber-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </form>
        <div className="mt-2 text-[10px] text-gray-600 text-center flex justify-between items-center px-1">
            <span className="flex items-center gap-1"><Command className="w-3 h-3"/> + Enter to send</span>
            <span className="flex items-center gap-1">Powered by <span className="text-purple-400">Gemini 2.5 Flash Lite</span></span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;