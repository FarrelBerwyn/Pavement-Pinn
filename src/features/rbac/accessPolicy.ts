/**
 * RBAC policy for the UI — which screens and buttons a demo identity sees.
 *
 * SECURITY SCOPE: these checks only shape the interface. The workflow API enforces the
 * same rules on the server (server/services/workflowService.ts, src/domain/), and that
 * is where report transitions, content edits and audit access are actually decided.
 * Identities are still demo identities: see docs/architecture/RBAC_MATRIX.md.
 */
import type { UserRole } from '../../types';
import {
  ALL_ROLES,
  canEditReport,
  EDITABLE_REPORT_STATUSES,
  EDITABLE_WORKFLOW_STATES,
  isOfficialRole,
  isPublicRole,
  OFFICIAL_ROLES,
  OWN_REPORT_EDITOR_ROLES,
  PUBLIC_ROLES
} from '../../domain/access';

export {
  canEditReport,
  EDITABLE_REPORT_STATUSES,
  EDITABLE_WORKFLOW_STATES,
  isOfficialRole,
  isPublicRole,
  OFFICIAL_ROLES,
  OWN_REPORT_EDITOR_ROLES,
  PUBLIC_ROLES
};

/**
 * - `ALLOW`          the role may open the resource;
 * - `LOGIN_REQUIRED` a public (not-logged-in-as-official) identity hit a protected resource;
 * - `FORBIDDEN`      an official identity lacks the required role.
 */
export type AccessDecision = 'ALLOW' | 'LOGIN_REQUIRED' | 'FORBIDDEN';

export function evaluateAccess(allowedRoles: readonly UserRole[], role: UserRole): AccessDecision {
  if (allowedRoles.includes(role)) return 'ALLOW';
  return isPublicRole(role) ? 'LOGIN_REQUIRED' : 'FORBIDDEN';
}

/**
 * Role-to-action matrix. Each entry names where it is enforced so the matrix can be
 * audited against the source.
 */
export type ActionId =
  | 'VIEW_PUBLIC_ROAD_HEALTH'
  | 'CREATE_DAMAGE_REPORT'
  | 'EDIT_OWN_DAMAGE_REPORT'
  | 'UPVOTE_DAMAGE_REPORT'
  | 'RUN_PINN_SIMULATION'
  | 'EXPORT_SIMULATION_PDF'
  | 'USE_FWD_OVERLAY_TOOLS'
  | 'VERIFY_DAMAGE_REPORT'
  | 'MANAGE_WORK_ORDERS'
  | 'VIEW_PCI_TREND_HISTORY'
  | 'MONITOR_WIM_OPERATIONS'
  | 'ISSUE_ODOL_ENFORCEMENT'
  | 'VIEW_POLICY_ANALYSIS'
  | 'TRIAGE_REPORTS'
  | 'APPROVE_MAINTENANCE'
  | 'VIEW_AUDIT_TRAIL';

export interface ActionRule {
  roles: readonly UserRole[];
  gate: string;
}

const EVERYONE: readonly UserRole[] = ALL_ROLES;

export const ACTION_RULES: Readonly<Record<ActionId, ActionRule>> = {
  VIEW_PUBLIC_ROAD_HEALTH: { roles: EVERYONE, gate: 'route /dashboard/ (public)' },
  CREATE_DAMAGE_REPORT: { roles: EVERYONE, gate: 'POST /api/workflow/reports accepts any session, including anonymous' },
  EDIT_OWN_DAMAGE_REPORT: {
    roles: OWN_REPORT_EDITOR_ROLES,
    gate: 'canEditReport (src/domain/access.ts): UI buttons and PATCH /api/workflow/reports/:id/content'
  },
  UPVOTE_DAMAGE_REPORT: { roles: EVERYONE, gate: 'no role check on the upvote handlers' },
  RUN_PINN_SIMULATION: { roles: EVERYONE, gate: 'route /engine/simulation/ (public; public sidebar already exposed it)' },
  EXPORT_SIMULATION_PDF: { roles: EVERYONE, gate: 'SimulationPanel PDF button; no role check' },
  USE_FWD_OVERLAY_TOOLS: { roles: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'], gate: 'route /engine/fwd/' },
  VERIFY_DAMAGE_REPORT: { roles: ['FIELD_ENGINEER'], gate: 'workflow SUBMIT_INSPECTION (assigned engineer only), enforced by the API' },
  MANAGE_WORK_ORDERS: { roles: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'], gate: 'routes /engineering/tasks/ and /operations/tasks/' },
  VIEW_PCI_TREND_HISTORY: { roles: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'], gate: 'route /engine/prediction/' },
  MONITOR_WIM_OPERATIONS: { roles: ['OPERATIONS_MANAGER'], gate: 'routes /operations/**' },
  ISSUE_ODOL_ENFORCEMENT: { roles: ['OPERATIONS_MANAGER'], gate: 'OperationsManagerAppView (routes /operations/monitoring/**)' },
  VIEW_POLICY_ANALYSIS: { roles: ['POLICY_MAKER'], gate: 'route /policy/' },
  TRIAGE_REPORTS: { roles: ['OPERATIONS_MANAGER'], gate: 'workflow REVIEW_ACCEPT / CLOSE_INVALID / REQUEST_INSPECTION, enforced by the API' },
  APPROVE_MAINTENANCE: { roles: ['OPERATIONS_MANAGER'], gate: 'workflow APPROVE_ACTION / REJECT_ACTION / START_WORK, enforced by the API (recommender cannot approve)' },
  VIEW_AUDIT_TRAIL: { roles: OFFICIAL_ROLES, gate: 'GET /api/workflow/audit requires an official session; UI entry points hidden for public roles' }
};

export function can(role: UserRole, action: ActionId): boolean {
  return ACTION_RULES[action].roles.includes(role);
}
