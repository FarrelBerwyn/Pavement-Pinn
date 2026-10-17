import React from 'react';
import { Map as MapIcon, HardHat } from 'lucide-react';
import { FieldEngineerTools } from '../../features/fwd/FieldEngineerTools';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engine/fwd/ — FWD deflection basin, strain tensors, overlay design and
 * field work-order (SPK) authorisation tools. Field engineers and operations managers.
 *
 * Markup moved verbatim from the modern shell's "ENGINEERING" overlay.
 */
export const FwdPage: React.FC = () => {
  const { currentAccount, currentResult, roadSegments, selectedSegment, onSelectSegment, communityReports, onEditReport, setActiveNav } = usePageContext();

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-w,0px)] z-40 bg-canvas p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-semibold">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Modul Rekayasa Sipil & Otorisasi SPK Lapangan
              </h2>
              <p className="text-xs text-slate-400">
                BBPJN Wilayah DKI-Jabar &bull; Insinyur: {currentAccount.name} ({currentAccount.nip})
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveNav('MAP')}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs flex items-center space-x-2 shadow-lg cursor-pointer"
          >
            <MapIcon className="w-4 h-4" />
            <span>Kembali ke Peta</span>
          </button>
        </div>

        <FieldEngineerTools
          currentAccount={currentAccount}
          simulationResult={currentResult}
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          communityReports={communityReports}
          onOpenTasks={() => setActiveNav('SPK_ORDERS')}
          onUpdateReportStatus={(repId, status, note) => {
            const rep = communityReports.find((r) => r.id === repId);
            if (rep && onEditReport) {
              onEditReport({
                ...rep,
                status,
                repairDetails: {
                  ...rep.repairDetails,
                  engineerNote: note || rep.repairDetails?.engineerNote
                }
              });
            }
          }}
        />
      </div>
    </div>
  );
};
