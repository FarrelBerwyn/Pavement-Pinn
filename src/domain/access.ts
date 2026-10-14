/**
 * Access rules shared by the browser (button visibility) and the server (enforcement).
 * `features/rbac/accessPolicy.ts` re-exports these for the UI.
 */
import type { DamageReport, ReportStatus, UserRole } from '../types';

export const PUBLIC_ROLES: readonly UserRole[] = ['PUBLIC_REPORTER', 'PUBLIC_VIEWER'];
export const OFFICIAL_ROLES: readonly UserRole[] = ['FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER'];
export const ALL_ROLES: readonly UserRole[] = [...OFFICIAL_ROLES, ...PUBLIC_ROLES];

export function isPublicRole(role: UserRole): boolean {
  return PUBLIC_ROLES.includes(role);
}

export function isOfficialRole(role: UserRole): boolean {
  return OFFICIAL_ROLES.includes(role);
}

/** Roles that may edit the content of a report they created themselves. */
export const OWN_REPORT_EDITOR_ROLES: readonly UserRole[] = ['PUBLIC_REPORTER'];

/** Display statuses in which the creator may still edit a report's content. */
export const EDITABLE_REPORT_STATUSES: readonly ReportStatus[] = ['PENDING'];

/**
 * Workflow states in which content is still editable: before any person has acted on
 * the report. Once Operations reviewed it or an inspection was requested, the citizen's
 * content is frozen so staff decisions are not made on shifting evidence.
 */
export const EDITABLE_WORKFLOW_STATES: readonly string[] = ['SUBMITTED', 'AI_SCREENING', 'NEEDS_REVIEW'];

/**
 * May this account edit the CONTENT of this report? Fails closed on anything missing or
 * malformed. Only a report created in this session, by this account id, in an editable
 * state, by a role allowed to edit its own reports. Bundled demo reports have no creator
 * account and are never editable.
 *
 * Content editing only: Field Engineer verification is a separate workflow action and
 * is not decided here.
 */
export function canEditReport(
  account: { id?: unknown; role?: unknown } | null | undefined,
  report: Pick<DamageReport, 'origin' | 'creatorAccountId' | 'creatorRole' | 'status' | 'workflowState'> | null | undefined
): boolean {
  if (!account || !report) return false;
  if (typeof account.id !== 'string' || account.id === '') return false;
  if (!OWN_REPORT_EDITOR_ROLES.includes(account.role as UserRole)) return false;
  if (report.origin !== 'SESSION') return false;
  if (typeof report.creatorAccountId !== 'string' || report.creatorAccountId !== account.id) return false;
  if (report.creatorRole !== account.role) return false;
  if (report.workflowState !== undefined && !EDITABLE_WORKFLOW_STATES.includes(report.workflowState)) return false;
  return EDITABLE_REPORT_STATUSES.includes(report.status);
}
