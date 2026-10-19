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
    <div className="w-full h-full min-w-0 bg-workspace text-ink px-4 sm:px-5 py-5 pb-8 overflow-y-auto custom-scrollbar space-y-4 animate-in fade-in duration-150 select-text">
      {/* Header Panel matching M.O Dashboard Pusat Operasi Jalan header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel border border-line-subtle px-4 py-3 sm:px-5 rounded-card">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-card border border-line-subtle text-[#E8B52B] flex items-center justify-center shrink-0 [&>svg]:w-4.5 [&>svg]:h-4.5">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold text-ink tracking-tight leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-ink-2 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onBack}
          className="h-8 px-3 rounded-control border border-line-subtle bg-card hover:bg-raised text-ink text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B52B]/60"
        >
          <MapIcon className="w-3.5 h-3.5 text-[#E8B52B]" />
          <span>{backLabel}</span>
        </button>
      </div>

      <div className="w-full min-w-0 space-y-4">
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
