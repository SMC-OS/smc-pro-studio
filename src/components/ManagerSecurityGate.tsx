import React from "react";
import { ShieldAlert, Lock, UserCheck, ArrowRight, ShieldCheck } from "lucide-react";

interface ManagerSecurityGateProps {
  title?: string;
  description?: string;
  onSwitchToManager: () => void;
  onNavigateHome: () => void;
}

/**
 * Role Boundary Component
 * Strictly enforces Manager Mode vs Client View data access boundaries.
 */
export const ManagerSecurityGate: React.FC<ManagerSecurityGateProps> = ({
  title = "Manager Authorization Required",
  description = "This section contains sensitive internal fabrication data, wholesale margin pricing, and publishing command tools restricted to SMC Pro Fabrication Managers.",
  onSwitchToManager,
  onNavigateHome
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-6 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-600 dark:text-gold font-bold block">
            Security Gate • Client View Active
          </span>
          <h2 className="font-serif text-2xl font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-left space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-bold">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Gated Access Protection:</span>
          </div>
          <ul className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1 pl-5 list-disc">
            <li>Wholesale slab cost margins hidden</li>
            <li>Internal telemetry & build deployments locked</li>
            <li>Client quotes remain strictly read-only</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-mono text-xs font-bold transition-all cursor-pointer"
          >
            Return Home
          </button>
          <button
            onClick={onSwitchToManager}
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Switch to Manager</span>
          </button>
        </div>
      </div>
    </div>
  );
};
