import React from 'react';
import { Map as MapIcon, BookOpen } from 'lucide-react';
import { TechnicalReferenceView } from '../../features/technical-reference/TechnicalReferenceView';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engineering/reference/ — PUPR technical guidelines and standards.
 *
 * Markup moved verbatim from the modern shell's "TECHNICAL_REFERENCE" overlay.
 */
export const TechnicalReferencePage: React.FC = () => {
  const { isFieldEngineer, isOperationsManager, setActiveNav } = usePageContext();

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-w,0px)] z-40 bg-[#0b0f19] p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                Pedoman Teknis & Standar PUPR
              </h2>
              <p className="text-xs text-slate-400">
                Spesifikasi Umum 2018 Rev 2, Manual Desain Perkerasan MDP 2017 & Standar ASTM D6433
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

        <TechnicalReferenceView />
      </div>
    </div>
  );
};
