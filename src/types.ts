export type AgentStatus = 'idle' | 'running' | 'completed' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  agent?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  currentTask?: string;
  path: string;
}
