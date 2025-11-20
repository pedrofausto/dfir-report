import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../constants';
import { Shield, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple mock auth logic
    // In a real app, this would call an API
    const user = MOCK_USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user && password === username) { // Mock password is same as username
      onLogin(user);
    } else {
      setError('Invalid credentials. Try "admin", "analyst", or "viewer" with same password.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cyber-900 relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#2d3748 1px, transparent 1px), linear-gradient(90deg, #2d3748 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      <div className="w-full max-w-md z-10 p-4">
        <div className="bg-cyber-800 border border-cyber-600 rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-cyber-700 rounded-full flex items-center justify-center mb-4 border border-cyber-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Shield className="w-8 h-8 text-cyber-500" />
            </div>
            <h1 className="text-2xl font-bold text-white font-mono tracking-wider">DFIR CORTEX</h1>
            <p className="text-cyber-400 text-sm mt-1">Secure Incident Response Platform</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Access ID</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-cyber-900 border border-cyber-600 text-white rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-cyber-500 focus:border-transparent transition-all outline-none placeholder-gray-600"
                  placeholder="username (e.g. admin)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Passcode</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-cyber-900 border border-cyber-600 text-white rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-cyber-500 focus:border-transparent transition-all outline-none placeholder-gray-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-cyber-300 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-cyber-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-blue-900/20"
            >
              AUTHENTICATE
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-cyber-700">
            <div className="text-xs text-center text-gray-500">
              <p>System Status: <span className="text-green-500">ONLINE</span></p>
              <p className="mt-1">Encrypted Connection • 256-bit AES</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
