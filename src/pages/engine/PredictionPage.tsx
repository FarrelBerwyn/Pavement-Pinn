import React from 'react';
import { Map as MapIcon, History } from 'lucide-react';
import { RoadHistoryView } from '../../features/road-health/RoadHistoryView';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engine/prediction/ — PCI trend and treatment history per corridor.
 *
 * Markup moved verbatim from the modern shell's "ROAD_HISTORY" overlay.
 */
export const PredictionPage: React.FC = () => {
  const { roadSegments, selectedSegment, onSelectSegment, communityReports, isFieldEngineer, isOperationsManager, setActiveNav } = usePageContext();

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-w,0px)] z-40 bg-[#0b0f19] p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                Riwayat Penanganan & Degradasi Koridor
              </h2>
              <p className="text-xs text-slate-400">
                Log Pemeliharaan Berkala, Rekonstruksi, dan Audit Integritas Struktural Balai
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveNav((isFieldEngineer || isOperationsManager) ? 'DASHBOARD' : 'MAP')}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-400/20 cursor-pointer hover:bg-amber-300 transition-all"
          >
            <MapIcon className="w-4 h-4" />
            <span>{(isFieldEngineer || isOperationsManager) ? 'Kembali ke Dashboard' : 'Kembali ke Peta'}</span>
          </button>
        </div>

        <RoadHistoryView
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          communityReports={communityReports}
        />
      </div>
    </div>
  );
};
