/**
 * Application state shared by both shells and every page: road segments, the selected
 * segment, community reports (from the workflow store), the latest simulation result and
 * the audit trail.
 *
 * Reports are the canonical workflow records served by the API (src/services/api/
 * workflowClient.ts). A change is shown only after the server confirmed it was saved.
 * On the static GitHub Pages build there is no API: the same workflow rules run in the
 * browser's memory and the UI labels that mode ("offline demo").
 *
 * Upvotes remain a per-browser demo interaction (not stored on the server).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createReportState, ReportState, toggleUpvote, viewReportsAs } from '../../features/community-reports/reportState';
import { RoadSegment, SimulationResult, AuditLogItem, DamageReport, ReportMutationOutcome, UserRole } from '../../types';
import { INDONESIAN_ROAD_SEGMENTS } from '../../data/reference/indonesianRoads';
import { KARAWANG_PILOT_SEGMENTS } from '../../data/reference/karawangPilot';
import { INITIAL_COMMUNITY_REPORTS } from '../../data/mock/communityReports';
import { USER_ACCOUNTS } from '../../features/authentication/demoAccounts';
import { runPinnSimulation } from '../../engines/pinn/core/pinnEngine';
import { isOfficialRole } from '../../domain/access';
import type { Actor } from '../../domain/workflow/model';
import type { WorkflowCommand } from '../../domain/workflow/stateMachine';
import type { AuditEvent } from '../../domain/workflow/service';
import {
  createWorkflowGateway,
  displayReport,
  EngineerSummary,
  GatewayMode,
  ReportView,
  WorkflowApiError,
  WorkflowGateway
} from '../../services/api/workflowClient';
import { isAnonymousAccount, useSession } from './SessionProvider';

/** Seed upvote flags belong to the reporter persona the demo data was written for. */
const SEED_UPVOTE_OWNER = 'USR-004';

export type MutationResult = ReportMutationOutcome;

export interface WorkflowState {
  mode: GatewayMode;
  /** Server actor for this tab (anonymous visitors get a server-issued anon-… id). */
  actor: Actor | null;
  loading: boolean;
  error: string | null;
  views: Record<string, ReportView>;
  engineers: EngineerSummary[];
  refresh: () => Promise<void>;
  runTransition: (reportId: string, command: WorkflowCommand) => Promise<MutationResult>;
  loadView: (reportId: string) => Promise<ReportView | null>;
  /** Assessment, Road Story and What-If for a segment (same gateway, same identity). */
  gateway: WorkflowGateway;
}

export interface AppStateValue {
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  selectSegment: (segment: RoadSegment) => void;
  communityReports: DamageReport[];
  addCommunityReport: (newReport: DamageReport) => Promise<MutationResult>;
  editCommunityReport: (updatedReport: DamageReport) => Promise<MutationResult>;
  upvoteCommunityReport: (reportId: string) => void;
  currentResult: SimulationResult | null;
  completeSimulation: (result: SimulationResult) => void;
  auditLogs: AuditLogItem[];
  workflow: WorkflowState;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const ROAD_SEGMENTS: RoadSegment[] = [...KARAWANG_PILOT_SEGMENTS, ...INDONESIAN_ROAD_SEGMENTS];

function roleOfDemoAccount(id: string): UserRole | null {
  return USER_ACCOUNTS.find((a) => a.id === id)?.role ?? null;
}

const LOCAL_ENGINEERS: EngineerSummary[] = USER_ACCOUNTS.filter((a) => a.role === 'FIELD_ENGINEER').map((a) => ({
  id: a.id,
  name: a.name,
  title: a.title,
  agencyCode: a.agencyCode
}));

function errorResult(error: unknown): MutationResult {
  if (error instanceof WorkflowApiError) return { ok: false, error: error.message, code: error.code };
  return { ok: false, error: (error as Error)?.message || 'Unknown error', code: 'UNKNOWN' };
}

function auditToLogItem(e: AuditEvent): AuditLogItem {
  return {
    id: e.id,
    timestamp: new Date(e.at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }),
    userRole: (e.actor.role === 'SYSTEM' ? 'PUBLIC_VIEWER' : e.actor.role) as UserRole,
    userAgency: e.actor.role === 'SYSTEM' ? 'Sistem (penyaringan otomatis)' : `${e.actor.id}${e.actor.kind === 'ANONYMOUS' ? ' (anonim)' : ''}`,
    action: e.action,
    segmentName: e.entityId,
    details: `${e.from ?? '—'} → ${e.to ?? '—'}: ${e.reason}`
  };
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeRole, currentAccount } = useSession();

  const [roadSegments] = useState<RoadSegment[]>(ROAD_SEGMENTS);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment>(ROAD_SEGMENTS[0]);

  // Report list with the per-account upvote ledger. Starts from the bundled seed so the
  // map is never empty, then is replaced by the workflow store's records.
  const [reportState, setReportState] = useState<ReportState>(() => createReportState(INITIAL_COMMUNITY_REPORTS, SEED_UPVOTE_OWNER));
  const communityReports = useMemo(() => viewReportsAs(reportState, currentAccount.id), [reportState, currentAccount.id]);

  const gateway = useMemo(() => createWorkflowGateway(INITIAL_COMMUNITY_REPORTS, roleOfDemoAccount, LOCAL_ENGINEERS, ROAD_SEGMENTS), []);
  const [views, setViews] = useState<Record<string, ReportView>>({});
  const [actor, setActor] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engineers, setEngineers] = useState<EngineerSummary[]>([]);
  const [serverAudit, setServerAudit] = useState<AuditLogItem[]>([]);
  const [localLogs, setLocalLogs] = useState<AuditLogItem[]>([]);
  const isOfficial = isOfficialRole(currentAccount.role);
  const sessionReady = useRef<Promise<unknown>>(Promise.resolve());

  /** Put confirmed server views into state; keep local upvote counts for known reports. */
  const applyViews = useCallback((incoming: ReportView[], replaceAll: boolean) => {
    setViews((prev) => {
      const next: Record<string, ReportView> = replaceAll ? {} : { ...prev };
      for (const v of incoming) next[v.case.id] = v;
      return next;
    });
    setReportState((prev) => {
      const counts = new Map(prev.reports.map((r) => [r.id, r.upvotesCount]));
      const incomingReports = incoming.map((v) => {
        const r = displayReport(v);
        return counts.has(r.id) ? { ...r, upvotesCount: counts.get(r.id)! } : r;
      });
      if (replaceAll) return { reports: incomingReports, ledger: prev.ledger };
      const byId = new Map(prev.reports.map((r) => [r.id, r]));
      for (const r of incomingReports) byId.set(r.id, r);
      const order = [...incomingReports.filter((r) => !prev.reports.some((p) => p.id === r.id)), ...prev.reports.map((p) => byId.get(p.id)!)];
      return { reports: order, ledger: prev.ledger };
    });
  }, []);

  const refreshAudit = useCallback(async () => {
    if (!isOfficial) {
      setServerAudit([]);
      return;
    }
    try {
      setServerAudit((await gateway.audit()).map(auditToLogItem));
    } catch {
      setServerAudit([]);
    }
  }, [gateway, isOfficial]);

  const refresh = useCallback(async () => {
    await sessionReady.current;
    try {
      applyViews(await gateway.listReports(), true);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    await refreshAudit();
  }, [gateway, applyViews, refreshAudit]);

  // Re-establish the server session whenever the identity changes, then reload.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const account = isAnonymousAccount(currentAccount) ? null : { id: currentAccount.id, role: currentAccount.role };
    const ready = gateway.useAccount(account);
    sessionReady.current = ready.catch(() => undefined);
    ready
      .then(async (a) => {
        if (cancelled) return;
        setActor(a);
        if (isOfficialRole(currentAccount.role)) {
          gateway.engineers().then((list) => !cancelled && setEngineers(list)).catch(() => setEngineers([]));
        } else {
          setEngineers([]);
        }
        await refresh();
      })
      .catch((e) => {
        if (cancelled) return;
        setActor(null);
        setError((e as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gateway, currentAccount, refresh]);

  // Initial Simulation Result
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);

  const addCommunityReport = useCallback(
    async (newReport: DamageReport): Promise<MutationResult> => {
      await sessionReady.current;
      try {
        const { view, claimToken } = await gateway.submit(newReport);
        applyViews([view], false);
        await refreshAudit();
        return { ok: true, report: displayReport(view), claimToken };
      } catch (e) {
        return errorResult(e);
      }
    },
    [gateway, applyViews, refreshAudit]
  );

  const editCommunityReport = useCallback(
    async (updatedReport: DamageReport): Promise<MutationResult> => {
      await sessionReady.current;
      const current = views[updatedReport.id];
      if (!current) return { ok: false, error: 'Laporan belum dimuat dari server.', code: 'NOT_FOUND' };
      const patch: Partial<DamageReport> = {
        description: updatedReport.description,
        estimatedDepthCm: updatedReport.estimatedDepthCm,
        estimatedAreaM2: updatedReport.estimatedAreaM2,
        severity: updatedReport.severity,
        damageType: updatedReport.damageType,
        damageTypeLabel: updatedReport.damageTypeLabel,
        photoUrl: updatedReport.photoUrl
      };
      try {
        const view = await gateway.editContent(updatedReport.id, patch, current.case.version);
        applyViews([view], false);
        await refreshAudit();
        return { ok: true, report: displayReport(view) };
      } catch (e) {
        if (e instanceof WorkflowApiError && e.code === 'VERSION_CONFLICT') await refresh();
        return errorResult(e);
      }
    },
    [gateway, views, applyViews, refresh, refreshAudit]
  );

  const runTransition = useCallback(
    async (reportId: string, command: WorkflowCommand): Promise<MutationResult> => {
      await sessionReady.current;
      const current = views[reportId];
      if (!current) return { ok: false, error: 'Laporan belum dimuat dari server.', code: 'NOT_FOUND' };
      try {
        const view = await gateway.transition(reportId, command, current.case.version);
        applyViews([view], false);
        await refreshAudit();
        return { ok: true, report: displayReport(view) };
      } catch (e) {
        if (e instanceof WorkflowApiError && e.code === 'VERSION_CONFLICT') await refresh();
        return errorResult(e);
      }
    },
    [gateway, views, applyViews, refresh, refreshAudit]
  );

  const loadView = useCallback(
    async (reportId: string): Promise<ReportView | null> => {
      await sessionReady.current;
      try {
        const view = await gateway.getReport(reportId);
        applyViews([view], false);
        return view;
      } catch {
        return null;
      }
    },
    [gateway, applyViews]
  );

  // Upvote Community Damage Report (per-browser demo interaction)
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

  // Callback when a new simulation finishes (a local session event, not a workflow change)
  const completeSimulation = (result: SimulationResult) => {
    setCurrentResult(result);
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userRole: activeRole,
      userAgency: `${currentAccount.agencyCode} (sesi lokal)`,
      action: 'SIMULASI RULE-BASED (LOKAL)',
      segmentName: result.roadSegment.name,
      details: `PCI prototipe: ${result.predictedPci}. Mesin formula deterministik (RULE_BASED), bukan PINN terlatih.`
    };
    setLocalLogs((prev) => [newLog, ...prev]);
  };

  // M1c: the audit trail is for official roles only (the server enforces the same rule).
  const auditLogs = useMemo(() => (isOfficial ? [...serverAudit, ...localLogs] : []), [isOfficial, serverAudit, localLogs]);

  const workflow: WorkflowState = {
    mode: gateway.mode,
    actor,
    loading,
    error,
    views,
    engineers,
    refresh,
    runTransition,
    loadView,
    gateway
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
    auditLogs,
    workflow
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
}
