import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Code2,
  ExternalLink,
  Lightbulb,
  RotateCcw,
  Scale,
  Telescope,
} from 'lucide-react';
import { LiveLogs } from '../components/LiveLogs';
import { AgentStatus, LogEntry } from '../types';
import { BackendAgentResult, BackendEvidence, BackendJob, formatBackendLog, getAnalysis } from '../lib/api';
import { cn } from '../lib/utils';

type AgentId = 'research' | 'product' | 'technical' | 'critic';

interface AgentDetailProps {
  agentId: AgentId;
}

const agentMeta = {
  research: {
    title: 'Research Agent',
    subtitle: 'Market Intelligence',
    icon: Telescope,
    accent: 'text-blue-400',
    border: 'border-blue-500/20',
    empty: 'Market intelligence will appear here when the Research Agent finishes.',
  },
  product: {
    title: 'Product Agent',
    subtitle: 'Persona & Demand Analysis',
    icon: Lightbulb,
    accent: 'text-amber-400',
    border: 'border-amber-500/20',
    empty: 'Product demand analysis will appear here when the Product Agent finishes.',
  },
  technical: {
    title: 'Technical Agent',
    subtitle: 'Build & Cost Feasibility',
    icon: Code2,
    accent: 'text-cyan-400',
    border: 'border-cyan-500/20',
    empty: 'Technical feasibility analysis will appear here when the Technical Agent finishes.',
  },
  critic: {
    title: 'Critic Agent',
    subtitle: 'Risk & Red Team Review',
    icon: Scale,
    accent: 'text-rose-400',
    border: 'border-rose-500/20',
    empty: 'Risk review will appear here when the Critic Agent finishes.',
  },
};

const statusIcons: Record<AgentStatus, typeof CircleDashed> = {
  idle: CircleDashed,
  running: RotateCcw,
  completed: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const statusColors: Record<AgentStatus, string> = {
  idle: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  running: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

function formatScoreLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function evidenceText(item: BackendEvidence) {
  if (typeof item === 'string') return item;
  return item.text || item.title || item.snippet || item.url || 'Untitled evidence';
}

function evidenceUrl(item: BackendEvidence) {
  if (typeof item === 'string') return undefined;
  return item.url || item.sourceUrl || item.source_url;
}

function evidenceSourceLabel(item: BackendEvidence) {
  if (typeof item === 'string') return undefined;
  return item.sourceTitle || item.source_title || item.source;
}

function agentLogs(job: BackendJob | null, agentId: AgentId): LogEntry[] {
  if (!job?.logs?.length) return [];
  const scoped = job.logs.filter((log) => !log.agent || log.agent === agentId);
  return scoped.map(formatBackendLog);
}

function getResult(job: BackendJob | null, agentId: AgentId): BackendAgentResult | null {
  if (!job) return null;
  if (agentId === 'critic') return job.results?.critic || job.critic || null;
  return job.results?.[agentId] || null;
}

export function AgentDetail({ agentId }: AgentDetailProps) {
  const meta = agentMeta[agentId];
  const Icon = meta.icon;
  const [job, setJob] = useState<BackendJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const analysisId = localStorage.getItem('venturemind:lastAnalysisId');

    if (!analysisId) {
      setLoading(false);
      setLoadError('No analysis has been started yet.');
      return;
    }

    const load = async () => {
      try {
        const nextJob = await getAnalysis(analysisId);
        if (!cancelled) {
          setJob(nextJob);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load analysis.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = window.setInterval(load, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const stage = job?.agents?.[agentId];
  const status = (stage?.status || 'idle') as AgentStatus;
  const StatusIcon = statusIcons[status];
  const result = getResult(job, agentId);
  const logs = useMemo(() => agentLogs(job, agentId), [job, agentId]);
  const nextActions = result?.nextActions || result?.next_actions || [];
  const sources = result?.raw?.sources || [];
  const queries = result?.raw?.queries || [];
  const scores = Object.entries(result?.scores || {});
  const confidence = Math.round((result?.confidence || 0) * 100);

  return (
    <div className="min-h-screen p-6 lg:p-8 flex flex-col">
      <header className={cn('mb-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-6 gap-4', meta.border)}>
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Board
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <Icon className={cn('w-5 h-5', meta.accent)} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">{meta.title}</h1>
              <span className="text-zinc-400 font-mono text-sm">/ {meta.subtitle}</span>
            </div>
          </div>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm', statusColors[status])}>
          <StatusIcon className={cn('w-4 h-4', status === 'running' && 'animate-spin')} />
          {stage?.currentTask || status}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          <div className="glass-panel p-5 rounded-xl">
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">Current Venture</div>
            <h2 className="text-xl md:text-2xl font-medium text-white">{job?.idea || 'No idea loaded'}</h2>
          </div>

          {loading ? (
            <div className="glass-panel p-8 rounded-xl flex items-center gap-3 text-zinc-300">
              <RotateCcw className="w-5 h-5 animate-spin text-blue-400" />
              Loading current analysis...
            </div>
          ) : loadError ? (
            <div className="glass-panel p-8 rounded-xl border-rose-500/20 text-rose-300">{loadError}</div>
          ) : result ? (
            <>
              <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">Agent Summary</div>
                    <p className="text-zinc-100 leading-relaxed">{result.summary}</p>
                  </div>
                  <div className="shrink-0 min-w-[120px] p-3 rounded-lg bg-white/[0.03] border border-white/10 text-center">
                    <div className="text-2xl font-mono text-white">{confidence}%</div>
                    <div className="text-xs text-zinc-400">Confidence</div>
                  </div>
                </div>
              </motion.section>

              {scores.length > 0 && (
                <section className="glass-panel p-6 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-5">
                    <BarChart3 className="w-4 h-4" /> Scores
                  </div>
                  <div className="space-y-4">
                    {scores.map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-200">{formatScoreLabel(key)}</span>
                          <span className="text-zinc-400 font-mono">{Math.round(value)}/100</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {sources.length > 0 && (
                <section className="glass-panel p-5 rounded-xl">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="text-xs font-mono text-zinc-400 uppercase mb-1">Source Links</div>
                      <h3 className="text-base font-medium text-white">Search evidence you can open</h3>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono tabular-nums">{sources.length} sources</span>
                  </div>
                  {queries.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {queries.map((query) => (
                        <span key={query} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-400">
                          {query}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="divide-y divide-white/10">
                    {sources.map((source, index) => (
                      <a
                        key={`${source.url || source.title}-${index}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block py-4 first:pt-0 last:pb-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-zinc-100 group-hover:text-white">
                              {source.title || source.url || 'Untitled source'}
                            </div>
                            {source.url && (
                              <div className="mt-1 text-[11px] text-zinc-500 line-clamp-1">{source.url}</div>
                            )}
                          </div>
                          <ExternalLink className="mt-0.5 size-4 shrink-0 text-zinc-500 group-hover:text-white" />
                        </div>
                        {source.snippet && (
                          <p className="mt-2 text-sm leading-relaxed text-zinc-400 text-pretty line-clamp-3">{source.snippet}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                          {source.source && <span>{source.source}</span>}
                          {source.query && <span className="line-clamp-1">Query: {source.query}</span>}
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ListPanel title="Evidence" items={result.evidence} tone="neutral" />
                <ListPanel title="Risks" items={result.risks} tone="risk" />
              </div>

              <ListPanel title="Next Actions" items={nextActions} tone="action" />

              {agentId === 'critic' && result.recheckReason && (
                <section className="glass-panel p-5 rounded-xl border-amber-500/20">
                  <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Recheck Request</div>
                  <p className="text-sm text-zinc-200">{result.recheckReason}</p>
                </section>
              )}
            </>
          ) : (
            <div className="glass-panel p-8 rounded-xl">
              <div className="flex items-center gap-3 text-zinc-200 mb-2">
                <CircleDashed className="w-5 h-5 text-zinc-400" />
                Waiting for result
              </div>
              <p className="text-sm text-zinc-400">{meta.empty}</p>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 xl:col-span-3 h-[420px] lg:h-[calc(100vh-150px)]">
          <LiveLogs
            className="h-full"
            logs={logs.length ? logs : [
              {
                id: 'waiting',
                timestamp: new Date().toTimeString().split(' ')[0],
                message: job ? `Waiting for ${meta.title} events...` : 'No live analysis loaded.',
                type: 'info',
              },
            ]}
          />
        </aside>
      </div>
    </div>
  );
}

function ListPanel({ title, items, tone }: { title: string; items: BackendEvidence[]; tone: 'neutral' | 'risk' | 'action' }) {
  const color = tone === 'risk' ? 'bg-rose-500' : tone === 'action' ? 'bg-blue-500' : 'bg-emerald-500';

  if (!items.length) {
    return null;
  }

  return (
    <section className="glass-panel p-5 rounded-xl">
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-4">
        <ClipboardList className="w-4 h-4" /> {title}
      </div>
      <ul className="space-y-3">
        {items.map((item, index) => {
          const text = evidenceText(item);
          const url = evidenceUrl(item);
          const sourceLabel = evidenceSourceLabel(item);

          return (
            <li key={`${title}-${index}`} className="flex items-start gap-3">
              <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', color)} />
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group min-w-0 rounded-sm text-sm leading-relaxed text-zinc-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  aria-label={`Open original source for: ${text}`}
                >
                  <span className="text-pretty">{text}</span>
                  <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-zinc-500 group-hover:text-zinc-300">
                    {sourceLabel || 'Source'}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </span>
                </a>
              ) : (
                <span className="text-sm text-zinc-300 leading-relaxed text-pretty">{text}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
