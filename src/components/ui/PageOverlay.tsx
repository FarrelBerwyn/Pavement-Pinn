import React from 'react';
import { Map as MapIcon } from 'lucide-react';

interface PageOverlayProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack: () => void;
  children: React.ReactNode;
}

/**
 * Full-screen page frame used by standalone route pages. Same visual language as the
 * overlays that already existed in the modern shell (reports, simulation, ...).
 */
export const PageOverlay: React.FC<PageOverlayProps> = ({ icon, title, subtitle, backLabel = 'Back to Map', onBack, children }) => {
  return (
    <div className="fixed inset-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200 text-slate-100 select-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black shrink-0">{icon}</div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-400/20 cursor-pointer shrink-0"
          >
            <MapIcon className="w-4 h-4" />
            <span>{backLabel}</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

export type ImplementationStatus = 'IMPLEMENTED' | 'SIMULATED' | 'PLANNED';

const STATUS_STYLE: Record<ImplementationStatus, string> = {
  IMPLEMENTED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  SIMULATED: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  PLANNED: 'bg-slate-500/15 text-slate-300 border-slate-500/40'
};

/** Honest capability label: what is really implemented vs simulated vs not built yet. */
export const StatusBadge: React.FC<{ status: ImplementationStatus }> = ({ status }) => (
  <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
    {status}
  </span>
);
