/**
 * Bindings between routes and the two application shells' internal view keys.
 *
 * Before the restructure both shells navigated with React state only
 * (`activeNav` in the modern shell, `activeTab` in the classic portal). Those keys are
 * kept as the shells' view vocabulary; this module maps them one-to-one onto the
 * canonical routes so the URL — not component state — is the source of truth.
 *
 * Pure module: no React, no browser globals.
 */
import type { UserRole } from '../types';
import type { RouteId } from './routeConfig';

/** View keys of the modern application shell (ModernAppLayout). */
export type WorkspaceNav =
  | 'BERANDA_OPERASI'
  | 'PETA_POS_WIM'
  | 'DASHBOARD'
  | 'MAP'
  | 'REPORTS'
  | 'ANALYTICS'
  | 'SIMULATION'
  | 'ALERTS'
  | 'SETTINGS'
  | 'ENGINEERING'
  | 'SPK_ORDERS'
  | 'ROAD_HISTORY'
  | 'TECHNICAL_REFERENCE'
  | 'WEATHER_FLOOD'
  | 'TRAFFIC_ENG'
  | 'MONITORING_KONDISI_JALAN'
  | 'MONITORING_POS_WIM'
  | 'MONITORING_ODOL'
  | 'MONITORING_CUACA_BANJIR'
  | 'TINDAKAN_REKAYASA'
  | 'TINDAKAN_PERINGATAN';

/** Tabs of the classic portal shell (ClassicPortalLayout). */
export type ClassicTab = 'MAP' | 'SIMULATOR' | 'DASHBOARD';

/** The role's own dashboard route; public roles have no private dashboard. */
export function roleDashboardRoute(role: UserRole): RouteId {
  switch (role) {
    case 'FIELD_ENGINEER':
      return 'engineering';
    case 'OPERATIONS_MANAGER':
      return 'operations';
    case 'POLICY_MAKER':
      return 'policy';
    default:
      return 'dashboard';
  }
}

/** Canonical route for a modern-shell view key, for the given role. */
export function routeForNav(nav: WorkspaceNav, role: UserRole): RouteId {
  switch (nav) {
    case 'MAP':
    case 'PETA_POS_WIM':
      return 'dashboard';
    case 'DASHBOARD':
    case 'BERANDA_OPERASI':
      return roleDashboardRoute(role);
    case 'REPORTS':
      return 'reports';
    case 'ANALYTICS':
      return 'dashboardAnalytics';
    case 'SIMULATION':
      return 'engineSimulation';
    case 'ENGINEERING':
      return 'engineFwd';
    case 'ROAD_HISTORY':
      return 'enginePrediction';
    case 'TECHNICAL_REFERENCE':
      return 'engineeringReference';
    case 'SPK_ORDERS':
      return role === 'OPERATIONS_MANAGER' ? 'operationsTasks' : 'engineeringTasks';
    case 'SETTINGS':
      return 'settings';
    case 'ALERTS':
    case 'WEATHER_FLOOD':
    case 'TRAFFIC_ENG':
      return 'operationsAlerts';
    case 'MONITORING_KONDISI_JALAN':
      return 'operationsMonitoringRoadCondition';
    case 'MONITORING_POS_WIM':
      return 'operationsMonitoringWim';
    case 'MONITORING_ODOL':
      return 'operationsMonitoringOdol';
    case 'MONITORING_CUACA_BANJIR':
      return 'operationsMonitoringWeather';
    case 'TINDAKAN_REKAYASA':
      return 'operationsActionsTrafficEngineering';
    case 'TINDAKAN_PERINGATAN':
      return 'operationsActionsAlerts';
  }
}

/**
 * Modern-shell view key for a route, or null when the route is a standalone page that
 * has no view of its own in the shell (login, engine hub, computer vision, road detail,
 * settings) — those render over whichever workspace view was active last.
 */
export function navForRoute(routeId: RouteId): WorkspaceNav | null {
  switch (routeId) {
    case 'dashboard':
      return 'MAP';
    case 'engineering':
    case 'operations':
    case 'policy':
      return 'DASHBOARD';
    case 'engineeringTasks':
    case 'operationsTasks':
      return 'SPK_ORDERS';
    case 'reports':
      return 'REPORTS';
    case 'dashboardAnalytics':
      return 'ANALYTICS';
    case 'engineSimulation':
      return 'SIMULATION';
    case 'engineFwd':
      return 'ENGINEERING';
    case 'enginePrediction':
      return 'ROAD_HISTORY';
    case 'engineeringReference':
      return 'TECHNICAL_REFERENCE';
    case 'operationsAlerts':
      return 'ALERTS';
    case 'operationsMonitoringRoadCondition':
      return 'MONITORING_KONDISI_JALAN';
    case 'operationsMonitoringWim':
      return 'MONITORING_POS_WIM';
    case 'operationsMonitoringOdol':
      return 'MONITORING_ODOL';
    case 'operationsMonitoringWeather':
      return 'MONITORING_CUACA_BANJIR';
    case 'operationsActionsTrafficEngineering':
      return 'TINDAKAN_REKAYASA';
    case 'operationsActionsAlerts':
      return 'TINDAKAN_PERINGATAN';
    default:
      return null;
  }
}

/** Classic-portal tab for a route, or null when the route is a standalone page there. */
export function classicTabForRoute(routeId: RouteId): ClassicTab | null {
  switch (routeId) {
    case 'dashboard':
      return 'MAP';
    case 'engineSimulation':
      return 'SIMULATOR';
    case 'engineering':
    case 'operations':
    case 'policy':
      return 'DASHBOARD';
    default:
      return null;
  }
}

export function routeForClassicTab(tab: ClassicTab, role: UserRole): RouteId {
  switch (tab) {
    case 'MAP':
      return 'dashboard';
    case 'SIMULATOR':
      return 'engineSimulation';
    case 'DASHBOARD':
      return roleDashboardRoute(role);
  }
}

const OPERATIONS_ONLY_NAVS: readonly WorkspaceNav[] = [
  'BERANDA_OPERASI',
  'PETA_POS_WIM',
  'MONITORING_KONDISI_JALAN',
  'MONITORING_POS_WIM',
  'MONITORING_ODOL',
  'MONITORING_CUACA_BANJIR',
  'TINDAKAN_REKAYASA',
  'TINDAKAN_PERINGATAN'
];

const OPERATIONS_KEEP_NAVS: readonly WorkspaceNav[] = [
  'DASHBOARD',
  'BERANDA_OPERASI',
  'MAP',
  'PETA_POS_WIM',
  'MONITORING_KONDISI_JALAN',
  'MONITORING_POS_WIM',
  'MONITORING_ODOL',
  'MONITORING_CUACA_BANJIR',
  'TINDAKAN_REKAYASA',
  'TINDAKAN_PERINGATAN',
  'SPK_ORDERS',
  'REPORTS'
];

const PUBLIC_RESET_NAVS: readonly WorkspaceNav[] = [
  'BERANDA_OPERASI',
  'DASHBOARD',
  'ENGINEERING',
  'SPK_ORDERS',
  'ROAD_HISTORY',
  'TECHNICAL_REFERENCE',
  'WEATHER_FLOOD',
  'TRAFFIC_ENG',
  ...OPERATIONS_ONLY_NAVS
];

/**
 * View the modern shell lands on after the signed-in identity changes — a verbatim
 * port of the `useEffect` that used to live in PublicUserLayout ("Synchronize active
 * navigation if user switches role/account").
 */
export function navAfterAccountSwitch(role: UserRole, current: WorkspaceNav): WorkspaceNav {
  if (role === 'POLICY_MAKER') return 'DASHBOARD';
  if (role === 'OPERATIONS_MANAGER') return OPERATIONS_KEEP_NAVS.includes(current) ? current : 'DASHBOARD';
  if (role === 'FIELD_ENGINEER') return OPERATIONS_ONLY_NAVS.includes(current) ? 'DASHBOARD' : current;
  return PUBLIC_RESET_NAVS.includes(current) ? 'MAP' : current;
}
