import React from 'react';
import { PavementPinnDashboard } from '../../features/engineering-dashboard/PavementPinnDashboard';
import { usePageContext } from '../../app/pageContext';
import { useAppState } from '../../app/providers/AppStateProvider';
import type { ReportCase } from '../../domain/workflow/model';
import { samePerson } from '../../domain/identity/people';

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
  const { workflow } = useAppState();
  const me = workflow.actor?.id ?? currentAccount.id;
  // Open cases an Operations Manager assigned to this engineer, soonest deadline first.
  const assignedTasks = Object.values(workflow.views)
    .filter((v) => v.audience === 'STAFF' && samePerson((v.case as ReportCase).assignment?.engineerId, me) && v.case.state !== 'RESOLVED' && v.case.state !== 'CLOSED')
    .map((v) => v.case as ReportCase)
    .sort((a, b) => Date.parse(a.assignment!.dueAt) - Date.parse(b.assignment!.dueAt));

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-workspace">
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
        assignedTasks={assignedTasks}
        onOpenRoadHistory={() => setActiveNav('ROAD_HISTORY')}
      />
    </div>
  );
};
