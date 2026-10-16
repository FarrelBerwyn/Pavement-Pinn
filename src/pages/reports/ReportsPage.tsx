import React from 'react';
import { FileText } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { CommunityReportsDashboard } from '../../features/community-reports/CommunityReportsDashboard';
import { usePageContext } from '../../app/pageContext';
import { useAppState } from '../../app/providers/AppStateProvider';
import { ReportWorkflowPanel } from '../../features/workflow/ReportWorkflowPanel';

/**
 * Route: /reports/ — community road-damage reports (public).
 *
 * Markup moved verbatim from the modern shell's "REPORTS" overlay.
 */
export const ReportsPage: React.FC = () => {
  const { activeRole, currentAccount, roadSegments, communityReports, onAddReport, onEditReport, onUpvoteReport, onSelectSegment, onLaunchSimulation, setActiveNav } = usePageContext();
  const { workflow } = useAppState();

  return (
    <PageOverlay
      icon={<FileText />}
      title="Laporan warga"
      subtitle="Kerusakan jalan yang dilaporkan masyarakat"
      backLabel="Kembali ke peta"
      onBack={() => setActiveNav('MAP')}
    >
        <CommunityReportsDashboard
          activeRole={activeRole}
          currentAccount={currentAccount}
          roadSegments={roadSegments}
          reports={communityReports}
          onAddReport={onAddReport}
          onEditReport={onEditReport}
          renderWorkflowPanel={(reportId) => (
            <ReportWorkflowPanel
              view={workflow.views[reportId] ?? null}
              mode={workflow.mode}
              engineers={workflow.engineers}
              onRun={(command) => workflow.runTransition(reportId, command)}
            />
          )}
          onUpvoteReport={onUpvoteReport}
          onSelectSegmentForMap={(segmentId) => {
            const seg = roadSegments.find((s) => s.id === segmentId);
            if (seg) onSelectSegment(seg);
            setActiveNav('MAP');
          }}
          onRunSimulationForSegment={(seg) => {
            onLaunchSimulation(seg);
            setActiveNav('SIMULATION');
          }}
        />
    </PageOverlay>
  );
};
