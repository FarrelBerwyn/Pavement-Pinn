import React from 'react';
import { Map as MapIcon, Cpu } from 'lucide-react';
import { SimulationPanel } from '../../components/simulation-viewer/SimulationPanel';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engine/simulation/ — interactive PINN simulation panel.
 *
 * Markup moved verbatim from the modern shell's "SIMULATION" overlay.
 */
export const SimulationPage: React.FC = () => {
  const { activeRole, roadSegments, selectedSegment, onSelectSegment, currentResult, onSimulationComplete, onOpenOpenvinoModal, setActiveNav } = usePageContext();

  return (
    <div className="fixed inset-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl p-4 sm:p-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Physics-Informed Neural Network (PINN) Solver</h2>
              <p className="text-xs text-slate-400">Interactive Pavement Degradation Physics & OpenVINO Inference</p>
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

        <SimulationPanel
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          activeRole={activeRole}
          currentResult={currentResult}
          onSimulationComplete={onSimulationComplete}
          onOpenOpenvinoModal={onOpenOpenvinoModal}
        />
      </div>
    </div>
  );
};
