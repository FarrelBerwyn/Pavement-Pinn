import React from 'react';
import { BookOpen } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { TechnicalReferenceView } from '../../features/technical-reference/TechnicalReferenceView';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /engineering/reference/ — PUPR technical guidelines and standards.
 *
 * Markup moved verbatim from the modern shell's "TECHNICAL_REFERENCE" overlay.
 */
export const TechnicalReferencePage: React.FC = () => {
  const { isFieldEngineer, isOperationsManager, setActiveNav } = usePageContext();

  return (
    <PageOverlay
      icon={<BookOpen />}
      title="Pedoman Teknis & Standar PUPR"
      subtitle="Spesifikasi Umum 2018 Rev 2, Manual Desain Perkerasan MDP 2017 & Standar ASTM D6433"
      backLabel={(isFieldEngineer || isOperationsManager) ? 'Kembali ke Dashboard' : 'Kembali ke Peta'}
      onBack={() => setActiveNav((isFieldEngineer || isOperationsManager) ? 'DASHBOARD' : 'MAP')}
    >
      <TechnicalReferenceView />
    </PageOverlay>
  );
};
