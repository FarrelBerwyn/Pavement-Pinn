/**
 * Workflow application service: the only way report cases are created, changed and
 * audited. The Express API runs it against a file-backed store (authoritative); the
 * browser runs the same code against a memory store only when no server is reachable
 * (static GitHub Pages demo), and the UI labels that mode.
 *
 * Guarantees
 * - A change is committed to the store before the call resolves; if the store write
 *   fails, the previous state stays (the store only swaps in a fully built snapshot).
 * - Calls are serialized, and each transition carries the version the client saw, so a
 *   concurrent change is rejected (VERSION_CONFLICT) instead of silently overwritten.
 * - Every accepted change appends an audit event (actor, time, entity, action, from, to,
 *   reason).
 */
import type { DamageReport, UserRole } from '../../types';
import { canEditReport } from '../access';
import { createSessionReport, ReportCreationError, ReportDraft } from '../reports/reportFactory';
import { Actor, ReportCase, SYSTEM_ACTOR, TransitionRecord } from './model';
import { CvScreeningProvider, screenReport } from './screening';
import { applyCommand, CommandResult, createReportCase, isFailure, WorkflowCommand, WorkflowErrorCode } from './stateMachine';
import { legacyStatusFor } from './projections';

export interface AuditEvent {
  id: string;
  at: string;
  actor: Actor;
  entityType: 'REPORT_CASE';
  entityId: string;
  action: string;
  from: string | null;
  to: string | null;
  reason: string;
}

export interface WorkflowSnapshot {
  /** Bumped on every commit; lets file stores detect torn writes. */
  revision: number;
  cases: ReportCase[];
  audit: AuditEvent[];
}

export interface CaseStore {
  load(): Promise<WorkflowSnapshot>;
  /** Persist the full next snapshot. Must not change what `load` returns if it throws. */
  commit(next: WorkflowSnapshot): Promise<void>;
}

export class MemoryCaseStore implements CaseStore {
  private snapshot: WorkflowSnapshot = { revision: 0, cases: [], audit: [] };
  /** Test hook: make the next commit fail, to prove failed writes change nothing. */
  failNextCommit = false;

  async load(): Promise<WorkflowSnapshot> {
    return structuredCloneSafe(this.snapshot);
  }

  async commit(next: WorkflowSnapshot): Promise<void> {
    if (this.failNextCommit) {
      this.failNextCommit = false;
      throw new Error('Simulated storage failure');
    }
    this.snapshot = structuredCloneSafe(next);
  }
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface WorkflowDeps {
  now: () => string;
  newId: (prefix: string) => string;
  roleOf: (accountId: string) => UserRole | null;
  cv: CvScreeningProvider;
}

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; code: WorkflowErrorCode | 'NOT_FOUND' | 'STORAGE'; message: string };

const MAX_AUDIT_EVENTS = 5000;

function auditFrom(record: TransitionRecord, entityId: string): AuditEvent {
  return {
    id: `AUD-${record.id}`,
    at: record.at,
    actor: record.actor,
    entityType: 'REPORT_CASE',
    entityId,
    action: record.action,
    from: record.from,
    to: record.to,
    reason: record.reason
  };
}

/** Keep the report's display status in step with the workflow state. */
function syncDisplay(c: ReportCase): ReportCase {
  return { ...c, report: { ...c.report, status: legacyStatusFor(c), workflowState: c.state, caseVersion: c.version } };
}

export class WorkflowService {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly store: CaseStore, private readonly deps: WorkflowDeps) {}

  /** Run `fn` after every earlier call finished, so read-modify-write never interleaves. */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async commit(snapshot: WorkflowSnapshot, changed: ReportCase, events: AuditEvent[]): Promise<ServiceResult<ReportCase>> {
    const others = snapshot.cases.filter((c) => c.id !== changed.id);
    const audit = [...snapshot.audit, ...events].slice(-MAX_AUDIT_EVENTS);
    const next: WorkflowSnapshot = { revision: snapshot.revision + 1, cases: [changed, ...others], audit };
    try {
      await this.store.commit(next);
    } catch (error) {
      return { ok: false, code: 'STORAGE', message: `The change was not saved: ${(error as Error).message}` };
    }
    return { ok: true, value: changed };
  }

  /**
   * Import the bundled demo reports once, when the store is empty. Each gets a single
   * SEED_IMPORT record stating that it is demo data and that earlier history is unknown:
   * no screening, review or repair steps are invented for it.
   */
  ensureSeeded(seedReports: DamageReport[]): Promise<number> {
    return this.serialize(async () => {
      const snapshot = await this.store.load();
      if (snapshot.cases.length > 0 || seedReports.length === 0) return 0;
      const now = this.deps.now();
      const cases = seedReports.map((report): ReportCase => {
        const state = report.status === 'REPAIRED' ? 'RESOLVED' : 'NEEDS_REVIEW';
        const record: TransitionRecord = {
          id: this.deps.newId('TRN'),
          at: now,
          action: 'SEED_IMPORT',
          from: null,
          to: state,
          actor: SYSTEM_ACTOR,
          reason: `Imported from the bundled demo dataset (SYNTHETIC) with display status ${report.status}; earlier history is not available.`,
          publicNote: 'Data contoh (DEMO) dimuat ke sistem'
        };
        return syncDisplay({
          id: report.id,
          version: 1,
          state,
          segmentId: report.segmentId,
          report,
          createdBy: SYSTEM_ACTOR,
          createdAt: now,
          updatedAt: now,
          claimTokenHash: null,
          dataStatus: 'SYNTHETIC',
          screening: null,
          assignment: null,
          inspection: null,
          recommendation: null,
          approvals: [],
          workOrder: null,
          history: [record]
        });
      });
      const audit = cases.map((c) => auditFrom(c.history[0], c.id));
      await this.store.commit({ revision: snapshot.revision + 1, cases, audit: [...snapshot.audit, ...audit] });
      return cases.length;
    });
  }

  async listCases(): Promise<ReportCase[]> {
    return (await this.store.load()).cases;
  }

  async getCase(id: string): Promise<ReportCase | null> {
    return (await this.store.load()).cases.find((c) => c.id === id) ?? null;
  }

  async listAudit(filter: { entityId?: string; limit: number; offset: number }): Promise<{ total: number; items: AuditEvent[] }> {
    const all = (await this.store.load()).audit.filter((e) => !filter.entityId || e.entityId === filter.entityId);
    const newestFirst = [...all].reverse();
    return { total: newestFirst.length, items: newestFirst.slice(filter.offset, filter.offset + filter.limit) };
  }

  /**
   * Accept a citizen report: rebuild it with the factory using the *server's* actor
   * (client-sent ids and creator fields are discarded), then run automated screening.
   * SUBMIT, BEGIN_SCREENING and the screening outcome are committed together.
   */
  submitReport(draft: ReportDraft, actor: Actor, claimTokenHash: string | null): Promise<ServiceResult<ReportCase>> {
    return this.serialize(async () => {
      if (actor.role === 'SYSTEM') return { ok: false, code: 'FORBIDDEN', message: 'The system cannot submit reports.' };
      let report: DamageReport;
      const now = this.deps.now();
      try {
        report = createSessionReport(draft, { id: actor.id, role: actor.role }, new Date(now));
      } catch (error) {
        if (error instanceof ReportCreationError) return { ok: false, code: 'VALIDATION', message: error.message };
        throw error;
      }
      const snapshot = await this.store.load();
      const created = createReportCase(report, actor, { now, newId: this.deps.newId, claimTokenHash, dataStatus: 'USER_GENERATED' });
      const events = [auditFrom(created.record, created.next.id)];

      const begin = applyCommand(created.next, { action: 'BEGIN_SCREENING' }, this.systemCtx(created.next, now));
      if (isFailure(begin)) return { ok: false, code: begin.code, message: begin.message };
      events.push(auditFrom(begin.record, begin.next.id));

      const screening = screenReport(report, now, snapshot.cases, this.deps.cv);
      const outcome = applyCommand(
        begin.next,
        { action: screening.passed ? 'SCREENING_PASSED' : 'SCREENING_NEEDS_REVIEW', screening },
        this.systemCtx(begin.next, now)
      );
      if (isFailure(outcome)) return { ok: false, code: outcome.code, message: outcome.message };
      events.push(auditFrom(outcome.record, outcome.next.id));

      return this.commit(snapshot, syncDisplay(outcome.next), events);
    });
  }

  private systemCtx(c: ReportCase, now: string) {
    return { actor: SYSTEM_ACTOR, now, newId: this.deps.newId, expectedVersion: c.version, roleOf: this.deps.roleOf };
  }

  transition(id: string, command: WorkflowCommand, actor: Actor, expectedVersion: number): Promise<ServiceResult<ReportCase>> {
    return this.serialize(async () => {
      const snapshot = await this.store.load();
      const current = snapshot.cases.find((c) => c.id === id);
      if (!current) return { ok: false, code: 'NOT_FOUND', message: `Report ${id} not found.` };
      const result: CommandResult = applyCommand(current, command, {
        actor,
        now: this.deps.now(),
        newId: this.deps.newId,
        expectedVersion,
        roleOf: this.deps.roleOf
      });
      if (isFailure(result)) return { ok: false, code: result.code, message: result.message };
      return this.commit(snapshot, syncDisplay(result.next), [auditFrom(result.record, id)]);
    });
  }

  /**
   * Citizen content edit (description, depth, area, severity, damage type, photo).
   * Same rule as the UI: canEditReport on the stored report, plus the version check.
   */
  editContent(
    id: string,
    patch: Partial<Pick<DamageReport, 'description' | 'estimatedDepthCm' | 'estimatedAreaM2' | 'severity' | 'damageType' | 'damageTypeLabel' | 'photoUrl'>>,
    actor: Actor,
    expectedVersion: number
  ): Promise<ServiceResult<ReportCase>> {
    return this.serialize(async () => {
      const snapshot = await this.store.load();
      const current = snapshot.cases.find((c) => c.id === id);
      if (!current) return { ok: false, code: 'NOT_FOUND', message: `Report ${id} not found.` };
      if (current.version !== expectedVersion) {
        return { ok: false, code: 'VERSION_CONFLICT', message: 'The report changed since it was loaded. Reload and try again.' };
      }
      if (!canEditReport(actor, current.report)) return { ok: false, code: 'FORBIDDEN', message: 'You may not edit this report.' };

      const allowed = ['description', 'estimatedDepthCm', 'estimatedAreaM2', 'severity', 'damageType', 'damageTypeLabel', 'photoUrl'] as const;
      const updates: Partial<DamageReport> = {};
      for (const key of allowed) {
        if (patch[key] !== undefined) (updates as Record<string, unknown>)[key] = patch[key];
      }
      const nextReport: DamageReport = { ...current.report, ...updates };
      if (typeof nextReport.description !== 'string' || nextReport.description.length > 2000) {
        return { ok: false, code: 'VALIDATION', message: 'description must be text up to 2000 characters.' };
      }
      if (!Number.isFinite(nextReport.estimatedDepthCm) || !Number.isFinite(nextReport.estimatedAreaM2) || nextReport.estimatedDepthCm < 0 || nextReport.estimatedAreaM2 < 0) {
        return { ok: false, code: 'VALIDATION', message: 'depth and area must be non-negative numbers.' };
      }
      if (!['LIGHT', 'MODERATE', 'SEVERE', 'CRITICAL'].includes(nextReport.severity)) {
        return { ok: false, code: 'VALIDATION', message: 'severity is invalid.' };
      }
      const now = this.deps.now();
      const changed: ReportCase = syncDisplay({ ...current, report: nextReport, version: current.version + 1, updatedAt: now });
      const event: AuditEvent = {
        id: `AUD-${this.deps.newId('EDT')}`,
        at: now,
        actor,
        entityType: 'REPORT_CASE',
        entityId: id,
        action: 'CONTENT_EDIT',
        from: current.state,
        to: current.state,
        reason: `Fields changed: ${Object.keys(updates).join(', ') || 'none'}.`
      };
      return this.commit(snapshot, changed, [event]);
    });
  }
}
