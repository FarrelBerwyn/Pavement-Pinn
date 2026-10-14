import React from 'react';
import { ExecutivePolicyView, PolicyTabType } from '../../features/policy-analysis/ExecutivePolicyView';
import { usePageContext } from '../../app/pageContext';

interface PolicyPageProps {
  /** Active executive tab — owned by the shell because its sidebar drives it. */
  policyNavTab: PolicyTabType;
  setPolicyNavTab: (tab: PolicyTabType) => void;
}

/**
 * Route: /policy/ — executive policy workspace (policy makers only).
 * Markup moved verbatim from the modern shell's policy-maker dashboard branch.
 */
export const PolicyPage: React.FC<PolicyPageProps> = ({ policyNavTab, setPolicyNavTab }) => {
  const { currentAccount, roadSegments, selectedSegment, onSelectSegment, communityReports, currentResult, onLaunchSimulation, setActiveNav } = usePageContext();

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#07090e]">
      <ExecutivePolicyView
        currentAccount={currentAccount}
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onSelectSegment={onSelectSegment}
        simulationResult={currentResult}
        communityReports={communityReports}
        activeNavTab={policyNavTab}
        onChangeNavTab={setPolicyNavTab}
        onOpenSimulation={(seg) => {
          onLaunchSimulation(seg);
          setActiveNav('SIMULATION');
        }}
        onNavigateToMap={() => setActiveNav('MAP')}
      />
    </div>
  );
};
