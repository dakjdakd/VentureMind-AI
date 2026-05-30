import { AgentStatus, LogEntry } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BackendAgentStage {
  id: string;
  name: string;
  status: AgentStatus;
  currentTask?: string;
}

export interface BackendLogEvent {
  id: string;
  timestamp: string;
  message: string;
  agent?: string;
  type?: LogEntry['type'];
}

export interface BackendFinalReport {
  verdict: 'pursue' | 'pivot' | 'reject';
  verdictLabel: string;
  summary: string;
  scores: Record<string, number>;
  keyReasons: string[];
  agentConsensus: string[];
  markdown: string;
}

export type BackendEvidence = string | {
  text?: string;
  title?: string;
  url?: string;
  sourceUrl?: string;
  source_url?: string;
  sourceTitle?: string;
  source_title?: string;
  snippet?: string;
  source?: string;
};

export interface BackendAgentResult {
  agent: string;
  summary: string;
  scores: Record<string, number>;
  evidence: BackendEvidence[];
  risks: string[];
  confidence: number;
  next_actions?: string[];
  nextActions?: string[];
  raw?: {
    sources?: BackendSource[];
    queries?: string[];
    [key: string]: unknown;
  };
  needsRecheck?: boolean;
  recheckTargets?: string[];
  recheckReason?: string | null;
}

export interface BackendSource {
  query?: string;
  title?: string;
  url?: string;
  snippet?: string;
  source?: string;
}

export interface BackendJob {
  id: string;
  idea: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  phase: string;
  agents: Record<string, BackendAgentStage>;
  logs: BackendLogEvent[];
  results: Record<string, BackendAgentResult>;
  critic?: BackendAgentResult | null;
  finalReport?: BackendFinalReport | null;
  error?: string | null;
}

export async function createAnalysis(input: { idea: string; context?: string; constraints?: Record<string, unknown> }) {
  const response = await fetch(`${API_BASE_URL}/api/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to create analysis: ${response.status}`);
  }
  return response.json() as Promise<{ analysisId: string; status: string; streamUrl: string }>;
}

export async function getAnalysis(analysisId: string) {
  const response = await fetch(`${API_BASE_URL}/api/analyses/${analysisId}`);
  if (!response.ok) {
    throw new Error(`Failed to load analysis: ${response.status}`);
  }
  return response.json() as Promise<BackendJob>;
}

export function streamAnalysis(
  analysisId: string,
  handlers: {
    onSnapshot?: (job: BackendJob) => void;
    onStatus?: (job: BackendJob) => void;
    onAgent?: (agent: BackendAgentStage) => void;
    onLog?: (log: BackendLogEvent) => void;
    onResult?: (result: BackendAgentResult) => void;
    onReport?: (job: BackendJob) => void;
    onError?: (error: Event) => void;
  },
) {
  const source = new EventSource(`${API_BASE_URL}/api/analyses/${analysisId}/stream`);
  source.addEventListener('snapshot', (event) => handlers.onSnapshot?.(JSON.parse((event as MessageEvent).data)));
  source.addEventListener('status', (event) => handlers.onStatus?.(JSON.parse((event as MessageEvent).data)));
  source.addEventListener('agent', (event) => handlers.onAgent?.(JSON.parse((event as MessageEvent).data)));
  source.addEventListener('log', (event) => handlers.onLog?.(JSON.parse((event as MessageEvent).data)));
  source.addEventListener('result', (event) => handlers.onResult?.(JSON.parse((event as MessageEvent).data)));
  source.addEventListener('report', (event) => handlers.onReport?.(JSON.parse((event as MessageEvent).data)));
  source.onerror = (error) => handlers.onError?.(error);
  return source;
}

export function formatBackendLog(log: BackendLogEvent): LogEntry {
  return {
    id: log.id,
    timestamp: new Date(log.timestamp).toTimeString().split(' ')[0],
    message: log.message,
    agent: log.agent,
    type: log.type,
  };
}
