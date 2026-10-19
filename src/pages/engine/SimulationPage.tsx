import React from 'react';
import { Cpu } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { SimulationPanel } from '../../components/simulation-viewer/SimulationPanel';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engine/simulation/ — interactive PINN simulation panel.
 */
export const SimulationPage: React.FC = () => {
  const { activeRole, roadSegments, selectedSegment, onSelectSegment, currentResult, onSimulationComplete, onOpenOpenvinoModal, setActiveNav } = usePageContext();

  return (
    <PageOverlay
      icon={<Cpu />}
      title="Mesin Rumus RULE_BASED (PI-surrogate direncanakan)"
      subtitle="Interactive Pavement Degradation Physics & OpenVINO Inference"
      backLabel="Back to Map"
      onBack={() => setActiveNav('MAP')}
    >
      <SimulationPanel
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onSelectSegment={onSelectSegment}
        activeRole={activeRole}
        currentResult={currentResult}
        onSimulationComplete={onSimulationComplete}
        onOpenOpenvinoModal={onOpenOpenvinoModal}
      />
    </PageOverlay>
  );
};
