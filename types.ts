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

/**
 * Forensic context metadata for investigation tracking
 */
export interface ForensicContext {
  caseId?: string;
  incidentType?: string;
  evidenceTags?: string[];
  investigationPhase?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  notes?: string;
}

/**
 * Version metadata for diff statistics
 */
export interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
}

/**
 * Report version entry stored in localStorage
 */
export interface ReportVersion {
  id: string;
  reportId: string;
  versionNumber: number;
  timestamp: number;
  htmlContent: string;
  changeDescription: string;
  createdBy: {
    userId: string;
    username: string;
    role: string;
  };
  forensicContext?: ForensicContext;
  isAutoSave: boolean;
  diffStats?: DiffStats;
}

/**
 * Storage usage information
 */
export interface StorageUsage {
  used: number;
  available: number;
  percentage: number;
}
