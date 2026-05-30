import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, useMotionValue, useSpring } from 'motion/react';
import { AgentCard } from '../components/AgentCard';
import { LiveLogs } from '../components/LiveLogs';
import { AgentInfo, LogEntry } from '../types';
import { Search, Loader2, X, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { BackendAgentStage, BackendJob, BackendLogEvent, createAnalysis, formatBackendLog, getAnalysis, streamAnalysis } from '../lib/api';

export function Home() {
  const dragControls = useDragControls();
  const streamRef = useRef<EventSource | null>(null);
  const [logsVisible, setLogsVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  function handleMouseMove(e: React.MouseEvent) {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set((clientX / innerWidth - 0.5) * 250);
    mouseY.set((clientY / innerHeight - 0.5) * 250);
  }

  const [idea, setIdea] = useState('Open a bubble tea shop in the Sahara Desert');
  const [analyzing, setAnalyzing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'research' | 'product_tech' | 'critic' | 'supervisor' | 'done'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([{ id: 'init', timestamp: getTimestamp(), message: 'System ready. Awaiting input.', type: 'info' }]);
  
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({
    research: { id: 'research', name: 'Research Agent', description: 'Market Intelligence & Data', status: 'idle', path: '/research' },
    product: { id: 'product', name: 'Product Agent', description: 'Persona & Demand Analysis', status: 'idle', path: '/product' },
    technical: { id: 'technical', name: 'Technical Agent', description: 'Build & Cost Feasibility', status: 'idle', path: '/technical' },
    critic: { id: 'critic', name: 'Investor Critic', description: 'Risk & Red Team Review', status: 'idle', path: '/critic' },
    supervisor: { id: 'supervisor', name: 'Supervisor', description: 'Final Report Compiler', status: 'idle', path: '/report' }
  });

  function getTimestamp() {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  }

  function addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: getTimestamp(), message, type }]);
  }

  function updateAgent(id: string, updates: Partial<AgentInfo>) {
    setAgents(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  }

  function mapPhase(nextPhase: string): typeof phase {
    if (nextPhase === 'product_technical') return 'product_tech';
    if (nextPhase === 'reflection') return 'critic';
    if (['idle', 'research', 'critic', 'supervisor', 'done'].includes(nextPhase)) return nextPhase as typeof phase;
    return nextPhase === 'completed' ? 'done' : 'idle';
  }

  function applyAgentStage(stage: BackendAgentStage) {
    updateAgent(stage.id, {
      status: stage.status,
      currentTask: stage.currentTask,
    });
  }

  function applyJobSnapshot(job: BackendJob) {
    setPhase(job.status === 'completed' ? 'done' : mapPhase(job.phase));
    setAnalyzing(job.status === 'queued' || job.status === 'running');
    setIdea(job.idea);
    setAgents(prev => {
      const next = { ...prev };
      Object.values(job.agents || {}).forEach((stage) => {
        if (next[stage.id]) {
          next[stage.id] = {
            ...next[stage.id],
            status: stage.status,
            currentTask: stage.currentTask,
          };
        }
      });
      return next;
    });
    if (job.logs?.length) {
      setLogs(job.logs.map(formatBackendLog));
    }
    if (job.status === 'completed') {
      localStorage.setItem('venturemind:lastAnalysisId', job.id);
      streamRef.current?.close();
    }
    if (job.status === 'failed') {
      streamRef.current?.close();
      if (job.error) {
        addLog(job.error, 'error');
      }
    }
  }

  function applyBackendLog(log: BackendLogEvent) {
    setLogs(prev => [...prev, formatBackendLog(log)]);
  }

  async function connectToAnalysis(analysisId: string, isCancelled: () => boolean = () => false) {
    streamRef.current?.close();
    const job = await getAnalysis(analysisId);
    if (isCancelled()) return;
    applyJobSnapshot(job);

    if (job.status !== 'queued' && job.status !== 'running') {
      return;
    }

    streamRef.current = streamAnalysis(analysisId, {
      onSnapshot: (job) => !isCancelled() && applyJobSnapshot(job),
      onStatus: (job) => !isCancelled() && applyJobSnapshot(job),
      onAgent: (agent) => !isCancelled() && applyAgentStage(agent),
      onLog: (log) => !isCancelled() && applyBackendLog(log),
      onReport: (job) => !isCancelled() && applyJobSnapshot(job),
      onError: () => {
        if (!isCancelled()) {
          addLog('Lost live stream connection. You can refresh the report from the backend snapshot.', 'warning');
        }
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    const analysisId = localStorage.getItem('venturemind:lastAnalysisId');

    if (analysisId) {
      (async () => {
        try {
          await connectToAnalysis(analysisId, () => cancelled);
        } catch {
          if (!cancelled) {
            localStorage.removeItem('venturemind:lastAnalysisId');
          }
        }
      })();
    }

    return () => {
      cancelled = true;
      streamRef.current?.close();
    };
  }, []);

  const startAnalysis = async () => {
    if (analyzing) return;
    if (!idea.trim()) return;

    streamRef.current?.close();
    setAnalyzing(true);
    setPhase('research');
    setLogs([]);
    setAgents(prev => {
      const reset: any = {};
      Object.keys(prev).forEach(k => reset[k] = { ...prev[k], status: 'idle', currentTask: undefined });
      return reset;
    });

    addLog(`Initiating analysis for: "${idea}"`, 'info');

    try {
      const created = await createAnalysis({ idea });
      localStorage.setItem('venturemind:lastAnalysisId', created.analysisId);
      await connectToAnalysis(created.analysisId);
    } catch (error) {
      setAnalyzing(false);
      setPhase('idle');
      addLog(error instanceof Error ? error.message : 'Failed to start analysis.', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 lg:p-12 relative overflow-x-hidden" onMouseMove={handleMouseMove}>
      
      {/* Background Ornaments */}
      <motion.div 
        style={{ x: springX, y: springY }}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.9, 0.6]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-1/2 left-1/2 -mt-[400px] -ml-[400px] w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[140px] pointer-events-none" 
      />
      <div className="fixed top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col items-center pt-8 pb-32">
        
        {/* Main Stage */}
        <div className="flex flex-col items-center w-full">
          
          {/* Header */}
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-mono text-zinc-300 tracking-wider">Multi-Agent Venture Analysis System</span>
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200/60 mb-2 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              VentureMind AI
            </h1>
          </div>

          {/* Input Console */}
          <div className="relative w-full max-w-4xl mx-auto mb-24 flex flex-col items-center z-20">
            <div className={cn(
              "glass-panel p-2.5 rounded-[1.5rem] flex flex-col md:flex-row items-center w-full relative transition-all duration-500",
              isFocused ? "shadow-[0_0_80px_-15px_rgba(255,255,255,0.2)] bg-white/[0.08] border-white/30" : "shadow-[0_0_60px_-15px_rgba(59,130,246,0.15)] bg-white/[0.03] backdrop-blur-3xl"
            )}>
              <div className="w-14 h-14 hidden md:flex items-center justify-center shrink-0">
                <Search className={cn("w-5 h-5 transition-colors duration-500", isFocused ? "text-white" : "text-zinc-400")} />
              </div>
              <input
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={analyzing}
                className="flex-1 w-full bg-transparent border-none outline-none text-base md:text-xl text-zinc-100 placeholder:text-zinc-600 font-medium px-6 py-4 md:px-2 md:py-0 text-center md:text-left disabled:opacity-50"
                placeholder="Enter a startup idea (e.g. Open a bubble tea shop in the Sahara)"
                onKeyDown={(e) => e.key === 'Enter' && startAnalysis()}
              />
              <button 
                disabled={analyzing}
                className="group relative overflow-hidden bg-zinc-100 text-black w-full md:w-auto px-8 py-4 rounded-xl font-medium flex justify-center items-center gap-2 hover:bg-white transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                onClick={startAnalysis}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-shimmer pointer-events-none" />
                <span className="relative flex items-center gap-2">
                  {analyzing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Running</>
                  ) : (
                    'Start Analysis'
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Flow Network */}
          <div className="relative w-full max-w-5xl flex flex-col items-center pointer-events-auto">
            
            <div className="w-px h-12 bg-gradient-to-b from-white/30 to-white/5 mb-6" />
            
            {/* Research */}
            <div className="w-full max-w-[360px]">
              <AgentCard agent={agents.research} className={cn("transition-all duration-500", phase !== 'idle' ? "opacity-100 scale-100" : "opacity-80 scale-95")} />
            </div>

            {/* Split Lines Container */}
            <div className="relative w-full max-w-[600px] h-20 my-4">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-10 bg-white/10" />
               <div className="absolute top-10 left-0 right-0 h-px bg-white/10" />
               <div className="absolute top-10 left-0 w-px h-10 bg-white/10" />
               <div className="absolute top-10 right-0 w-px h-10 bg-white/10" />
               
               {/* Animated paths if running */}
               {(phase === 'research' || phase === 'product_tech') && (
                 <svg viewBox="0 0 600 80" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                   {/* Background tracks */}
                   <path d="M 300 0 L 300 40 L 0 40 L 0 80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                   <path d="M 300 0 L 300 40 L 600 40 L 600 80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                   
                   {/* Flowing lines */}
                   <motion.path 
                     d="M 300 0 L 300 40 L 0 40 L 0 80" 
                     fill="none" 
                     stroke="#60A5FA" 
                     strokeWidth="3" 
                     strokeLinecap="round"
                     strokeDasharray="10 50" 
                     animate={{ strokeDashoffset: [0, -60] }}
                     transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                     className="drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                   />
                   <motion.path 
                     d="M 300 0 L 300 40 L 600 40 L 600 80" 
                     fill="none" 
                     stroke="#60A5FA" 
                     strokeWidth="3" 
                     strokeLinecap="round"
                     strokeDasharray="10 50" 
                     animate={{ strokeDashoffset: [0, -60] }}
                     transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                     className="drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                   />

                   {/* Nodes */}
                   <circle cx="300" cy="0" r="3" fill="#3B82F6" className="animate-pulse" />
                   <circle cx="0" cy="80" r="3" fill="#3B82F6" className="animate-pulse" />
                   <circle cx="600" cy="80" r="3" fill="#3B82F6" className="animate-pulse" />
                 </svg>
               )}
            </div>

            {/* Product & Technical */}
            <div className="flex w-full max-w-[1000px] gap-12 md:gap-32 justify-center">
              <div className="flex-1 max-w-[360px]">
                <AgentCard agent={agents.product} className={cn("transition-all duration-500", (phase === 'product_tech' || phase === 'critic' || phase === 'supervisor' || phase === 'done') ? "opacity-100 scale-100" : "opacity-60 scale-95")} />
              </div>
              <div className="flex-1 max-w-[360px]">
                <AgentCard agent={agents.technical} className={cn("transition-all duration-500", (phase === 'product_tech' || phase === 'critic' || phase === 'supervisor' || phase === 'done') ? "opacity-100 scale-100" : "opacity-60 scale-95")} />
              </div>
            </div>

            {/* Join Lines Container */}
            <div className="relative w-full max-w-[600px] h-20 my-4">
               <div className="absolute bottom-10 left-0 w-px h-10 bg-white/10" />
               <div className="absolute bottom-10 right-0 w-px h-10 bg-white/10" />
               <div className="absolute bottom-10 left-0 right-0 h-px bg-white/10" />
               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-10 bg-white/10" />
               
               {(phase === 'product_tech' || phase === 'critic') && (
                 <svg viewBox="0 0 600 80" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                   {/* Background tracks */}
                   <path d="M 0 0 L 0 40 L 300 40 L 300 80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                   <path d="M 600 0 L 600 40 L 300 40 L 300 80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />

                   {/* Flowing lines */}
                   <motion.path 
                     d="M 0 0 L 0 40 L 300 40 L 300 80" 
                     fill="none" 
                     stroke="#60A5FA" 
                     strokeWidth="3" 
                     strokeLinecap="round"
                     strokeDasharray="10 50" 
                     animate={{ strokeDashoffset: [0, -60] }}
                     transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                     className="drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                   />
                   <motion.path 
                     d="M 600 0 L 600 40 L 300 40 L 300 80" 
                     fill="none" 
                     stroke="#60A5FA" 
                     strokeWidth="3" 
                     strokeLinecap="round"
                     strokeDasharray="10 50" 
                     animate={{ strokeDashoffset: [0, -60] }}
                     transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                     className="drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                   />

                   {/* Nodes */}
                   <circle cx="0" cy="0" r="3" fill="#3B82F6" className="animate-pulse" />
                   <circle cx="600" cy="0" r="3" fill="#3B82F6" className="animate-pulse" />
                   <circle cx="300" cy="80" r="3" fill="#3B82F6" className="animate-pulse" />
                 </svg>
               )}
            </div>

            {/* Critic */}
            <div className="w-full max-w-[360px]">
              <AgentCard agent={agents.critic} className={cn("transition-all duration-500", (phase === 'critic' || phase === 'supervisor' || phase === 'done') ? "opacity-100 scale-100" : "opacity-40 scale-95")} />
            </div>

            <div className="relative w-px h-16 bg-white/10 my-4">
              {(phase === 'critic' || phase === 'supervisor') && (
                <svg viewBox="0 0 20 64" preserveAspectRatio="none" className="absolute -left-[10px] top-0 w-[20px] h-full pointer-events-none">
                  {/* Flowing lines */}
                  <motion.line 
                    x1="10" y1="0" x2="10" y2="64" 
                    fill="none" 
                    stroke="#60A5FA" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeDasharray="10 50" 
                    animate={{ strokeDashoffset: [0, -60] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                  />
                  {/* Nodes */}
                  <circle cx="10" cy="0" r="3" fill="#3B82F6" className="animate-pulse" />
                  <circle cx="10" cy="64" r="3" fill="#3B82F6" className="animate-pulse" />
                </svg>
              )}
            </div>

            {/* Supervisor */}
            <div className="w-full max-w-[360px]">
              <AgentCard agent={agents.supervisor} className={cn("transition-all duration-500", (phase === 'supervisor' || phase === 'done') ? "opacity-100 scale-100" : "opacity-30 scale-95")} />
            </div>

          </div>

          
          {phase === 'done' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-20 w-full max-w-md">
              <Link to="/report" className="w-full block text-center bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-5 rounded-2xl transition-all shadow-[0_0_40px_-5px_rgba(255,255,255,0.15)] text-lg font-medium">
                View Final Board Report
              </Link>
            </motion.div>
          )}

        </div>

        {/* Floating Draggable Logs window */}
        <AnimatePresence>
          {logsVisible ? (
            <motion.div
              key="logs-window"
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              style={{ touchAction: "none" }}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed bottom-12 right-12 z-[100] hidden md:block"
            >
              <div className="w-[450px] h-[600px] min-w-[300px] min-h-[400px] max-w-[90vw] max-h-[80vh] resize overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-[1.5rem] bg-[#0A0A0C]/95 backdrop-blur-3xl border border-white/10 flex flex-col pt-1 relative">
                {/* The drag handle */}
                <div 
                  className="h-10 w-full cursor-move hover:bg-white/[0.04] flex items-center justify-center shrink-0 transition-colors pointer-events-auto relative"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div className="w-12 h-1 rounded-full bg-white/20" />
                  
                  <button 
                    onClick={() => setLogsVisible(false)}
                    className="absolute right-4 p-1 text-zinc-500 hover:text-white transition-colors hover:bg-white/10 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden pointer-events-auto">
                   <LiveLogs 
                     className="h-full border-none bg-transparent shadow-none rounded-none"
                     logs={logs} 
                   />
                </div>
                {/* Custom Resize Handle (Visual Only) */}
                <div className="absolute bottom-2 right-2 pointer-events-none text-white/30 flex flex-col justify-end items-end gap-0.5">
                   <div className="w-2.5 h-[1.5px] bg-current rounded-full" />
                   <div className="w-1.5 h-[1.5px] bg-current rounded-full" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="show-logs-button"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLogsVisible(true)}
              className="fixed bottom-12 right-12 z-[100] px-5 py-4 bg-[#0A0A0C]/90 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] shadow-2xl flex items-center gap-3 text-zinc-300 hover:text-white transition-colors hidden md:flex hover:border-white/20 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)]"
            >
              <Terminal className="w-5 h-5" />
              <span className="font-mono text-sm tracking-wide">System Logs</span>
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
