import React from 'react';
import { OperationsHomeView } from '../../features/wim/OperationsHomeView';
import { OperationsManagerAppView } from '../../features/wim/OperationsManagerAppView';
import { OperationsPosWimMapView } from '../../features/wim/OperationsPosWimMapView';
import { usePageContext } from '../../app/pageContext';
import type { WorkspaceNav } from '../../app/navigation';
import { WorkflowQueueSection } from '../workflow/WorkflowQueueSection';

/** Shell view keys that the operations workspace renders. */
export const OPERATIONS_WORKSPACE_NAVS: readonly WorkspaceNav[] = [
  'PETA_POS_WIM',
  'MAP',
  'BERANDA_OPERASI',
  'DASHBOARD',
  'MONITORING_KONDISI_JALAN',
  'MONITORING_POS_WIM',
  'MONITORING_ODOL',
  'MONITORING_CUACA_BANJIR',
  'TINDAKAN_REKAYASA',
  'ALERTS',
  'TINDAKAN_PERINGATAN',
  'WEATHER_FLOOD',
  'TRAFFIC_ENG'
];

interface OperationsPageProps {
  activeNav: WorkspaceNav;
  /** Opens the shell's report-creation flow. */
  setIsCreateReportModalOpen: (open: boolean) => void;
}

/**
 * Routes: /operations/** and (for operations managers) /dashboard/ — WIM map, operations
 * home, live monitoring, ODOL enforcement and alerts.
 * Each branch was moved verbatim from the modern shell's operations-manager branches,
 * in the original evaluation order.
 */
export const OperationsPage: React.FC<OperationsPageProps> = ({ activeNav, setIsCreateReportModalOpen }) => {
  const { currentAccount, roadSegments, selectedSegment, onSelectSegment, communityReports, currentResult, onLaunchSimulation, setActiveNav } = usePageContext();

  if (activeNav === 'PETA_POS_WIM' || activeNav === 'MAP') {
    return (
      <div className="w-full h-full overflow-hidden bg-[#e8ecf1]">
        <OperationsPosWimMapView
          currentAccount={currentAccount}
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          communityReports={communityReports}
          simulationResult={currentResult}
          onNavigateToWim={() => setActiveNav('DASHBOARD')}
          onNavigateToSPK={() => setActiveNav('SPK_ORDERS')}
          onNavigateToReports={() => setActiveNav('REPORTS')}
          onNavigateToAlerts={() => setActiveNav('ALERTS')}
          onOpenSimulation={(seg) => {
            onLaunchSimulation(seg);
            setActiveNav('SIMULATION');
          }}
        />
      </div>
    );
  }

  if (activeNav === 'BERANDA_OPERASI') {
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#0f172a]">
        <OperationsHomeView
          currentAccount={currentAccount}
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          communityReports={communityReports}
          onNavigateToWim={() => setActiveNav('DASHBOARD')}
          onNavigateToSPK={() => setActiveNav('SPK_ORDERS')}
          onNavigateToReports={() => setActiveNav('REPORTS')}
          onNavigateToMap={() => setActiveNav('MAP')}
          onOpenSimulation={(seg) => {
            onLaunchSimulation(seg);
            setActiveNav('SIMULATION');
          }}
        />
      </div>
    );
  }

  if (activeNav === 'DASHBOARD') {
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#0f172a]">
        {/* "Where should we act now?" — the shared report queue comes first. */}
        <WorkflowQueueSection />
        <OperationsHomeView
          currentAccount={currentAccount}
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          communityReports={communityReports}
          onNavigateToWim={() => setActiveNav('MONITORING_POS_WIM')}
          onNavigateToSPK={() => setActiveNav('SPK_ORDERS')}
          onNavigateToReports={() => setActiveNav('REPORTS')}
          onNavigateToMap={() => setActiveNav('MAP')}
          onOpenSimulation={(seg) => {
            onLaunchSimulation(seg);
            setActiveNav('SIMULATION');
          }}
        />
      </div>
    );
  }

  if (activeNav === 'MONITORING_KONDISI_JALAN' || activeNav === 'MONITORING_POS_WIM' || activeNav === 'MONITORING_ODOL' || activeNav === 'MONITORING_CUACA_BANJIR' || activeNav === 'TINDAKAN_REKAYASA') {
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#07090e]">
        <OperationsManagerAppView
          currentAccount={currentAccount}
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          communityReports={communityReports}
          simulationResult={currentResult}
          initialTab={
            activeNav === 'MONITORING_KONDISI_JALAN'
              ? 'COMMUNITY_WIM'
              : activeNav === 'MONITORING_POS_WIM'
              ? 'LIVE_WIM'
              : activeNav === 'MONITORING_ODOL'
              ? 'ENFORCEMENT_BATM'
              : activeNav === 'MONITORING_CUACA_BANJIR'
              ? 'DYNAMIC_TONNAGE'
              : 'DISPATCH'
          }
          onLaunchSimulation={(seg) => {
            onLaunchSimulation(seg);
            setActiveNav('SIMULATION');
          }}
          onOpenCreateReport={() => setIsCreateReportModalOpen(true)}
          onNavigateToEngineering={() => setActiveNav('ENGINEERING')}
          onNavigateToMap={() => setActiveNav('MAP')}
        />
      </div>
    );
  }

  if (activeNav === 'ALERTS' || activeNav === 'TINDAKAN_PERINGATAN' || activeNav === 'WEATHER_FLOOD' || activeNav === 'TRAFFIC_ENG') {
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#0f172a]">
        <OperationsHomeView
          currentAccount={currentAccount}
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={onSelectSegment}
          communityReports={communityReports}
          onNavigateToWim={() => setActiveNav('MONITORING_POS_WIM')}
          onNavigateToSPK={() => setActiveNav('SPK_ORDERS')}
          onNavigateToReports={() => setActiveNav('REPORTS')}
          onNavigateToMap={() => setActiveNav('MAP')}
          onOpenSimulation={(seg) => {
            onLaunchSimulation(seg);
            setActiveNav('SIMULATION');
          }}
        />
      </div>
    );
  }

  return null;
};
