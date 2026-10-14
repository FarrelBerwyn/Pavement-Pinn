/**
 * The one legal report workflow. Every role changes a report case only through
 * `applyCommand`, which checks the transition table, the actor's role and assignment,
 * the payload and the expected version, and returns the next case plus the audit record.
 * It never mutates its input, so a failed persistence step leaves the stored case intact.
 *
 * Decisions (docs/DECISION_LOG.md, D-010..D-014):
 * - AI screening and human verification are separate. The SYSTEM may only move a report
 *   to VERIFIED when a real trained model ran with sufficient confidence; the demo
 *   classifier and an unavailable model always route to NEEDS_REVIEW.
 * - Human verification of damage is the Field Engineer's inspection (INSPECTED).
 * - Separation of duties: the Operations Manager approves; the engineer who recommended
 *   an action cannot approve it. The Policy Maker has no workflow transitions.
 * - The work order is an internal record, explicitly not an official SPK document.
 */
import type { UserRole } from '../../types';
import {
  Actor,
  ApprovalRecord,
  InspectionRecord,
  ReportCase,
  ScreeningResult,
  TransitionRecord,
  WorkflowAction,
  WorkflowState
} from './model';

export const SCREENING_CONFIDENCE_THRESHOLD = 0.6;
const MAX_TEXT = 1000;

type ActorRole = UserRole | 'SYSTEM';

interface TransitionRule {
  from: readonly (WorkflowState | null)[];
  to: WorkflowState | 'SAME';
  roles: readonly ActorRole[];
  /** Human decisions must carry a reason. */
  reasonRequired: boolean;
  publicNote: string;
}

const CITIZEN_OR_STAFF: readonly ActorRole[] = ['PUBLIC_REPORTER', 'PUBLIC_VIEWER', 'FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER'];

export const TRANSITIONS: Readonly<Record<WorkflowAction, TransitionRule>> = {
  SUBMIT: { from: [null], to: 'SUBMITTED', roles: CITIZEN_OR_STAFF, reasonRequired: false, publicNote: 'Laporan diterima' },
  BEGIN_SCREENING: { from: ['SUBMITTED'], to: 'AI_SCREENING', roles: ['SYSTEM'], reasonRequired: false, publicNote: 'Penyaringan otomatis dimulai' },
  SCREENING_PASSED: { from: ['AI_SCREENING'], to: 'VERIFIED', roles: ['SYSTEM'], reasonRequired: false, publicNote: 'Lolos penyaringan otomatis, menunggu tindak lanjut' },
  SCREENING_NEEDS_REVIEW: { from: ['AI_SCREENING'], to: 'NEEDS_REVIEW', roles: ['SYSTEM'], reasonRequired: false, publicNote: 'Menunggu peninjauan petugas' },
  REVIEW_ACCEPT: { from: ['NEEDS_REVIEW'], to: 'VERIFIED', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Laporan diterima petugas untuk ditindaklanjuti' },
  CLOSE_INVALID: { from: ['NEEDS_REVIEW', 'VERIFIED'], to: 'CLOSED', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Laporan ditutup: tidak dapat ditindaklanjuti' },
  REQUEST_INSPECTION: { from: ['VERIFIED'], to: 'FIELD_INSPECTION_REQUESTED', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Inspeksi lapangan dijadwalkan' },
  SUBMIT_INSPECTION: { from: ['FIELD_INSPECTION_REQUESTED'], to: 'INSPECTED', roles: ['FIELD_ENGINEER'], reasonRequired: false, publicNote: 'Inspeksi lapangan selesai' },
  RECOMMEND_ACTION: { from: ['INSPECTED'], to: 'ACTION_RECOMMENDED', roles: ['FIELD_ENGINEER'], reasonRequired: false, publicNote: 'Rekomendasi penanganan disusun' },
  CLOSE_NO_ACTION: { from: ['INSPECTED'], to: 'CLOSED', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Ditutup: tidak memerlukan penanganan' },
  APPROVE_ACTION: { from: ['ACTION_RECOMMENDED'], to: 'ACTION_APPROVED', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Penanganan disetujui' },
  REJECT_ACTION: { from: ['ACTION_RECOMMENDED'], to: 'INSPECTED', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Rekomendasi dikaji ulang' },
  START_WORK: { from: ['ACTION_APPROVED'], to: 'IN_PROGRESS', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Pekerjaan perbaikan dimulai' },
  COMPLETE_WORK_ORDER: { from: ['IN_PROGRESS'], to: 'SAME', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Pekerjaan lapangan selesai, menunggu verifikasi' },
  RESOLVE: { from: ['IN_PROGRESS'], to: 'RESOLVED', roles: ['FIELD_ENGINEER'], reasonRequired: true, publicNote: 'Perbaikan terverifikasi di lapangan' },
  CLOSE_RESOLVED: { from: ['RESOLVED'], to: 'CLOSED', roles: ['OPERATIONS_MANAGER'], reasonRequired: true, publicNote: 'Laporan ditutup' },
  SEED_IMPORT: { from: [null], to: 'SAME', roles: [], reasonRequired: false, publicNote: 'Data contoh (DEMO) dimuat ke sistem' }
};

export type WorkflowCommand =
  | { action: 'BEGIN_SCREENING' }
  | { action: 'SCREENING_PASSED' | 'SCREENING_NEEDS_REVIEW'; screening: ScreeningResult }
  | { action: 'REVIEW_ACCEPT' | 'CLOSE_INVALID' | 'CLOSE_NO_ACTION' | 'APPROVE_ACTION' | 'REJECT_ACTION' | 'COMPLETE_WORK_ORDER' | 'RESOLVE' | 'CLOSE_RESOLVED'; reason: string }
  | { action: 'REQUEST_INSPECTION'; reason: string; engineerId: string; dueAt: string; instructions: string }
  | {
      action: 'SUBMIT_INSPECTION';
      verdict: InspectionRecord['verdict'];
      cvReview: InspectionRecord['cvReview'];
      measuredDepthCm: number | null;
      measuredAreaM2: number | null;
      severity: InspectionRecord['severity'];
      notes: string;
    }
  | { action: 'RECOMMEND_ACTION'; treatment: string; urgency: 'ROUTINE' | 'PRIORITY' | 'URGENT'; rationale: string; assessmentId: string | null }
  | { action: 'START_WORK'; reason: string; contractorNote: string };

export interface CommandContext {
  actor: Actor;
  /** ISO timestamp supplied by the caller (the server clock). */
  now: string;
  newId: (prefix: string) => string;
  /** Version the client last saw; a mismatch is a concurrent change and is rejected. */
  expectedVersion: number;
  /** Role lookup for ids referenced in a command (e.g. the engineer being assigned). */
  roleOf: (accountId: string) => UserRole | null;
}

export type WorkflowErrorCode = 'INVALID_TRANSITION' | 'FORBIDDEN' | 'VERSION_CONFLICT' | 'VALIDATION';
export type CommandResult =
  | { ok: true; next: ReportCase; record: TransitionRecord }
  | { ok: false; code: WorkflowErrorCode; message: string };

export type CommandFailure = Extract<CommandResult, { ok: false }>;
/** Type guard (the project compiles without strictNullChecks, so `!r.ok` does not narrow). */
export const isFailure = (r: CommandResult): r is CommandFailure => r.ok === false;

const fail = (code: WorkflowErrorCode, message: string): CommandResult => ({ ok: false, code, message });

function cleanText(value: unknown, field: string, required: boolean): string | CommandResult {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') return fail('VALIDATION', `${field} must be text.`);
  const text = value.trim();
  if (required && text === '') return fail('VALIDATION', `${field} is required.`);
  if (text.length > MAX_TEXT) return fail('VALIDATION', `${field} is longer than ${MAX_TEXT} characters.`);
  return text;
}

const isResult = (v: unknown): v is CommandResult => typeof v === 'object' && v !== null && 'ok' in v;

function optionalMeasure(value: unknown, field: string): number | null | CommandResult {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10000) {
    return fail('VALIDATION', `${field} must be a non-negative number.`);
  }
  return value;
}

/** Which actions this actor could take on this case right now (drives the UI buttons). */
export function availableActions(c: ReportCase, actor: Actor): WorkflowAction[] {
  return (Object.keys(TRANSITIONS) as WorkflowAction[]).filter((action) => {
    if (action === 'SUBMIT' || action === 'SEED_IMPORT') return false;
    const rule = TRANSITIONS[action];
    if (!rule.from.includes(c.state) || !rule.roles.includes(actor.role)) return false;
    return assignmentGuard(action, c, actor) === null;
  });
}

/** Rules that depend on who is assigned/recommended, beyond the role check. */
function assignmentGuard(action: WorkflowAction, c: ReportCase, actor: Actor): string | null {
  switch (action) {
    case 'SUBMIT_INSPECTION':
    case 'RECOMMEND_ACTION':
      if (!c.assignment || c.assignment.engineerId !== actor.id) return 'Only the assigned field engineer may do this.';
      if (action === 'RECOMMEND_ACTION' && c.inspection?.verdict !== 'CONFIRMED') return 'An action can only be recommended after damage is confirmed.';
      return null;
    case 'APPROVE_ACTION':
      if (c.recommendation && c.recommendation.recommendedBy === actor.id) return 'The person who recommended an action cannot approve it.';
      return null;
    case 'RESOLVE':
      if (!c.workOrder || c.workOrder.status !== 'COMPLETED') return 'The work order must be completed before the repair is verified.';
      return null;
    case 'COMPLETE_WORK_ORDER':
      if (!c.workOrder || c.workOrder.status === 'COMPLETED') return 'There is no open work order.';
      return null;
    default:
      return null;
  }
}

export function applyCommand(c: ReportCase, command: WorkflowCommand, ctx: CommandContext): CommandResult {
  const rule = TRANSITIONS[command.action as WorkflowAction];
  if (!rule || command.action === ('SUBMIT' as string) || command.action === ('SEED_IMPORT' as string)) {
    return fail('INVALID_TRANSITION', 'Unknown workflow action.');
  }
  if (!ctx.actor || !ctx.actor.id) return fail('FORBIDDEN', 'No actor.');
  if (ctx.expectedVersion !== c.version) {
    return fail('VERSION_CONFLICT', `The report changed since it was loaded (version ${c.version}, expected ${ctx.expectedVersion}). Reload and try again.`);
  }
  if (!rule.from.includes(c.state)) {
    return fail('INVALID_TRANSITION', `${command.action} is not allowed from ${c.state}.`);
  }
  if (!rule.roles.includes(ctx.actor.role)) return fail('FORBIDDEN', `${ctx.actor.role} may not ${command.action}.`);
  const guard = assignmentGuard(command.action, c, ctx.actor);
  if (guard) return fail('FORBIDDEN', guard);

  const reasonInput = 'reason' in command ? command.reason : '';
  const reason = cleanText(reasonInput, 'reason', rule.reasonRequired);
  if (isResult(reason)) return reason;

  const next: ReportCase = {
    ...c,
    approvals: [...c.approvals],
    history: [...c.history]
  };
  let autoReason = '';

  switch (command.action) {
    case 'BEGIN_SCREENING':
      autoReason = 'Automated screening started.';
      break;
    case 'SCREENING_PASSED':
    case 'SCREENING_NEEDS_REVIEW': {
      const s = command.screening;
      if (!s || !['REAL', 'DEMO', 'MODEL_UNAVAILABLE'].includes(s.modelStatus)) return fail('VALIDATION', 'Screening result is missing.');
      if (command.action === 'SCREENING_PASSED') {
        const confident = s.modelStatus === 'REAL' && typeof s.confidence === 'number' && s.confidence >= SCREENING_CONFIDENCE_THRESHOLD && s.passed;
        if (!confident) return fail('VALIDATION', 'Only a real model result with sufficient confidence can pass screening automatically.');
      }
      next.screening = { ...s, reasons: [...s.reasons] };
      autoReason = s.reasons.join(' ') || command.action;
      break;
    }
    case 'REQUEST_INSPECTION': {
      if (ctx.roleOf(command.engineerId) !== 'FIELD_ENGINEER') return fail('VALIDATION', 'The assignee must be a field engineer account.');
      if (Number.isNaN(Date.parse(command.dueAt)) || Date.parse(command.dueAt) <= Date.parse(ctx.now)) {
        return fail('VALIDATION', 'The inspection deadline must be a future date.');
      }
      const instructions = cleanText(command.instructions, 'instructions', false);
      if (isResult(instructions)) return instructions;
      next.assignment = {
        id: ctx.newId('ASG'),
        engineerId: command.engineerId,
        assignedBy: ctx.actor.id,
        assignedAt: ctx.now,
        dueAt: new Date(command.dueAt).toISOString(),
        instructions
      };
      break;
    }
    case 'SUBMIT_INSPECTION': {
      if (!['CONFIRMED', 'NOT_CONFIRMED'].includes(command.verdict)) return fail('VALIDATION', 'verdict must be CONFIRMED or NOT_CONFIRMED.');
      if (!['LIGHT', 'MODERATE', 'SEVERE', 'CRITICAL'].includes(command.severity)) return fail('VALIDATION', 'severity is invalid.');
      const depth = optionalMeasure(command.measuredDepthCm, 'measuredDepthCm');
      if (isResult(depth)) return depth;
      const area = optionalMeasure(command.measuredAreaM2, 'measuredAreaM2');
      if (isResult(area)) return area;
      const notes = cleanText(command.notes, 'notes', true);
      if (isResult(notes)) return notes;
      const review = command.cvReview ?? { accepted: true, correctedClass: null };
      const corrected = review.accepted ? null : cleanText(review.correctedClass, 'correctedClass', true);
      if (isResult(corrected)) return corrected;
      next.inspection = {
        id: ctx.newId('INS'),
        engineerId: ctx.actor.id,
        inspectedAt: ctx.now,
        verdict: command.verdict,
        cvReview: { accepted: !!review.accepted, correctedClass: corrected },
        measuredDepthCm: depth,
        measuredAreaM2: area,
        severity: command.severity,
        notes,
        dataStatus: 'OBSERVED'
      };
      autoReason = `Inspection ${command.verdict}.`;
      break;
    }
    case 'RECOMMEND_ACTION': {
      const treatment = cleanText(command.treatment, 'treatment', true);
      if (isResult(treatment)) return treatment;
      const rationale = cleanText(command.rationale, 'rationale', true);
      if (isResult(rationale)) return rationale;
      if (!['ROUTINE', 'PRIORITY', 'URGENT'].includes(command.urgency)) return fail('VALIDATION', 'urgency is invalid.');
      next.recommendation = {
        id: ctx.newId('REC'),
        recommendedBy: ctx.actor.id,
        recommendedAt: ctx.now,
        treatment,
        urgency: command.urgency,
        rationale,
        assessmentId: typeof command.assessmentId === 'string' ? command.assessmentId : null
      };
      autoReason = `Recommended: ${treatment}.`;
      break;
    }
    case 'APPROVE_ACTION':
    case 'REJECT_ACTION': {
      const approval: ApprovalRecord = {
        id: ctx.newId('APR'),
        decidedBy: ctx.actor.id,
        decidedAt: ctx.now,
        decision: command.action === 'APPROVE_ACTION' ? 'APPROVED' : 'REJECTED',
        reason: reason as string
      };
      next.approvals.push(approval);
      if (command.action === 'REJECT_ACTION') next.recommendation = null;
      break;
    }
    case 'START_WORK': {
      const contractorNote = cleanText(command.contractorNote, 'contractorNote', false);
      if (isResult(contractorNote)) return contractorNote;
      next.workOrder = {
        id: ctx.newId('WO'),
        issuedBy: ctx.actor.id,
        issuedAt: ctx.now,
        status: 'ISSUED',
        contractorNote,
        completedAt: null,
        isOfficialDocument: false
      };
      break;
    }
    case 'COMPLETE_WORK_ORDER':
      next.workOrder = { ...c.workOrder!, status: 'COMPLETED', completedAt: ctx.now };
      break;
    default:
      break;
  }

  const to = rule.to === 'SAME' ? c.state : rule.to;
  const record: TransitionRecord = {
    id: ctx.newId('TRN'),
    at: ctx.now,
    action: command.action,
    from: c.state,
    to,
    actor: { ...ctx.actor },
    reason: (reason as string) || autoReason,
    publicNote: rule.publicNote
  };
  next.state = to;
  next.version = c.version + 1;
  next.updatedAt = ctx.now;
  next.history.push(record);
  return { ok: true, next, record };
}

/** Build a new case from a validated citizen report (the SUBMIT transition). */
export function createReportCase(
  report: ReportCase['report'],
  actor: Actor,
  ctx: { now: string; newId: (prefix: string) => string; claimTokenHash?: string | null; dataStatus?: ReportCase['dataStatus'] }
): { next: ReportCase; record: TransitionRecord } {
  const rule = TRANSITIONS.SUBMIT;
  const record: TransitionRecord = {
    id: ctx.newId('TRN'),
    at: ctx.now,
    action: 'SUBMIT',
    from: null,
    to: 'SUBMITTED',
    actor: { ...actor },
    reason: 'Citizen report submitted.',
    publicNote: rule.publicNote
  };
  const next: ReportCase = {
    id: report.id,
    version: 1,
    state: 'SUBMITTED',
    segmentId: report.segmentId,
    report,
    createdBy: { ...actor },
    createdAt: ctx.now,
    updatedAt: ctx.now,
    claimTokenHash: ctx.claimTokenHash ?? null,
    dataStatus: ctx.dataStatus ?? 'USER_GENERATED',
    screening: null,
    assignment: null,
    inspection: null,
    recommendation: null,
    approvals: [],
    workOrder: null,
    history: [record]
  };
  return { next, record };
}
