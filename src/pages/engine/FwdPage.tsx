import React from 'react';
import { HardHat } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { FieldEngineerTools } from '../../features/fwd/FieldEngineerTools';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engine/fwd/ — FWD deflection basin, strain tensors, overlay design and
 * field work-order (SPK) authorisation tools. Field engineers and operations managers.
 */
export const FwdPage: React.FC = () => {
  const { currentAccount, currentResult, roadSegments, selectedSegment, onSelectSegment, communityReports, onEditReport, setActiveNav } = usePageContext();

  return (
    <PageOverlay
      icon={<HardHat />}
      title="Modul Rekayasa Sipil & Otorisasi SPK Lapangan"
      subtitle={`BBPJN Wilayah DKI-Jabar • Insinyur: ${currentAccount.name} (${currentAccount.nip || 'NIP -'})`}
      backLabel="Kembali ke Peta"
      onBack={() => setActiveNav('MAP')}
    >
      <FieldEngineerTools
        currentAccount={currentAccount}
        simulationResult={currentResult}
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onSelectSegment={onSelectSegment}
        communityReports={communityReports}
        onOpenTasks={() => setActiveNav('SPK_ORDERS')}
        onUpdateReportStatus={(repId, status, note) => {
          const rep = communityReports.find((r) => r.id === repId);
          if (rep && onEditReport) {
            onEditReport({
              ...rep,
              status,
              repairDetails: {
                ...rep.repairDetails,
                engineerNote: note || rep.repairDetails?.engineerNote
              }
            });
          }
        }}
      />
    </PageOverlay>
  );
};
