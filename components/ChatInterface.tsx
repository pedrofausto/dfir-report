import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../types';
import { Send, Bot, User as UserIcon, Loader2, Terminal, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  user: User;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isProcessing, user }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-cyber-800 border-l border-cyber-600">
      <div className="p-4 border-b border-cyber-600 bg-cyber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyber-400" />
          <span className="font-mono font-bold text-white">MCP Command Center</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-cyber-400 font-mono">GEMINI-2.5 CONNECTED</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
           <div className="text-center mt-10 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Awaiting commands to modify the report.</p>
                <p className="text-xs mt-2 opacity-50">Try: "Change the threat actor confidence to 95%"</p>
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
                    ? 'bg-cyber-500'
                    : 'bg-purple-600'
                }`}
              >
                {msg.role === 'user' ? (
                  <UserIcon className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>

              <div
                className={`p-3 rounded-lg text-sm leading-relaxed shadow-md ${
                  msg.role === 'user'
                    ? 'bg-cyber-600 text-white rounded-tr-none'
                    : 'bg-cyber-700 text-gray-200 rounded-tl-none border border-cyber-600'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex w-full justify-start">
            <div className="flex max-w-[85%] gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="p-3 rounded-lg bg-cyber-700 rounded-tl-none border border-cyber-600 text-sm text-gray-400 flex items-center gap-2">
                    <span className="animate-pulse">Processing HTML Model...</span>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-cyber-900 border-t border-cyber-600">
        <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Command the HTML model..."
              disabled={isProcessing}
              className="w-full bg-cyber-800 text-white border border-cyber-600 rounded-lg py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-cyber-500 placeholder-gray-500 disabled:opacity-50 font-mono text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 top-2 p-1.5 bg-cyber-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
        </form>
        <div className="mt-2 text-xs text-gray-600 text-center flex justify-center items-center gap-2">
            <span>Powered by MCP & Gemini</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
