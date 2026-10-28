/**
 * RBAC tests: the full role x route matrix, the role x action matrix, landing rules
 * after an identity switch, and the demo account catalogue.
 *
 * The expected matrices are written out by hand (not derived from the route table) so
 * that an accidental change to the access rules fails here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserRole } from '../../src/types';
import { ROUTES, getRoute, matchRoute, RouteId } from '../../src/app/routeConfig';
import {
  canOpenRoute,
  homeRouteFor,
  landingRouteAfterLogin,
  loginPathFor,
  resolveRouteAccess,
  sanitizeNextPath,
  usesModernShell
} from '../../src/app/guards/routeAccess';
import { navAfterAccountSwitch } from '../../src/app/navigation';
import { ACTION_RULES, can, isOfficialRole, isPublicRole, ActionId } from '../../src/features/rbac/accessPolicy';
import { USER_ACCOUNTS } from '../../src/features/authentication/demoAccounts';

const ROLES: UserRole[] = ['FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER', 'PUBLIC_REPORTER', 'PUBLIC_VIEWER'];
type Row = [fe: string, om: string, pm: string, reporter: string, viewer: string];
const A = 'ALLOW';
const F = 'FORBIDDEN';
const L = 'LOGIN_REQUIRED';
const PUBLIC: Row = [A, A, A, A, A];
const FIELD_TECHNICAL: Row = [A, A, F, L, L];
const ENGINEERING_ONLY: Row = [A, F, F, L, L];
const OPERATIONS_ONLY: Row = [F, A, F, L, L];
const POLICY_ONLY: Row = [F, F, A, L, L];

const EXPECTED: Record<RouteId, Row> = {
  dashboard: PUBLIC,
  dashboardAnalytics: PUBLIC,
  login: PUBLIC,
  roadDetail: PUBLIC,
  reports: PUBLIC,
  settings: PUBLIC,
  engine: PUBLIC,
  enginePinn: PUBLIC,
  engineSimulation: PUBLIC,
  engineFwd: FIELD_TECHNICAL,
  enginePrediction: FIELD_TECHNICAL,
  computerVision: PUBLIC,
  computerVisionDetection: PUBLIC,
  computerVisionHistory: PUBLIC,
  engineering: ENGINEERING_ONLY,
  engineeringTasks: ENGINEERING_ONLY,
  engineeringReference: FIELD_TECHNICAL,
  operations: OPERATIONS_ONLY,
  operationsTasks: OPERATIONS_ONLY,
  operationsAlerts: OPERATIONS_ONLY,
  operationsMonitoringRoadCondition: OPERATIONS_ONLY,
  operationsMonitoringWim: OPERATIONS_ONLY,
  operationsMonitoringOdol: OPERATIONS_ONLY,
  operationsMonitoringWeather: OPERATIONS_ONLY,
  operationsActionsTrafficEngineering: OPERATIONS_ONLY,
  operationsActionsAlerts: OPERATIONS_ONLY,
  // PINN analysis workspace: M.O and F.E only. Policy maker -> forbidden page; citizens -> login
  // (the API answers 403 to all of them: tests/integration/workspace-api.test.ts).
  operationsPinn: FIELD_TECHNICAL,
  operationsPinnWorkspace: FIELD_TECHNICAL,
  policy: POLICY_ONLY,
  track: PUBLIC
};

test('role identifiers are the five canonical ones', () => {
  assert.deepEqual([...new Set(USER_ACCOUNTS.map((a) => a.role))].sort(), [...ROLES].sort());
  assert.deepEqual(ROLES.filter(isPublicRole), ['PUBLIC_REPORTER', 'PUBLIC_VIEWER']);
  assert.deepEqual(ROLES.filter(isOfficialRole), ['FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER']);
});

test('role x route matrix (30 routes x 5 roles)', () => {
  assert.deepEqual(Object.keys(EXPECTED).sort(), ROUTES.map((r) => r.id).sort(), 'matrix must cover every route');
  for (const route of ROUTES) {
    ROLES.forEach((role, index) => {
      assert.equal(resolveRouteAccess(route, { role }), EXPECTED[route.id][index], `${route.id} as ${role}`);
    });
  }
});

test('public routes never require login: a public viewer is allowed on all of them', () => {
  const publicIds = ROUTES.filter((r) => r.access === 'PUBLIC').map((r) => r.id);
  assert.ok(publicIds.includes('dashboard') && publicIds.includes('reports') && publicIds.includes('login'));
  for (const id of publicIds) {
    assert.equal(canOpenRoute(id, { role: 'PUBLIC_VIEWER' }), true, id);
    assert.equal(canOpenRoute(id, { role: 'PUBLIC_REPORTER' }), true, id);
  }
});

test('public identities are sent to login for protected routes; officials see a forbidden page', () => {
  assert.equal(resolveRouteAccess(getRoute('policy'), { role: 'PUBLIC_VIEWER' }), 'LOGIN_REQUIRED');
  assert.equal(resolveRouteAccess(getRoute('policy'), { role: 'FIELD_ENGINEER' }), 'FORBIDDEN');
  assert.equal(loginPathFor('/policy/'), '/login/?next=%2Fpolicy%2F');
});

test('role x action matrix', () => {
  const expected: Record<ActionId, UserRole[]> = {
    VIEW_PUBLIC_ROAD_HEALTH: ROLES,
    CREATE_DAMAGE_REPORT: ROLES,
    EDIT_OWN_DAMAGE_REPORT: ['PUBLIC_REPORTER'],
    UPVOTE_DAMAGE_REPORT: ROLES,
    RUN_PINN_SIMULATION: ROLES,
    EXPORT_SIMULATION_PDF: ROLES,
    USE_FWD_OVERLAY_TOOLS: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'],
    // Verification is the workflow inspection, done by the assigned engineer only.
    VERIFY_DAMAGE_REPORT: ['FIELD_ENGINEER'],
    MANAGE_WORK_ORDERS: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'],
    VIEW_PCI_TREND_HISTORY: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'],
    MONITOR_WIM_OPERATIONS: ['OPERATIONS_MANAGER'],
    ISSUE_ODOL_ENFORCEMENT: ['OPERATIONS_MANAGER'],
    VIEW_POLICY_ANALYSIS: ['POLICY_MAKER'],
    TRIAGE_REPORTS: ['OPERATIONS_MANAGER'],
    APPROVE_MAINTENANCE: ['OPERATIONS_MANAGER'],
    VIEW_AUDIT_TRAIL: ['FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER'],
    // Analysis workspace (handoff addendum §1/§4): F.E corrects, M.O approves, never the same person.
    VIEW_PINN_WORKSPACE: ['OPERATIONS_MANAGER', 'FIELD_ENGINEER'],
    CORRECT_ANALYSIS: ['FIELD_ENGINEER'],
    APPROVE_REPORT_VERSION: ['OPERATIONS_MANAGER']
  };
  assert.deepEqual(Object.keys(ACTION_RULES).sort(), Object.keys(expected).sort());
  for (const [action, roles] of Object.entries(expected) as Array<[ActionId, UserRole[]]>) {
    for (const role of ROLES) {
      assert.equal(can(role, action), roles.includes(role), `${action} as ${role}`);
    }
  }
});

test('demo account catalogue: 8 accounts, stable ids, roles, shells and home routes', () => {
  const summary = USER_ACCOUNTS.map((a) => [a.id, a.role, usesModernShell(a) ? 'modern' : 'classic', homeRouteFor(a)]);
  assert.deepEqual(summary, [
    ['USR-001', 'FIELD_ENGINEER', 'classic', 'dashboard'],
    ['USR-006', 'FIELD_ENGINEER', 'modern', 'engineering'],
    ['USR-002', 'OPERATIONS_MANAGER', 'classic', 'dashboard'],
    ['USR-008', 'OPERATIONS_MANAGER', 'modern', 'operations'],
    ['USR-003', 'POLICY_MAKER', 'classic', 'dashboard'],
    ['USR-007', 'POLICY_MAKER', 'modern', 'policy'],
    ['USR-004', 'PUBLIC_REPORTER', 'modern', 'dashboard'],
    ['USR-005', 'PUBLIC_VIEWER', 'modern', 'dashboard']
  ]);
  for (const account of USER_ACCOUNTS) {
    assert.ok(account.allowedScopes.length > 0, `${account.id} allowedScopes`);
    assert.ok(account.restrictedScopes.length > 0, `${account.id} restrictedScopes`);
    assert.ok(account.clearanceLevel.startsWith('Level '), `${account.id} clearanceLevel`);
    assert.equal(canOpenRoute(homeRouteFor(account), account), true, `${account.id} cannot open its own home`);
  }
});

test('landing rules after an account switch reproduce the original shell behaviour', () => {
  // policy maker always lands on the dashboard
  assert.equal(navAfterAccountSwitch('POLICY_MAKER', 'MAP'), 'DASHBOARD');
  assert.equal(navAfterAccountSwitch('POLICY_MAKER', 'SIMULATION'), 'DASHBOARD');
  // operations manager keeps operations views, the map, tasks and reports
  for (const nav of ['DASHBOARD', 'MAP', 'MONITORING_ODOL', 'TINDAKAN_PERINGATAN', 'SPK_ORDERS', 'REPORTS'] as const) {
    assert.equal(navAfterAccountSwitch('OPERATIONS_MANAGER', nav), nav);
  }
  for (const nav of ['SIMULATION', 'ENGINEERING', 'ANALYTICS', 'ROAD_HISTORY', 'ALERTS'] as const) {
    assert.equal(navAfterAccountSwitch('OPERATIONS_MANAGER', nav), 'DASHBOARD');
  }
  // field engineer only leaves operations-only views
  assert.equal(navAfterAccountSwitch('FIELD_ENGINEER', 'MONITORING_POS_WIM'), 'DASHBOARD');
  assert.equal(navAfterAccountSwitch('FIELD_ENGINEER', 'TINDAKAN_REKAYASA'), 'DASHBOARD');
  for (const nav of ['MAP', 'SIMULATION', 'SPK_ORDERS', 'REPORTS', 'ROAD_HISTORY', 'ENGINEERING'] as const) {
    assert.equal(navAfterAccountSwitch('FIELD_ENGINEER', nav), nav);
  }
  // public roles drop back to the map from any restricted view
  for (const nav of ['DASHBOARD', 'ENGINEERING', 'SPK_ORDERS', 'ROAD_HISTORY', 'TECHNICAL_REFERENCE', 'MONITORING_ODOL'] as const) {
    assert.equal(navAfterAccountSwitch('PUBLIC_VIEWER', nav), 'MAP');
    assert.equal(navAfterAccountSwitch('PUBLIC_REPORTER', nav), 'MAP');
  }
  for (const nav of ['MAP', 'REPORTS', 'ANALYTICS', 'SIMULATION'] as const) {
    assert.equal(navAfterAccountSwitch('PUBLIC_REPORTER', nav), nav);
  }
});

test('no stale permissions: after ANY account switch from ANY route, the landing route is allowed', () => {
  const startingPoints = [null, ...ROUTES.map((route) => matchRoute(route.path.replace(/:[^/]+/g, 'JLN-KRW-KIIC-1')))];
  for (const account of USER_ACCOUNTS) {
    for (const current of startingPoints) {
      const landing = landingRouteAfterLogin(account, current);
      assert.equal(
        canOpenRoute(landing.id, account),
        true,
        `${account.id} landed on ${landing.id} from ${current?.route.id ?? 'nowhere'}`
      );
      assert.notEqual(landing.id, 'login', 'never stays on the login page after logging in');
    }
  }
});

test('landing examples: switching identity moves between role workspaces', () => {
  const at = (path: string) => matchRoute(path);
  const account = (id: string) => USER_ACCOUNTS.find((a) => a.id === id)!;
  // engineer dashboard -> operations manager keeps "dashboard", now the operations one
  assert.equal(landingRouteAfterLogin(account('USR-008'), at('/engineering/')).id, 'operations');
  assert.equal(landingRouteAfterLogin(account('USR-008'), at('/engineering/tasks/')).id, 'operationsTasks');
  // logging out to a public account from a protected workspace returns to the public dashboard
  assert.equal(landingRouteAfterLogin(account('USR-004'), at('/operations/monitoring/odol/')).id, 'dashboard');
  assert.equal(landingRouteAfterLogin(account('USR-005'), at('/policy/')).id, 'dashboard');
  // public pages are kept, including their params
  assert.deepEqual(landingRouteAfterLogin(account('USR-006'), at('/roads/JLN-KRW-KIIC-1/')), {
    id: 'roadDetail',
    params: { roadId: 'JLN-KRW-KIIC-1' }
  });
  // policy maker always lands on the policy workspace in the modern app
  assert.equal(landingRouteAfterLogin(account('USR-007'), at('/reports/')).id, 'policy');
  assert.equal(landingRouteAfterLogin(account('USR-007'), at('/computer-vision/')).id, 'policy');
  // classic accounts stay where they are when allowed, otherwise go to the map
  assert.equal(landingRouteAfterLogin(account('USR-001'), at('/engineering/')).id, 'engineering');
  assert.equal(landingRouteAfterLogin(account('USR-001'), at('/policy/')).id, 'dashboard');
  // from the login page the identity's home is used
  assert.equal(landingRouteAfterLogin(account('USR-006'), at('/login/')).id, 'engineering');
});

test('post-login "next" target only accepts same-app paths', () => {
  assert.equal(sanitizeNextPath('/policy/'), '/policy/');
  assert.equal(sanitizeNextPath('/roads/A/?tab=1'), '/roads/A/?tab=1');
  for (const hostile of [null, '', 'policy', '//evil.example/x', 'https://evil.example/', '/\\evil', '/x?u=http://evil.example']) {
    assert.equal(sanitizeNextPath(hostile), null, String(hostile));
  }
});


test('the PINN sidebar entry follows VIEW_PINN_WORKSPACE (M.O and F.E only)', () => {
  assert.deepEqual(ROLES.filter((r) => can(r, 'VIEW_PINN_WORKSPACE')), ['FIELD_ENGINEER', 'OPERATIONS_MANAGER']);
  assert.equal(can('OPERATIONS_MANAGER', 'CORRECT_ANALYSIS'), false);
  assert.equal(can('FIELD_ENGINEER', 'APPROVE_REPORT_VERSION'), false);
  assert.equal(matchRoute('/operations/pinn/ROAD-2026-001/')?.route.id, 'operationsPinnWorkspace');
});
