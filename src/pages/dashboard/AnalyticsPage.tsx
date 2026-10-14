import React from 'react';
import { Map as MapIcon, BarChart2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">National Pavement Health & Telemetry Analytics</h2>
              <p className="text-xs text-slate-400">Aggregated PCI Distribution, ODOL Truck Correlations & Damage Frequency</p>
            </div>
          </div>
          <button
            onClick={() => setActiveNav('MAP')}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-400/20"
          >
            <MapIcon className="w-4 h-4" />
            <span>Back to Map</span>
          </button>
        </div>

        {/* Analytics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#121622] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center justify-between">
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

          <div className="bg-[#121622] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center justify-between">
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

          <div className="bg-[#121622] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center justify-between">
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
      </div>
    </div>
  );
};
