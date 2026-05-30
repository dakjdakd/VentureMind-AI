import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LogEntry } from '../types';
import { cn } from '../lib/utils';
import { Terminal } from 'lucide-react';

interface LiveLogsProps {
  logs: LogEntry[];
  className?: string;
}

export function LiveLogs({ logs, className }: LiveLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={cn("glass-panel rounded-xl flex flex-col overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.04]">
        <Terminal className="w-4 h-4 text-zinc-300" />
        <h3 className="text-xs font-mono font-medium text-zinc-300 tracking-wider uppercase">Live Logs</h3>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-emerald-500/70">System Active</span>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs custom-scrollbar"
      >
        {logs.map((log) => (
          <motion.div
            initial={{ opacity: 0, x: -10, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            key={log.id}
            className="flex gap-3 leading-relaxed"
          >
            <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
            <span className={cn(
              "whitespace-pre-wrap break-words",
              log.type === 'warning' ? 'text-amber-400' :
              log.type === 'error' ? 'text-rose-400' :
              log.type === 'success' ? 'text-emerald-400' :
              'text-zinc-200'
            )}>
              {log.message}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
