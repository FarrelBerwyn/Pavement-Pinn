import React from 'react';
import { MyTasksView } from '../../features/work-orders/MyTasksView';
import { usePageContext } from '../../app/pageContext';
import { WorkflowQueueSection } from '../workflow/WorkflowQueueSection';

/**
 * Routes: /engineering/tasks/ and /operations/tasks/ — tasks, inspections and work
 * orders (SPK). Shared by field engineers and operations managers.
 * Markup moved verbatim from the modern shell's "SPK_ORDERS" branch.
 */
export const WorkOrdersPage: React.FC = () => {
  const { currentAccount, roadSegments, selectedSegment, onSelectSegment, communityReports, currentResult, onLaunchSimulation, setActiveNav } = usePageContext();

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#f8fafc]">
      {/* Shared workflow queue (server-backed). The task list below is the earlier demo planner. */}
      <WorkflowQueueSection />
      <MyTasksView
        currentAccount={currentAccount}
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onSelectSegment={onSelectSegment}
        simulationResult={currentResult}
        communityReports={communityReports}
        onOpenSimulation={(seg) => {
          onLaunchSimulation(seg);
          setActiveNav('SIMULATION');
        }}
        onNavigateToMap={() => setActiveNav('MAP')}
        onNavigateToTechnicalRef={() => setActiveNav('TECHNICAL_REFERENCE')}
      />
    </div>
  );
};
