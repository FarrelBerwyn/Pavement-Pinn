import React from 'react';
import { PavementPinnDashboard } from '../../features/engineering-dashboard/PavementPinnDashboard';
import { usePageContext } from '../../app/pageContext';

interface EngineeringPageProps {
  /** Header search text (shell state). */
  searchQuery: string;
  /** Opens the shell's report-creation flow. */
  setIsCreateReportModalOpen: (open: boolean) => void;
}

/**
 * Route: /engineering/ — field engineer dashboard (field engineers only).
 * Markup moved verbatim from the modern shell's field-engineer dashboard branch.
 */
export const EngineeringPage: React.FC<EngineeringPageProps> = ({ searchQuery, setIsCreateReportModalOpen }) => {
  const { currentAccount, roadSegments, selectedSegment, onSelectSegment, communityReports, currentResult, onLaunchSimulation, setActiveNav } = usePageContext();

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#07090e]">
      <PavementPinnDashboard
        currentAccount={currentAccount}
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onSelectSegment={onSelectSegment}
        communityReports={communityReports}
        currentResult={currentResult}
        searchQuery={searchQuery}
        onLaunchSimulation={(seg) => {
          onLaunchSimulation(seg);
          setActiveNav('SIMULATION');
        }}
        onOpenCreateReport={() => setIsCreateReportModalOpen(true)}
        onOpenTechnicalDetails={() => setActiveNav('ENGINEERING')}
        onNavigateToSPK={() => setActiveNav('SPK_ORDERS')}
        onNavigateToMap={() => setActiveNav('MAP')}
      />
    </div>
  );
};
