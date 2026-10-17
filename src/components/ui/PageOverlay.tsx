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
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-w,0px)] z-40 bg-canvas p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200 text-slate-100 select-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5">{icon}</div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-white truncate">{title}</h2>
              {subtitle && <p className="text-sm text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onBack}
            className="h-10 px-4 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-slate-100 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            <MapIcon className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{backLabel}</span>
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
  <span className={`inline-block text-xs font-mono font-bold px-2 py-1 rounded-full border ${STATUS_STYLE[status]}`}>
    {status}
  </span>
);
