import React from 'react';
import { MyTasksView } from '../../features/work-orders/MyTasksView';
import { usePageContext } from '../../app/pageContext';
import { useAppState } from '../../app/providers/AppStateProvider';
import { useRouter } from '../../app/router';
import { WorkflowQueueSection } from '../workflow/WorkflowQueueSection';

/**
 * Routes: /engineering/tasks/ and /operations/tasks/ — tasks, inspections and work
 * orders. Both read the shared report workflow:
 * - Field Engineer: "Tugas Saya", the cases assigned to this account.
 * - Operations Manager: the operations queue (triage, assignment, decisions, work orders).
 */
export const WorkOrdersPage: React.FC = () => {
  const { isFieldEngineer, currentAccount, roadSegments, onSelectSegment, onLaunchSimulation } = usePageContext();
  const { workflow } = useAppState();
  const { navigateTo } = useRouter();

  if (!isFieldEngineer) {
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar bg-surface">
        <WorkflowQueueSection />
      </div>
    );
  }

  const segmentOf = (segmentId: string) => roadSegments.find((s) => s.id === segmentId);

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-slate-50">
      <MyTasksView
        views={workflow.views}
        engineerId={workflow.actor?.id ?? currentAccount.id}
        mode={workflow.mode}
        engineers={workflow.engineers}
        loading={workflow.loading}
        error={workflow.error}
        onRefresh={() => void workflow.refresh()}
        onRun={workflow.runTransition}
        onShowOnMap={(c) => {
          const segment = segmentOf(c.segmentId);
          if (segment) onSelectSegment(segment);
          navigateTo('dashboard');
        }}
        onOpenSimulation={(c) => {
          const segment = segmentOf(c.segmentId);
          if (segment) onLaunchSimulation(segment);
        }}
      />
    </div>
  );
};
