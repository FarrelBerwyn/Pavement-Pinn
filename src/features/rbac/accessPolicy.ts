/**
 * RBAC policy — pure functions over the five canonical role identifiers.
 *
 * SECURITY SCOPE: everything here is a FRONTEND convenience (which screens and buttons
 * a demo identity sees). It is not a security boundary: accounts are selected from a
 * demo switcher without credentials, and the backend performs no authorization at all.
 * See docs/architecture/RBAC_MATRIX.md.
 */
import type { UserRole } from '../../types';

export const PUBLIC_ROLES: readonly UserRole[] = ['PUBLIC_REPORTER', 'PUBLIC_VIEWER'];
export const OFFICIAL_ROLES: readonly UserRole[] = ['FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER'];

export function isPublicRole(role: UserRole): boolean {
  return PUBLIC_ROLES.includes(role);
}

export function isOfficialRole(role: UserRole): boolean {
  return OFFICIAL_ROLES.includes(role);
}

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
 * Role-to-action matrix. Each entry mirrors a gate that exists in the UI code today;
 * `gate` names where it is enforced so the matrix can be audited against the source.
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
  | 'VIEW_POLICY_ANALYSIS';

export interface ActionRule {
  roles: readonly UserRole[];
  gate: string;
}

const EVERYONE: readonly UserRole[] = [...OFFICIAL_ROLES, ...PUBLIC_ROLES];

export const ACTION_RULES: Readonly<Record<ActionId, ActionRule>> = {
  VIEW_PUBLIC_ROAD_HEALTH: { roles: EVERYONE, gate: 'route /dashboard/ (public)' },
  CREATE_DAMAGE_REPORT: { roles: EVERYONE, gate: 'ReportRoadIssueCard is offered in every shell; no role check' },
  EDIT_OWN_DAMAGE_REPORT: { roles: ['PUBLIC_REPORTER'], gate: "ReportDetailBottomSheet: currentAccount.role === 'PUBLIC_REPORTER'" },
  UPVOTE_DAMAGE_REPORT: { roles: EVERYONE, gate: 'no role check on the upvote handlers' },
  RUN_PINN_SIMULATION: { roles: EVERYONE, gate: 'route /engine/simulation/ (public; public sidebar already exposed it)' },
  EXPORT_SIMULATION_PDF: { roles: EVERYONE, gate: 'SimulationPanel PDF button; no role check' },
  USE_FWD_OVERLAY_TOOLS: { roles: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'], gate: 'route /engine/fwd/' },
  VERIFY_DAMAGE_REPORT: { roles: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'], gate: 'FieldEngineerTools (route /engine/fwd/)' },
  MANAGE_WORK_ORDERS: { roles: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'], gate: 'routes /engineering/tasks/ and /operations/tasks/' },
  VIEW_PCI_TREND_HISTORY: { roles: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'], gate: 'route /engine/prediction/' },
  MONITOR_WIM_OPERATIONS: { roles: ['OPERATIONS_MANAGER'], gate: 'routes /operations/**' },
  ISSUE_ODOL_ENFORCEMENT: { roles: ['OPERATIONS_MANAGER'], gate: 'OperationsManagerAppView (routes /operations/monitoring/**)' },
  VIEW_POLICY_ANALYSIS: { roles: ['POLICY_MAKER'], gate: 'route /policy/' }
};

export function can(role: UserRole, action: ActionId): boolean {
  return ACTION_RULES[action].roles.includes(role);
}
