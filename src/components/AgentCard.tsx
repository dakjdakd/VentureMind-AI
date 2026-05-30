import React from 'react';
import { motion } from 'motion/react';
import { AgentInfo } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle2, RotateCcw, AlertTriangle, CircleDashed, ArrowRight, Telescope, Lightbulb, Code2, Scale, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AgentCardProps {
  agent: AgentInfo;
  className?: string;
}

const statusConfig = {
  idle: { icon: CircleDashed, color: 'text-zinc-400', bg: 'bg-zinc-500/10', spinning: false },
  running: { icon: RotateCcw, color: 'text-blue-400', bg: 'bg-blue-400/10', spinning: true },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', spinning: false },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', spinning: false },
  error: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', spinning: false },
};

const roleIcons: Record<string, any> = {
  research: Telescope,
  product: Lightbulb,
  technical: Code2,
  critic: Scale,
  supervisor: ClipboardList,
};

export function AgentCard({ agent, className }: AgentCardProps) {
  const config = statusConfig[agent.status];
  const Icon = config.icon;
  const RoleIcon = roleIcons[agent.id] || CircleDashed;

  return (
    <Link to={agent.path} className="block group">
      <motion.div 
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "glass-panel p-5 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col group-hover:border-white/20 group-hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)]",
          className
        )}
      >
        {/* Glow effect */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full transition-colors duration-500",
            config.bg.replace('/10', '')
          )} 
        />

        {/* Active Shimmer */}
        {agent.status === 'running' && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent skew-x-12"
          />
        )}

        <div className="flex items-start justify-between mb-4 relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
              <RoleIcon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-100 mb-1 md:text-lg">{agent.name}</h3>
              <p className="text-xs md:text-sm text-zinc-400">{agent.description}</p>
            </div>
          </div>
          <div className="relative flex items-center justify-center w-6 h-6 shrink-0 mt-1">
            {agent.status === 'running' && (
              <span className="absolute inline-flex w-full h-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
            )}
            <span className={cn(
              "relative inline-flex rounded-full w-2.5 h-2.5 transition-colors duration-300",
              agent.status === 'idle' ? "bg-zinc-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" :
              agent.status === 'running' ? "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" :
              agent.status === 'completed' ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" :
              "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            )}></span>
          </div>
        </div>

        <div className="h-[44px] md:h-[48px] relative overflow-hidden rounded-lg mt-auto z-10 border border-white/10 bg-white/5 shadow-inner">
          <div className="absolute inset-0 flex items-center gap-2.5 text-sm md:text-base text-white p-2.5 md:p-3 transition-transform duration-300 group-hover:-translate-y-full">
            <Icon className={cn("w-4 h-4 shrink-0", config.color, config.spinning && "animate-spin")} />
            <span className="truncate flex-1">{agent.currentTask || "Standing by"}</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-2.5 md:p-3 transition-transform duration-300 translate-y-full group-hover:translate-y-0">
            <span className="text-sm font-medium text-white flex items-center gap-1.5 w-full justify-center h-full">
              View Dashboard <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
