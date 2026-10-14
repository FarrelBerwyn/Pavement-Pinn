/**
 * Application-wide modals: OpenVINO diagnostics, audit trail and the Bina Marga WIM
 * pipeline. Hosting them here makes them available in BOTH shells — before the
 * restructure they were mounted only in the classic portal, so the buttons that open
 * them from the modern shell did nothing.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import { OpenVINOModelDiagnosticsModal } from '../../features/openvino-diagnostics/OpenVINOModelDiagnosticsModal';
import { AuditTrailModal } from '../../features/audit-trail/AuditTrailModal';
import { BinaMargaWimPipelineModal } from '../../features/wim/BinaMargaWimPipelineModal';
import { useAppState } from './AppStateProvider';
import { useSession } from './SessionProvider';
import { can } from '../../features/rbac/accessPolicy';

export interface GlobalModalsValue {
  openOpenvinoDiagnostics: () => void;
  openAuditTrail: () => void;
  openWimPipeline: () => void;
}

const GlobalModalsContext = createContext<GlobalModalsValue | null>(null);

export const GlobalModalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentResult, auditLogs } = useAppState();
  const { currentAccount } = useSession();
  // M1c: only official roles may open the audit trail; the API enforces the same rule.
  const mayViewAudit = can(currentAccount.role, 'VIEW_AUDIT_TRAIL');
  const [isOpenOpenvinoModal, setIsOpenOpenvinoModal] = useState<boolean>(false);
  const [isOpenAuditModal, setIsOpenAuditModal] = useState<boolean>(false);
  const [isOpenBinaMargaModal, setIsOpenBinaMargaModal] = useState<boolean>(false);

  const value = useMemo<GlobalModalsValue>(
    () => ({
      openOpenvinoDiagnostics: () => setIsOpenOpenvinoModal(true),
      openAuditTrail: () => setIsOpenAuditModal(mayViewAudit),
      openWimPipeline: () => setIsOpenBinaMargaModal(true)
    }),
    [mayViewAudit]
  );

  return (
    <GlobalModalsContext.Provider value={value}>
      {children}

      {/* Intel OpenVINO Edge AI Diagnostics Modal */}
      <OpenVINOModelDiagnosticsModal
        isOpen={isOpenOpenvinoModal}
        onClose={() => setIsOpenOpenvinoModal(false)}
        telemetry={currentResult?.telemetry}
      />

      {/* Audit Trail Modal */}
      <AuditTrailModal isOpen={isOpenAuditModal && mayViewAudit} onClose={() => setIsOpenAuditModal(false)} auditLogs={auditLogs} />

      {/* Bina Marga WIM Scraper & PINN Training Pipeline Modal */}
      <BinaMargaWimPipelineModal isOpen={isOpenBinaMargaModal} onClose={() => setIsOpenBinaMargaModal(false)} />
    </GlobalModalsContext.Provider>
  );
};

export function useGlobalModals(): GlobalModalsValue {
  const value = useContext(GlobalModalsContext);
  if (!value) throw new Error('useGlobalModals must be used inside <GlobalModalsProvider>');
  return value;
}
