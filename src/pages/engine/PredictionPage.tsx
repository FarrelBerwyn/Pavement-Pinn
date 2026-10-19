import React from 'react';
import { History } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { RoadHistoryView } from '../../features/road-health/RoadHistoryView';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engine/prediction/ — PCI trend and treatment history per corridor.
 */
export const PredictionPage: React.FC = () => {
  const { roadSegments, selectedSegment, onSelectSegment, communityReports, isFieldEngineer, isOperationsManager, setActiveNav } = usePageContext();

  return (
    <PageOverlay
      icon={<History />}
      title="Riwayat Penanganan & Degradasi Koridor"
      subtitle="Log Pemeliharaan Berkala, Rekonstruksi, dan Audit Integritas Struktural Balai"
      backLabel={(isFieldEngineer || isOperationsManager) ? 'Kembali ke Dashboard' : 'Kembali ke Peta'}
      onBack={() => setActiveNav((isFieldEngineer || isOperationsManager) ? 'DASHBOARD' : 'MAP')}
    >
      <RoadHistoryView
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onSelectSegment={onSelectSegment}
        communityReports={communityReports}
      />
    </PageOverlay>
  );
};
