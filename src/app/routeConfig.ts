/**
 * Centralized, typed route table — the single source of truth for every URL.
 *
 * Pure data + pure functions (no React, no browser globals, no model code), so it is
 * shared by the router, the guards, the navigation bindings and the node test suite.
 *
 * Paths are app-relative and canonical with a trailing slash; the deployment base
 * path (e.g. `/PavementPinn/`) is applied by the router, never stored here.
 */
import type { UserRole } from '../types';

export const ALL_ROLES: readonly UserRole[] = [
  'FIELD_ENGINEER',
  'OPERATIONS_MANAGER',
  'POLICY_MAKER',
  'PUBLIC_REPORTER',
  'PUBLIC_VIEWER'
];

export type RouteId =
  // public
  | 'dashboard'
  | 'dashboardAnalytics'
  | 'login'
  | 'roadDetail'
  | 'reports'
  | 'settings'
  // engine
  | 'engine'
  | 'enginePinn'
  | 'engineSimulation'
  | 'engineFwd'
  | 'enginePrediction'
  // computer vision
  | 'computerVision'
  | 'computerVisionDetection'
  | 'computerVisionHistory'
  // stakeholder workspaces
  | 'engineering'
  | 'engineeringTasks'
  | 'engineeringReference'
  | 'operations'
  | 'operationsTasks'
  | 'operationsAlerts'
  | 'operationsMonitoringRoadCondition'
  | 'operationsMonitoringWim'
  | 'operationsMonitoringOdol'
  | 'operationsMonitoringWeather'
  | 'operationsActionsTrafficEngineering'
  | 'operationsActionsAlerts'
  | 'policy';

/** `PUBLIC` = reachable without logging in (every role, including the two public ones). */
export type RouteAccess = 'PUBLIC' | readonly UserRole[];

export interface RouteDefinition {
  id: RouteId;
  /** Canonical app-relative pattern. `:name` captures one path segment. */
  path: string;
  title: string;
  access: RouteAccess;
  /**
   * `workspace` — rendered by the persistent application shell itself.
   * `page`      — a route-level page component mounted in the shell's outlet.
   */
  kind: 'workspace' | 'page';
}

const ENGINEERING: readonly UserRole[] = ['FIELD_ENGINEER'];
const OPERATIONS: readonly UserRole[] = ['OPERATIONS_MANAGER'];
const POLICY: readonly UserRole[] = ['POLICY_MAKER'];
const FIELD_TECHNICAL: readonly UserRole[] = ['FIELD_ENGINEER', 'OPERATIONS_MANAGER'];

export const ROUTES: readonly RouteDefinition[] = [
  // ---- Public -------------------------------------------------------------------
  { id: 'dashboard', path: '/dashboard/', title: 'Road Health Dashboard', access: 'PUBLIC', kind: 'workspace' },
  { id: 'dashboardAnalytics', path: '/dashboard/analytics/', title: 'National Pavement Analytics', access: 'PUBLIC', kind: 'page' },
  { id: 'login', path: '/login/', title: 'Account Login', access: 'PUBLIC', kind: 'page' },
  { id: 'roadDetail', path: '/roads/:roadId/', title: 'Road Detail', access: 'PUBLIC', kind: 'page' },
  { id: 'reports', path: '/reports/', title: 'Community Road Damage Reports', access: 'PUBLIC', kind: 'page' },
  { id: 'settings', path: '/settings/', title: 'Settings', access: 'PUBLIC', kind: 'page' },

  // ---- Engine -------------------------------------------------------------------
  { id: 'engine', path: '/engine/', title: 'Engine Hub', access: 'PUBLIC', kind: 'page' },
  { id: 'enginePinn', path: '/engine/pinn/', title: 'PINN Engine Overview', access: 'PUBLIC', kind: 'page' },
  { id: 'engineSimulation', path: '/engine/simulation/', title: 'PINN Simulation', access: 'PUBLIC', kind: 'page' },
  { id: 'engineFwd', path: '/engine/fwd/', title: 'FWD & Overlay Engineering Tools', access: FIELD_TECHNICAL, kind: 'page' },
  { id: 'enginePrediction', path: '/engine/prediction/', title: 'PCI Trend & Treatment History', access: FIELD_TECHNICAL, kind: 'page' },

  // ---- Computer Vision ----------------------------------------------------------
  { id: 'computerVision', path: '/computer-vision/', title: 'Computer Vision', access: 'PUBLIC', kind: 'page' },
  { id: 'computerVisionDetection', path: '/computer-vision/detection/', title: 'Damage Detection', access: 'PUBLIC', kind: 'page' },
  { id: 'computerVisionHistory', path: '/computer-vision/history/', title: 'Detection History', access: 'PUBLIC', kind: 'page' },

  // ---- Stakeholder workspaces ---------------------------------------------------
  { id: 'engineering', path: '/engineering/', title: 'Engineering Workspace', access: ENGINEERING, kind: 'workspace' },
  { id: 'engineeringTasks', path: '/engineering/tasks/', title: 'Tasks & Inspections (SPK)', access: ENGINEERING, kind: 'workspace' },
  { id: 'engineeringReference', path: '/engineering/reference/', title: 'Technical Reference', access: FIELD_TECHNICAL, kind: 'page' },

  { id: 'operations', path: '/operations/', title: 'Operations Workspace', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsTasks', path: '/operations/tasks/', title: 'Team & Tasks (SPK)', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsAlerts', path: '/operations/alerts/', title: 'Operational Alerts', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsMonitoringRoadCondition', path: '/operations/monitoring/road-condition/', title: 'Monitoring: Road Condition', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsMonitoringWim', path: '/operations/monitoring/wim/', title: 'Monitoring: WIM Posts', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsMonitoringOdol', path: '/operations/monitoring/odol/', title: 'Monitoring: ODOL Enforcement', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsMonitoringWeather', path: '/operations/monitoring/weather/', title: 'Monitoring: Weather & Flood', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsActionsTrafficEngineering', path: '/operations/actions/traffic-engineering/', title: 'Action: Traffic Engineering', access: OPERATIONS, kind: 'workspace' },
  { id: 'operationsActionsAlerts', path: '/operations/actions/alerts/', title: 'Action: Warnings', access: OPERATIONS, kind: 'workspace' },

  { id: 'policy', path: '/policy/', title: 'Policy Workspace', access: POLICY, kind: 'workspace' }
];

const ROUTE_BY_ID = new Map<RouteId, RouteDefinition>(ROUTES.map((route) => [route.id, route]));

export function getRoute(id: RouteId): RouteDefinition {
  const route = ROUTE_BY_ID.get(id);
  if (!route) throw new Error(`Unknown route id: ${id}`);
  return route;
}

export function allowedRolesFor(route: RouteDefinition): readonly UserRole[] {
  return route.access === 'PUBLIC' ? ALL_ROLES : route.access;
}

export function isPublicRoute(route: RouteDefinition): boolean {
  return route.access === 'PUBLIC';
}

// ---------------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------------

/** `/engine/pinn`, `engine//pinn/`, `` all normalise to a single canonical form. */
export function normalizePath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

const splitSegments = (path: string) => path.split('/').filter(Boolean);

export interface RouteMatch {
  route: RouteDefinition;
  params: Record<string, string>;
}

/** Resolve an app-relative pathname to a route. Returns null for unknown paths (not-found). */
export function matchRoute(pathname: string): RouteMatch | null {
  const target = splitSegments(pathname);
  for (const route of ROUTES) {
    const pattern = splitSegments(route.path);
    if (pattern.length !== target.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i].startsWith(':')) {
        let value = target[i];
        try {
          value = decodeURIComponent(target[i]);
        } catch {
          // keep the raw segment when it is not valid percent-encoding
        }
        params[pattern[i].slice(1)] = value;
      } else if (pattern[i] !== target[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return null;
}

/** Build the canonical app-relative path for a route, filling `:params`. */
export function buildPath(id: RouteId, params: Record<string, string> = {}): string {
  const route = getRoute(id);
  const segments = splitSegments(route.path).map((segment) => {
    if (!segment.startsWith(':')) return segment;
    const value = params[segment.slice(1)];
    if (value === undefined) throw new Error(`Missing route param "${segment.slice(1)}" for ${id}`);
    return encodeURIComponent(value);
  });
  return `/${segments.join('/')}/`;
}

/**
 * Paths that existed (or were plausible) before the canonical route table and are kept
 * as compatibility redirects. Keys and values are canonical app-relative paths.
 */
export const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  '/map/': '/dashboard/',
  '/simulation/': '/engine/simulation/',
  '/simulator/': '/engine/simulation/',
  '/analytics/': '/dashboard/analytics/',
  '/cv/': '/computer-vision/',
  '/engineer/': '/engineering/',
  '/ops/': '/operations/'
};

// ---------------------------------------------------------------------------------
// Base-path helpers (deployment base, e.g. GitHub Pages serves under /PavementPinn/)
// ---------------------------------------------------------------------------------

/** Convert a browser pathname into an app-relative canonical path. */
export function stripBasePath(pathname: string, basePath: string): string {
  const base = normalizePath(basePath);
  const full = normalizePath(pathname);
  if (base === '/') return full;
  if (full === base) return '/';
  return full.startsWith(base) ? normalizePath(full.slice(base.length - 1)) : full;
}

/** Convert an app-relative path into a browser pathname under the deployment base. */
export function withBasePath(appPath: string, basePath: string): string {
  const base = normalizePath(basePath);
  const path = normalizePath(appPath);
  return base === '/' ? path : `${base.slice(0, -1)}${path}`;
}
