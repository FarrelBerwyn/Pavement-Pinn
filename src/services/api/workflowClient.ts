/**
 * Browser access to the report workflow.
 *
 * `HttpWorkflowGateway` talks to the Express API, which is authoritative: it decides the
 * actor from its own signed session token and persists every change before answering.
 *
 * `OfflineWorkflowGateway` runs the same domain service in the browser, in memory, for
 * the static GitHub Pages build where no API exists. The UI shows a visible
 * "offline demo" label in that mode; nothing there is persisted or authorized by a server.
 */
import { WORKFLOW_API_PATHS } from '../../types';
import type { DamageReport, UserRole } from '../../types';
import { apiUrl, isStaticHost } from './client';
import type { Actor, ReportCase, WorkflowAction } from '../../domain/workflow/model';
import { availableActions, type WorkflowCommand } from '../../domain/workflow/stateMachine';
import { toPublicView, type PublicReportView } from '../../domain/workflow/projections';
import { MemoryCaseStore, WorkflowService, type AuditEvent, type ServiceResult } from '../../domain/workflow/service';
import { DEMO_CV_PROVIDER } from '../../domain/workflow/screening';
import { canEditReport, isOfficialRole } from '../../domain/access';
import type { ReportDraft } from '../../domain/reports/reportFactory';
import type { RoadSegment } from '../../types';
import { assessSegment, ENGINE_INPUT_RANGES, type AssessmentInputs, type EngineeringAssessment } from '../../domain/intelligence/assessment';
import { explainAssessment, type StructuredExplanation } from '../../domain/intelligence/explain';
import { runWhatIf, type WhatIfResult } from '../../domain/intelligence/whatIf';
import { buildRoadStory, type StoryEntry } from '../../domain/intelligence/roadStory';

export type GatewayMode = 'SERVER' | 'OFFLINE_DEMO';

export type ReportView =
  | { audience: 'STAFF'; case: ReportCase; availableActions: WorkflowAction[]; canEdit: boolean; isMine?: boolean }
  | { audience: 'PUBLIC'; case: PublicReportView; availableActions: WorkflowAction[]; canEdit: boolean; isMine?: boolean };

export interface EngineerSummary {
  id: string;
  name: string;
  title: string;
  agencyCode: string;
}

export class WorkflowApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = 'WorkflowApiError';
  }
}

/** The account the UI is acting as; `null` means an anonymous visitor. */
export interface SessionAccount {
  id: string;
  role: UserRole;
}

export interface WorkflowGateway {
  readonly mode: GatewayMode;
  /** Start (or reuse) a server session for this account; anonymous when null. Returns the server actor. */
  useAccount(account: SessionAccount | null): Promise<Actor>;
  listReports(): Promise<ReportView[]>;
  getReport(id: string): Promise<ReportView>;
  submit(draft: ReportDraft): Promise<{ view: ReportView; claimToken: string | null }>;
  transition(id: string, command: WorkflowCommand, expectedVersion: number): Promise<ReportView>;
  editContent(id: string, patch: Partial<DamageReport>, expectedVersion: number): Promise<ReportView>;
  audit(entityId?: string): Promise<AuditEvent[]>;
  engineers(): Promise<EngineerSummary[]>;
  assessment(segmentId: string): Promise<{ assessment: EngineeringAssessment; explanation: StructuredExplanation }>;
  story(segmentId: string): Promise<{ audience: 'STAFF' | 'PUBLIC'; story: StoryEntry[]; note: string }>;
  simulate(segmentId: string, scenario: Partial<AssessmentInputs>): Promise<WhatIfResult>;
}

/** Display report for any view (staff or public). */
export function displayReport(view: ReportView): DamageReport {
  const c = view.case as ReportCase | PublicReportView;
  return c.report;
}

/** Intelligence endpoints (server/routes/intelligence.routes.ts). */
export const INTELLIGENCE_PATHS = {
  assessment: '/api/road-segments/:id/assessment',
  simulations: '/api/simulations'
} as const;

const TOKEN_KEY = 'pavement-pinn.workflow-session';
const CLAIMS_KEY = 'pavement-pinn.report-claims';

function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the session lives in memory only.
  }
}

/** Claim tokens of reports this browser tab submitted anonymously (shown once by the server). */
export function rememberClaim(reportId: string, claimToken: string): void {
  const claims = JSON.parse(readStorage(CLAIMS_KEY) || '{}') as Record<string, string>;
  claims[reportId] = claimToken;
  writeStorage(CLAIMS_KEY, JSON.stringify(claims));
}

export function claimFor(reportId: string): string | null {
  try {
    return (JSON.parse(readStorage(CLAIMS_KEY) || '{}') as Record<string, string>)[reportId] ?? null;
  } catch {
    return null;
  }
}

function pathFor(template: string, id: string): string {
  return template.replace(':id', encodeURIComponent(id));
}

export class HttpWorkflowGateway implements WorkflowGateway {
  readonly mode: GatewayMode = 'SERVER';
  private token: string | null = null;
  private actor: Actor | null = null;
  private sessionKey: string | null = null;

  private async request<T>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let res: Response;
    try {
      res = await fetch(apiUrl(path), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new WorkflowApiError('NETWORK', 'Server tidak dapat dihubungi. Perubahan tidak tersimpan.', 0);
    }
    const json = (await res.json().catch(() => null)) as { success?: boolean; error?: { code: string; message: string } } | null;
    if (!res.ok || !json || json.success === false) {
      throw new WorkflowApiError(json?.error?.code ?? 'HTTP_ERROR', json?.error?.message ?? `HTTP ${res.status}`, res.status);
    }
    return json as T;
  }

  async useAccount(account: SessionAccount | null): Promise<Actor> {
    const key = account ? `demo:${account.id}` : 'anonymous';
    if (this.token && this.sessionKey === key && this.actor) return this.actor;
    // Reuse this tab's stored session for the same identity when it is still valid.
    const stored = readStorage(TOKEN_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { key: string; token: string };
        if (parsed.key === key) {
          this.token = parsed.token;
          const me = await this.request<{ actor: Actor }>('GET', WORKFLOW_API_PATHS.me);
          this.actor = me.actor;
          this.sessionKey = key;
          return me.actor;
        }
      } catch {
        // Expired or malformed: start a new session below.
      }
    }
    this.token = null;
    const res = account
      ? await this.request<{ token: string; actor: Actor }>('POST', WORKFLOW_API_PATHS.demoSession, { accountId: account.id })
      : await this.request<{ token: string; actor: Actor }>('POST', WORKFLOW_API_PATHS.anonymousSession);
    this.token = res.token;
    this.actor = res.actor;
    this.sessionKey = key;
    writeStorage(TOKEN_KEY, JSON.stringify({ key, token: res.token }));
    return res.actor;
  }

  async listReports(): Promise<ReportView[]> {
    const res = await this.request<{ items: ReportView[] }>('GET', `${WORKFLOW_API_PATHS.reports}?limit=200`);
    return res.items;
  }

  async getReport(id: string): Promise<ReportView> {
    const claim = claimFor(id);
    const res = await this.request<{ report: ReportView }>('GET', pathFor(WORKFLOW_API_PATHS.report, id), undefined, claim ? { 'x-claim-token': claim } : {});
    return res.report;
  }

  async submit(draft: ReportDraft): Promise<{ view: ReportView; claimToken: string | null }> {
    const res = await this.request<{ report: ReportView; claimToken?: string }>('POST', WORKFLOW_API_PATHS.reports, { report: draft });
    if (res.claimToken) rememberClaim(res.report.case.id, res.claimToken);
    return { view: res.report, claimToken: res.claimToken ?? null };
  }

  async transition(id: string, command: WorkflowCommand, expectedVersion: number): Promise<ReportView> {
    return (await this.request<{ report: ReportView }>('POST', pathFor(WORKFLOW_API_PATHS.transitions, id), { command, expectedVersion })).report;
  }

  async editContent(id: string, patch: Partial<DamageReport>, expectedVersion: number): Promise<ReportView> {
    return (await this.request<{ report: ReportView }>('PATCH', pathFor(WORKFLOW_API_PATHS.content, id), { patch, expectedVersion })).report;
  }

  async audit(entityId?: string): Promise<AuditEvent[]> {
    const q = entityId ? `?entityId=${encodeURIComponent(entityId)}&limit=200` : '?limit=200';
    return (await this.request<{ items: AuditEvent[] }>('GET', `${WORKFLOW_API_PATHS.audit}${q}`)).items;
  }

  async engineers(): Promise<EngineerSummary[]> {
    return (await this.request<{ items: EngineerSummary[] }>('GET', WORKFLOW_API_PATHS.engineers)).items;
  }

  async assessment(segmentId: string) {
    return this.request<{ assessment: EngineeringAssessment; explanation: StructuredExplanation }>('GET', pathFor(INTELLIGENCE_PATHS.assessment, segmentId));
  }

  async story(segmentId: string) {
    return this.request<{ audience: 'STAFF' | 'PUBLIC'; story: StoryEntry[]; note: string }>('GET', pathFor(WORKFLOW_API_PATHS.roadStory, segmentId));
  }

  async simulate(segmentId: string, scenario: Partial<AssessmentInputs>): Promise<WhatIfResult> {
    return (await this.request<{ result: WhatIfResult }>('POST', INTELLIGENCE_PATHS.simulations, { segmentId, scenario })).result;
  }
}

/**
 * In-browser fallback for the static demo host. Same domain rules, memory only, actor
 * chosen locally (there is no server to sign anything) — labelled OFFLINE_DEMO in the UI.
 */
export class OfflineWorkflowGateway implements WorkflowGateway {
  readonly mode: GatewayMode = 'OFFLINE_DEMO';
  private actor: Actor = { id: 'anon-offline', role: 'PUBLIC_VIEWER', kind: 'ANONYMOUS' };
  private readonly service: WorkflowService;
  private readonly ready: Promise<number>;
  private seq = 0;

  constructor(
    seedReports: DamageReport[],
    private readonly roleOf: (id: string) => UserRole | null,
    private readonly engineerList: EngineerSummary[],
    private readonly segments: RoadSegment[]
  ) {
    this.service = new WorkflowService(new MemoryCaseStore(), {
      now: () => new Date().toISOString(),
      newId: (prefix) => `${prefix}-L${(++this.seq).toString(36).toUpperCase()}`,
      roleOf,
      cv: DEMO_CV_PROVIDER
    });
    this.ready = this.service.ensureSeeded(seedReports);
  }

  private view(c: ReportCase): ReportView {
    const canEdit = canEditReport(this.actor, c.report);
    if (this.actor.role !== 'SYSTEM' && isOfficialRole(this.actor.role)) {
      return { audience: 'STAFF', case: c, availableActions: availableActions(c, this.actor), canEdit };
    }
    return { audience: 'PUBLIC', case: toPublicView(c), availableActions: [], canEdit, isMine: c.createdBy.id === this.actor.id };
  }

  private unwrap(result: ServiceResult<ReportCase>): ReportView {
    if (result.ok === false) {
      const f = result as Extract<ServiceResult<ReportCase>, { ok: false }>;
      throw new WorkflowApiError(f.code, f.message, 0);
    }
    return this.view(result.value);
  }

  async useAccount(account: SessionAccount | null): Promise<Actor> {
    this.actor = account ? { id: account.id, role: account.role, kind: 'DEMO_ACCOUNT' } : { id: 'anon-offline', role: 'PUBLIC_VIEWER', kind: 'ANONYMOUS' };
    return this.actor;
  }

  async listReports(): Promise<ReportView[]> {
    await this.ready;
    return (await this.service.listCases()).map((c) => this.view(c));
  }

  async getReport(id: string): Promise<ReportView> {
    await this.ready;
    const c = await this.service.getCase(id);
    if (!c) throw new WorkflowApiError('NOT_FOUND', 'Report not found.', 404);
    return this.view(c);
  }

  async submit(draft: ReportDraft): Promise<{ view: ReportView; claimToken: string | null }> {
    await this.ready;
    return { view: this.unwrap(await this.service.submitReport(draft, this.actor, null)), claimToken: null };
  }

  async transition(id: string, command: WorkflowCommand, expectedVersion: number): Promise<ReportView> {
    await this.ready;
    return this.unwrap(await this.service.transition(id, command, this.actor, expectedVersion));
  }

  async editContent(id: string, patch: Partial<DamageReport>, expectedVersion: number): Promise<ReportView> {
    await this.ready;
    return this.unwrap(await this.service.editContent(id, patch, this.actor, expectedVersion));
  }

  async audit(entityId?: string): Promise<AuditEvent[]> {
    if (this.actor.role === 'SYSTEM' || !isOfficialRole(this.actor.role)) {
      throw new WorkflowApiError('FORBIDDEN', 'The audit trail is limited to official roles.', 403);
    }
    return (await this.service.listAudit({ entityId, limit: 200, offset: 0 })).items;
  }

  async engineers(): Promise<EngineerSummary[]> {
    return this.engineerList;
  }

  private segment(id: string): RoadSegment {
    const s = this.segments.find((x) => x.id === id);
    if (!s) throw new WorkflowApiError('NOT_FOUND', 'Unknown road segment.', 404);
    return s;
  }

  async assessment(segmentId: string) {
    await this.ready;
    const cases = await this.service.listCases();
    const assessment = assessSegment(this.segment(segmentId), { now: new Date().toISOString(), cases });
    return { assessment, explanation: explainAssessment(assessment, cases) };
  }

  async story(segmentId: string) {
    await this.ready;
    const cases = await this.service.listCases();
    const audience = this.actor.role !== 'SYSTEM' && isOfficialRole(this.actor.role) ? ('STAFF' as const) : ('PUBLIC' as const);
    const assessment = assessSegment(this.segment(segmentId), { now: new Date().toISOString(), cases });
    const sims = (await this.service.listSimulations(segmentId)).map((s) => ({ at: s.at, summary: s.summary }));
    return { audience, story: buildRoadStory(segmentId, cases, [assessment], sims, audience), note: 'Offline demo: history exists only in this browser tab.' };
  }

  async simulate(segmentId: string, scenario: Partial<AssessmentInputs>): Promise<WhatIfResult> {
    await this.ready;
    // Same rules as POST /api/simulations: engineers only, inputs inside the validated range.
    if (this.actor.role !== 'FIELD_ENGINEER') throw new WorkflowApiError('FORBIDDEN', 'What-If simulation is limited to field engineers.', 403);
    for (const [key, value] of Object.entries(scenario) as Array<[keyof typeof ENGINE_INPUT_RANGES, number]>) {
      const range = ENGINE_INPUT_RANGES[key];
      if (range && (value < range[0] || value > range[1])) {
        throw new WorkflowApiError('OUTSIDE_VALIDATED_RANGE', `Outside validated range: ${key} must be ${range[0]}–${range[1]}.`, 422);
      }
    }
    const result = runWhatIf(this.segment(segmentId), scenario, { now: new Date().toISOString(), cases: await this.service.listCases() });
    await this.service.recordSimulation({ segmentId, requestedBy: this.actor, summary: result.explanation, result });
    return result;
  }
}

export function createWorkflowGateway(
  seedReports: DamageReport[],
  roleOf: (id: string) => UserRole | null,
  engineers: EngineerSummary[],
  segments: RoadSegment[]
): WorkflowGateway {
  return isStaticHost() ? new OfflineWorkflowGateway(seedReports, roleOf, engineers, segments) : new HttpWorkflowGateway();
}
