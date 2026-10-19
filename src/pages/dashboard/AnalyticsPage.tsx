import React from 'react';
import { BarChart2 } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /dashboard/analytics/ — national pavement-health summary cards (public).
 *
 * The three figures are STATIC demonstration values, not computed from data.
 * Markup moved verbatim from the modern shell's "ANALYTICS" overlay.
 */
export const AnalyticsPage: React.FC = () => {
  const { setActiveNav } = usePageContext();

  return (
    <PageOverlay
      icon={<BarChart2 />}
      title="National Pavement Health & Telemetry Analytics"
      subtitle="Aggregated PCI Distribution, ODOL Truck Correlations & Damage Frequency"
      backLabel="Back to Map"
      onBack={() => setActiveNav('MAP')}
    >
      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center justify-between">
            <span>Road Health Index</span>
            <span className="text-emerald-400 font-mono">78%</span>
          </h3>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '78%' }} />
          </div>
          <p className="text-xs text-slate-400">
            78% of audited national corridors are currently in good-to-moderate condition.
          </p>
        </div>

        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center justify-between">
            <span>Critical Damage Hotspots</span>
            <span className="text-rose-400 font-mono">24 Locations</span>
          </h3>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: '24%' }} />
          </div>
          <p className="text-xs text-slate-400">
            High concentration along Jalur Pantura Jawa and Trans-Sumatra corridors.
          </p>
        </div>

        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center justify-between">
            <span>WIM Overload Attribution</span>
            <span className="text-amber-400 font-mono">82.4%</span>
          </h3>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: '82.4%' }} />
          </div>
          <p className="text-xs text-slate-400">
            Over 82% of rapid asphalt fatigue failure is correlated directly with ODOL heavy vehicle passes.
          </p>
        </div>
      </div>
    </PageOverlay>
  );
};
