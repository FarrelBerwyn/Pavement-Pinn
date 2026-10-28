/**
 * Workspace gateway for the browser. Against the Express server it calls /api/v3/** (the
 * server is the authority). On the static host (GitHub Pages, no backend) it runs the same
 * pure commands in memory; every stage that needs the inference service is recorded as
 * blocked, so the static build can show the workspace but never pretends to analyse.
 */
import { apiUrl, isStaticHost } from '../../services/api/client';
import type { Actor } from '../../domain/workflow/model';
import type { Workspace } from '../../domain/workspace/types';
import { STAGE_IDS } from '../../domain/workspace/types';
import { addGroundTruth, applyCorrection, decideVersion, submitVersion, type CommandOutcome } from '../../domain/workspace/commands';
import { buildDemoWorkspace, DEMO_REPORT_ID } from '../../domain/workspace/demo';
import { buildCompletedWorkspace } from '../../domain/workspace/demoCompleted';
import { workspaceFromReport } from '../../domain/workspace/fromCase';
import { enforceScale } from '../../domain/workspace/measured';
import { latestRuns } from '../../domain/workspace/rerun';
import { portfolioKpi, workspaceKpi, type PortfolioKpi, type WorkspaceKpi } from '../../domain/workspace/metrics';
import { toPublicTrack, type PublicTrackView } from '../../domain/workspace/publicTrack';
import { normalizeBasePath } from '../../constants/deployment';

const BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL);
import type { DamageReport } from '../../types';
import type { AxleLoad, VehicleConfig, VehicleLoads } from '../../domain/workspace/vehicles';

export interface VehicleScenario {
  vehicle: VehicleConfig;
  loads: VehicleLoads;
  axles: Array<AxleLoad & { etUe: number | null; evUe: number | null; method?: string; error: string | null }>;
  governingIndex: number;
  field: { x_mm: number[]; z_mm: number[]; wheels_x_mm: number[]; interfaces_mm: number[]; eps_xx: { unit: string; values: Array<Array<number | null>> }; eps_zz: { unit: string; values: Array<Array<number | null>> }; sigma_zz: { unit: string; values: Array<Array<number | null>> } } | null;
  layersUsed: Array<{ name: string; thicknessMm: number | null; modulusMPa: number | null; source: string }>;
  dynamic: string;
  label: 'simulated';
  at: string;
}

export interface WorkspaceSummary {
  reportId: string;
  demo: boolean;
  segment: string;
  primaryObject: { objectId: string; class: string; scaleStatus: string; citizenSeverity: string | null } | null;
  stages: Array<{ stage: string; status: string | null }>;
  pendingVersions: Array<{ version: number; createdBy: string; createdAt: string; changeSummaryPublic: string }>;
  kpi: WorkspaceKpi;
  priority: null;
}

export class WorkspaceApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export interface WorkspaceGateway {
  readonly mode: 'SERVER' | 'OFFLINE_DEMO';
  list(): Promise<{ items: WorkspaceSummary[]; kpi: PortfolioKpi }>;
  get(reportId: string): Promise<Workspace>;
  correct(reportId: string, body: unknown): Promise<Workspace>;
  groundTruth(reportId: string, body: unknown): Promise<Workspace>;
  submit(reportId: string, body: { changeSummaryPublic: string; changeSummaryTechnical?: string }): Promise<Workspace>;
  decide(reportId: string, version: number, decision: 'approve' | 'reject', reason?: string): Promise<Workspace>;
  requestPhotos(reportId: string, body: { objectId?: string; slots: string[]; reason: string }): Promise<Workspace>;
  subscribe(reportId: string, onChange: () => void): () => void;
  track(code: string): Promise<PublicTrackView>;
  /** What-if MLET run for a configured vehicle on the report's layers (not stored). */
  vehicleScenario(reportId: string, vehicle: VehicleConfig): Promise<VehicleScenario>;
  confirm(code: string, repaired: boolean): Promise<PublicTrackView>;
}

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new WorkspaceApiError(res.status, data.code ?? 'ERROR', data.error ?? `HTTP ${res.status}`);
  return data as T;
}

const enc = encodeURIComponent;

export class HttpWorkspaceGateway implements WorkspaceGateway {
  readonly mode = 'SERVER' as const;
  async list() {
    const d = await http<{ items: WorkspaceSummary[]; kpi: PortfolioKpi }>('GET', '/api/v3/workspaces');
    return { items: d.items, kpi: d.kpi };
  }
  async get(id: string) {
    return (await http<{ workspace: Workspace }>('GET', `/api/v3/reports/${enc(id)}/workspace`)).workspace;
  }
  async correct(id: string, body: unknown) {
    return (await http<{ workspace: Workspace }>('POST', `/api/v3/reports/${enc(id)}/corrections`, body)).workspace;
  }
  async groundTruth(id: string, body: unknown) {
    return (await http<{ workspace: Workspace }>('POST', `/api/v3/reports/${enc(id)}/ground-truth`, body)).workspace;
  }
  async submit(id: string, body: { changeSummaryPublic: string }) {
    return (await http<{ workspace: Workspace }>('POST', `/api/v3/reports/${enc(id)}/versions/submit`, body)).workspace;
  }
  async decide(id: string, v: number, decision: 'approve' | 'reject', reason?: string) {
    return (await http<{ workspace: Workspace }>('POST', `/api/v3/reports/${enc(id)}/versions/${v}/${decision}`, { reason })).workspace;
  }
  async requestPhotos(id: string, body: unknown) {
    return (await http<{ workspace: Workspace }>('POST', `/api/v3/reports/${enc(id)}/photo-requests`, body)).workspace;
  }
  subscribe(id: string, onChange: () => void) {
    if (typeof EventSource === 'undefined') return () => undefined;
    const es = new EventSource(apiUrl(`/api/v3/reports/${enc(id)}/stream`), { withCredentials: true });
    const handler = () => onChange();
    for (const t of ['stage', 'object', 'version', 'workspace']) es.addEventListener(t, handler);
    return () => es.close();
  }
  async track(code: string) {
    return (await http<{ track: PublicTrackView }>('GET', `/api/public/track/${enc(code)}`)).track;
  }
  async vehicleScenario(id: string, vehicle: VehicleConfig) {
    return (await http<{ scenario: VehicleScenario }>('POST', `/api/v3/reports/${enc(id)}/vehicle-scenario`, { vehicle })).scenario;
  }
  async confirm(code: string, repaired: boolean) {
    return (await http<{ track: PublicTrackView }>('POST', `/api/public/track/${enc(code)}/confirm`, { repaired })).track;
  }
}

const OFFLINE_REASON = 'Versi statis: layanan inference tidak tersedia';

/** In-browser workspaces for the static build. Same pure commands; no analysis is executed. */
export class OfflineWorkspaceGateway implements WorkspaceGateway {
  readonly mode = 'OFFLINE_DEMO' as const;
  private readonly store = new Map<string, Workspace>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private seq = 0;

  constructor(reports: DamageReport[], private readonly actor: () => Actor) {
    const demo = buildDemoWorkspace(BASE_PATH);
    this.store.set(demo.reportId, demo);
    const done = buildCompletedWorkspace(BASE_PATH);
    this.store.set(done.reportId, done);
    for (const r of reports) {
      this.store.set(r.id, workspaceFromReport(r, { createdAt: r.createdAt ?? '2026-08-20T00:00:00.000Z', screening: null, demo: !r.origin }));
    }
  }

  private clock = { now: () => new Date().toISOString(), id: (p: string) => `${p}-L${(++this.seq).toString(36)}` };

  private guard() {
    const a = this.actor();
    if (a.role !== 'OPERATIONS_MANAGER' && a.role !== 'FIELD_ENGINEER') throw new WorkspaceApiError(403, 'FORBIDDEN', 'forbidden');
    return a;
  }

  private ws(id: string) {
    const w = this.store.get(id);
    if (!w) throw new WorkspaceApiError(404, 'NOT_FOUND', 'not found');
    return w;
  }

  private apply(id: string, out: CommandOutcome): Workspace {
    if ('status' in out) throw new WorkspaceApiError(out.status, out.code, out.message);
    // Nothing can execute here: queued runs become blocked with the reason.
    const next = { ...out.workspace, stageRuns: out.workspace.stageRuns.map((r) => (r.status === 'queued' ? { ...r, status: 'blocked' as const, reason: OFFLINE_REASON } : r)) };
    this.store.set(id, next);
    this.listeners.get(id)?.forEach((fn) => fn());
    return { ...next, objects: next.objects.map(enforceScale) };
  }

  async list() {
    this.guard();
    const all = [...this.store.values()];
    const items: WorkspaceSummary[] = all.map((w) => {
      const latest = latestRuns(w.stageRuns);
      const o = w.objects[0] ?? null;
      return {
        reportId: w.reportId,
        demo: w.demo,
        segment: w.segment,
        primaryObject: o ? { objectId: o.objectId, class: o.class.value, scaleStatus: o.quality.scaleStatus, citizenSeverity: o.reportedByCitizen?.severity ?? null } : null,
        stages: STAGE_IDS.map((s) => ({ stage: s, status: latest[s]?.status ?? null })),
        pendingVersions: w.versions.filter((v) => v.status === 'pending_approval').map((v) => ({ version: v.version, createdBy: v.createdBy, createdAt: v.createdAt, changeSummaryPublic: v.changeSummaryPublic })),
        kpi: workspaceKpi(w),
        priority: null
      };
    });
    return { items, kpi: portfolioKpi(all) };
  }
  async get(id: string) {
    this.guard();
    const w = this.ws(id);
    return { ...w, objects: w.objects.map(enforceScale) };
  }
  async correct(id: string, body: unknown) {
    return this.apply(id, applyCorrection(this.ws(id), body, this.guard(), this.clock));
  }
  async groundTruth(id: string, body: unknown) {
    return this.apply(id, addGroundTruth(this.ws(id), body, this.guard(), this.clock));
  }
  async submit(id: string, body: { changeSummaryPublic: string }) {
    return this.apply(id, submitVersion(this.ws(id), body, this.guard(), this.clock));
  }
  async decide(id: string, v: number, decision: 'approve' | 'reject', reason?: string) {
    return this.apply(id, decideVersion(this.ws(id), v, decision, reason, this.guard(), this.clock));
  }
  async requestPhotos(id: string, body: { objectId?: string; slots: string[]; reason: string }) {
    const a = this.guard();
    const w = this.ws(id);
    return this.apply(id, { ok: true, workspace: { ...w, audit: [...w.audit, { at: this.clock.now(), by: a.id, role: a.role, action: 'photo_requested', version: null, reason: body.reason, detail: `${body.objectId ?? ''} slot: ${body.slots.join(', ')}` }] } });
  }
  subscribe(id: string, fn: () => void) {
    if (!this.listeners.has(id)) this.listeners.set(id, new Set());
    this.listeners.get(id)!.add(fn);
    return () => this.listeners.get(id)?.delete(fn);
  }
  async track(code: string) {
    const w = [...this.store.values()].find((x) => x.trackingCode === code.toUpperCase());
    if (!w) throw new WorkspaceApiError(404, 'NOT_FOUND', 'not found');
    return toPublicTrack(w);
  }
  async vehicleScenario(): Promise<VehicleScenario> {
    throw new WorkspaceApiError(503, 'INFERENCE_UNAVAILABLE', OFFLINE_REASON);
  }
  async confirm(): Promise<PublicTrackView> {
    throw new WorkspaceApiError(409, 'NOT_ALLOWED', OFFLINE_REASON);
  }
}

let shared: WorkspaceGateway | null = null;

/** One gateway per page load. `actor` is read lazily so offline commands use the current session. */
export function workspaceGateway(reports: () => DamageReport[], actor: () => Actor): WorkspaceGateway {
  if (!shared) shared = isStaticHost() ? new OfflineWorkspaceGateway(reports(), actor) : new HttpWorkspaceGateway();
  return shared;
}

export { DEMO_REPORT_ID };
