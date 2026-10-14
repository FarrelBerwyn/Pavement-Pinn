/**
 * Application state shared by both shells and every page: road segments, the selected
 * segment, community reports, the latest simulation result and the audit trail.
 *
 * State and handlers were lifted verbatim out of the original App.tsx. Everything is
 * IN-MEMORY: there is no backend persistence, so a page refresh restores the seed data.
 * The data is shared across demo identities by design (it stands in for a backend).
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addReport, createReportState, replaceReport, ReportState, toggleUpvote, viewReportsAs } from '../../features/community-reports/reportState';
import { RoadSegment, SimulationResult, AuditLogItem, DamageReport } from '../../types';
import { INDONESIAN_ROAD_SEGMENTS } from '../../data/reference/indonesianRoads';
import { INITIAL_COMMUNITY_REPORTS } from '../../data/mock/communityReports';
import { INITIAL_AUDIT_LOGS } from '../../data/mock/auditLogs';
import { runPinnSimulation } from '../../engines/pinn/core/pinnEngine';
import { DEFAULT_PUBLIC_ACCOUNT, useSession } from './SessionProvider';

export interface AppStateValue {
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  selectSegment: (segment: RoadSegment) => void;
  communityReports: DamageReport[];
  addCommunityReport: (newReport: DamageReport) => void;
  editCommunityReport: (updatedReport: DamageReport) => void;
  upvoteCommunityReport: (reportId: string) => void;
  currentResult: SimulationResult | null;
  completeSimulation: (result: SimulationResult) => void;
  auditLogs: AuditLogItem[];
}

const AppStateContext = createContext<AppStateValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeRole, currentAccount } = useSession();

  const [roadSegments] = useState<RoadSegment[]>(INDONESIAN_ROAD_SEGMENTS);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment>(INDONESIAN_ROAD_SEGMENTS[0]);

  // Community Damage Reports State. Counts are shared; who upvoted what is tracked per
  // account, so one demo identity's upvotes do not appear as another identity's.
  const [reportState, setReportState] = useState<ReportState>(() =>
    createReportState(INITIAL_COMMUNITY_REPORTS, DEFAULT_PUBLIC_ACCOUNT.id)
  );
  const communityReports = useMemo(
    () => viewReportsAs(reportState, currentAccount.id),
    [reportState, currentAccount.id]
  );

  // Initial Simulation Result
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);

  // Audit Trail Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  // Add Community Damage Report
  const addCommunityReport = (newReport: DamageReport) => {
    setReportState((prev) => addReport(prev, currentAccount.id, newReport));

    // Append to audit logs
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userRole: activeRole,
      userAgency: currentAccount.agency,
      action: 'LAPORAN KERUSAKAN WARGA',
      segmentName: newReport.segmentName,
      details: `Laporan: ${newReport.damageTypeLabel} (Dalam: ${newReport.estimatedDepthCm} cm). Korelasi WIM: ${newReport.wimCorrelation.recentTruckPlate} (+${newReport.wimCorrelation.overloadPercent}% Overload).`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Edit Community Damage Report
  const editCommunityReport = (updatedReport: DamageReport) => {
    setReportState((prev) => replaceReport(prev, updatedReport));

    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userRole: activeRole,
      userAgency: currentAccount.agency,
      action: 'EDIT LAPORAN WARGA',
      segmentName: updatedReport.segmentName,
      details: `Perubahan: ${updatedReport.damageTypeLabel} (Dalam: ${updatedReport.estimatedDepthCm} cm, Luas: ${updatedReport.estimatedAreaM2} m²). Status: ${updatedReport.status}.`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Upvote Community Damage Report
  const upvoteCommunityReport = (reportId: string) => {
    setReportState((prev) => toggleUpvote(prev, currentAccount.id, reportId));
  };

  // Run initial simulation on load
  useEffect(() => {
    const initialRes = runPinnSimulation(
      {
        segmentId: selectedSegment.id,
        axleLoadTon: selectedSegment.defaultAxleLoadTon,
        rainIntensityMmHr: 45,
        floodDurationHours: 6,
        surfaceTemperatureC: 42,
        subgradeCbrPercent: selectedSegment.defaultCbrPercent,
        asphaltThicknessCm: selectedSegment.defaultAsphaltThicknessCm,
        asphaltModulusMpa: 2400,
        targetDevice: 'NPU',
        precisionMode: 'INT8_NNCF'
      },
      selectedSegment
    );
    setCurrentResult(initialRes);
  }, [selectedSegment]);

  // Callback when a new simulation finishes
  const completeSimulation = (result: SimulationResult) => {
    setCurrentResult(result);

    // Append to Audit Logs
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userRole: activeRole,
      userAgency:
        activeRole === 'FIELD_ENGINEER'
          ? 'BBPJN / Dinas PUPR'
          : activeRole === 'OPERATIONS_MANAGER'
          ? 'Kemenhub / BPTD'
          : 'Kepala Dinas / PU',
      action: 'INFERENSI PINN OPENVINO',
      segmentName: result.roadSegment.name,
      details: `PCI: ${result.predictedPci}, Latensi OpenVINO: ${result.telemetry.inferenceLatencyMs} ms (${result.telemetry.deviceUsed})`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const value: AppStateValue = {
    roadSegments,
    selectedSegment,
    selectSegment: setSelectedSegment,
    communityReports,
    addCommunityReport,
    editCommunityReport,
    upvoteCommunityReport,
    currentResult,
    completeSimulation,
    auditLogs
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
}
