export enum UserRole {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isProcessing?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface McpToolCall {
  tool: string;
  args: Record<string, any>;
}
