import React from 'react';
import { FileText, Map as MapIcon } from 'lucide-react';
import { CommunityReportsDashboard } from '../../features/community-reports/CommunityReportsDashboard';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /reports/ — community road-damage reports (public).
 *
 * Markup moved verbatim from the modern shell's "REPORTS" overlay.
 */
export const ReportsPage: React.FC = () => {
  const { activeRole, currentAccount, roadSegments, communityReports, onAddReport, onUpvoteReport, onSelectSegment, onLaunchSimulation, setActiveNav } = usePageContext();

  return (
    <div className="fixed inset-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Community Road Damage Reports</h2>
              <p className="text-xs text-slate-400">Citizen verified road reports & WIM ODOL correlation</p>
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

        <CommunityReportsDashboard
          activeRole={activeRole}
          currentAccount={currentAccount}
          roadSegments={roadSegments}
          reports={communityReports}
          onAddReport={onAddReport}
          onUpvoteReport={onUpvoteReport}
          onSelectSegmentForMap={(segmentId) => {
            const seg = roadSegments.find((s) => s.id === segmentId);
            if (seg) onSelectSegment(seg);
            setActiveNav('MAP');
          }}
          onRunSimulationForSegment={(seg) => {
            onLaunchSimulation(seg);
            setActiveNav('SIMULATION');
          }}
        />
      </div>
    </div>
  );
};
