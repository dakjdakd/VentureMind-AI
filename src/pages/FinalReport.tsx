import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { LiveLogs } from '../components/LiveLogs';
import { BackendAgentResult, BackendJob, formatBackendLog, getAnalysis } from '../lib/api';
import { cn } from '../lib/utils';

const fallbackScores = { market: 44, product: 42, technical: 48, risk: 74 };

const agentLabels: Record<string, string> = {
  research: 'Research',
  product: 'Product',
  technical: 'Technical',
  critic: 'Critic',
};

function splitMarkdown(markdown?: string) {
  if (!markdown) return [];
  const sections: { title: string; body: string }[] = [];
  const matches = markdown.split(/\n(?=##\s+)/g);

  for (const block of matches) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('# ')) continue;
    const lines = trimmed.split('\n');
    const title = lines[0].replace(/^##\s+/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    if (title && body) {
      sections.push({ title, body });
    }
  }

  return sections;
}

function cleanMemoInline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^\s*>+\s?/, '')
    .trim();
}

function renderMemoText(text: string) {
  return text.split('\n').filter(Boolean).map((line, index) => {
    const trimmed = line.trim();
    const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numbered) {
      return (
        <li key={index} className="ml-5 list-decimal text-sm leading-relaxed text-zinc-300 text-pretty">
          {cleanMemoInline(numbered[2])}
        </li>
      );
    }

    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      return (
        <li key={index} className="ml-5 list-disc text-sm leading-relaxed text-zinc-300 text-pretty">
          {cleanMemoInline(bullet[1])}
        </li>
      );
    }

    return (
      <p key={index} className="text-sm leading-relaxed text-zinc-300 text-pretty">
        {cleanMemoInline(trimmed)}
      </p>
    );
  });
}

function resultSummary(result?: BackendAgentResult) {
  if (!result) return 'Awaiting agent output.';
  return result.summary;
}

export function FinalReport() {
  const [job, setJob] = useState<BackendJob | null>(null);
  const [loading, setLoading] = useState(true);
  const report = job?.finalReport;
  const scores = report?.scores || fallbackScores;
  const keyReasons = report?.keyReasons || [];
  const consensus = report?.agentConsensus || [];
  const memoSections = useMemo(() => splitMarkdown(report?.markdown), [report?.markdown]);
  const agentResults = job?.results || {};

  useEffect(() => {
    let cancelled = false;
    const analysisId = localStorage.getItem('venturemind:lastAnalysisId');

    if (!analysisId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const nextJob = await getAnalysis(analysisId);
        if (!cancelled) setJob(nextJob);
      } catch {
        if (!cancelled) setJob(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const verdictTone =
    report?.verdict === 'pursue'
      ? 'border-emerald-500/30 text-emerald-300'
      : report?.verdict === 'reject'
        ? 'border-rose-500/30 text-rose-300'
        : 'border-amber-500/30 text-amber-300';

  return (
    <div className="min-h-screen p-6 lg:p-8 flex flex-col relative">
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-6 gap-4">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Board
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <FileText className="size-5 text-zinc-100" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Board Memorandum</h1>
              <span className="text-zinc-400 font-mono text-sm">/ Final Decision Report</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-lg text-sm transition-colors flex items-center gap-2">
            <RotateCcw className="size-4" /> Rerun
          </button>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-lg text-sm transition-colors flex items-center gap-2">
            <Share2 className="size-4" /> Share
          </button>
          <button className="px-5 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Download className="size-4" /> Export
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-3 space-y-5 order-2 xl:order-1">
          <section className={cn('glass-panel p-5 rounded-xl border', verdictTone)}>
            <div className="text-xs font-mono text-zinc-500 uppercase mb-3">Board Decision</div>
            <div className="text-3xl font-semibold text-white text-balance">{report?.verdictLabel || (loading ? 'LOADING' : 'PENDING')}</div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300 text-pretty">
              {report?.summary || 'The board memorandum will appear once the supervisor agent finishes synthesizing the analysis.'}
            </p>
          </section>

          <section className="glass-panel p-5 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase mb-5">
              <BarChart3 className="size-4" /> Score Reconciliation
            </div>
            <div className="space-y-4">
              {Object.entries(scores).map(([label, score]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="capitalize text-zinc-200">{label}</span>
                    <span className="tabular-nums text-zinc-400">{Math.round(score)}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel p-5 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase mb-4">
              <ClipboardList className="size-4" /> Agent Consensus
            </div>
            <div className="space-y-4">
              {['research', 'product', 'technical', 'critic'].map((agentId, index) => (
                <div key={agentId} className="border-b border-white/10 last:border-b-0 pb-4 last:pb-0">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-100">{agentLabels[agentId]}</span>
                    {agentId === 'critic' ? <AlertTriangle className="size-4 text-amber-400" /> : <CheckCircle2 className="size-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400 text-pretty">
                    {consensus[index] || resultSummary(agentResults[agentId])}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="xl:col-span-6 space-y-6 order-1 xl:order-2">
          {loading ? (
            <div className="glass-panel p-8 rounded-xl text-zinc-300">Loading board memorandum...</div>
          ) : (
            <>
              <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-7 rounded-xl">
                <div className="text-xs font-mono text-zinc-400 uppercase mb-2">Current Venture</div>
                <h2 className="text-2xl md:text-3xl font-semibold text-white text-balance">{job?.idea || 'No analysis loaded'}</h2>
                {report?.summary && (
                  <p className="mt-5 text-base leading-relaxed text-zinc-300 text-pretty">{report.summary}</p>
                )}
              </motion.section>

              {keyReasons.length > 0 && (
                <section className="glass-panel p-6 rounded-xl">
                  <div className="text-xs font-mono text-zinc-400 uppercase mb-4">Board-Level Reasons</div>
                  <ul className="space-y-3">
                    {keyReasons.map((reason, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="mt-1.5 size-1.5 rounded-full bg-white shrink-0" />
                        <span className="text-sm leading-relaxed text-zinc-300 text-pretty">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {memoSections.length > 0 ? (
                <div className="space-y-5">
                  {memoSections.map((section) => (
                    <section key={section.title} className="glass-panel p-6 rounded-xl">
                      <h3 className="text-lg font-semibold text-white mb-4 text-balance">{section.title}</h3>
                      <div className="space-y-3">{renderMemoText(section.body)}</div>
                    </section>
                  ))}
                </div>
              ) : (
                <section className="glass-panel p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-3">Memo Pending</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    The supervisor has not produced the full markdown memo yet. Keep this page open and it will refresh automatically.
                  </p>
                </section>
              )}
            </>
          )}
        </main>

        <aside className="xl:col-span-3 min-h-[420px] xl:h-[calc(100vh-150px)] order-3">
          <LiveLogs
            className="h-full"
            logs={job?.logs?.length ? job.logs.map(formatBackendLog) : [
              { id: 'waiting', timestamp: new Date().toTimeString().split(' ')[0], message: 'Waiting for final report synthesis...', type: 'info' },
            ]}
          />
        </aside>
      </div>
    </div>
  );
}
