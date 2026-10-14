/**
 * Route table tests: every required URL resolves, paths are canonical and unambiguous,
 * and the route <-> shell-view bindings are consistent.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTES,
  LEGACY_REDIRECTS,
  buildPath,
  getRoute,
  matchRoute,
  normalizePath,
  stripBasePath,
  withBasePath,
  allowedRolesFor,
  RouteId
} from '../../src/app/routeConfig';
import { classicTabForRoute, navForRoute, routeForClassicTab, routeForNav, roleDashboardRoute } from '../../src/app/navigation';
import { DEFAULT_BASE_PATH, normalizeBasePath } from '../../src/constants/deployment';

/** The URL contract requested for the restructure. */
const REQUIRED_URLS: Array<[string, RouteId]> = [
  ['/dashboard/', 'dashboard'],
  ['/login/', 'login'],
  ['/roads/JLN-KRW-KIIC-1/', 'roadDetail'],
  ['/reports/', 'reports'],
  ['/engine/', 'engine'],
  ['/engine/pinn/', 'enginePinn'],
  ['/engine/simulation/', 'engineSimulation'],
  ['/engine/fwd/', 'engineFwd'],
  ['/engine/prediction/', 'enginePrediction'],
  ['/computer-vision/', 'computerVision'],
  ['/computer-vision/detection/', 'computerVisionDetection'],
  ['/computer-vision/history/', 'computerVisionHistory'],
  ['/engineering/', 'engineering'],
  ['/operations/', 'operations'],
  ['/policy/', 'policy'],
  ['/settings/', 'settings']
];

test('every required URL resolves to its route', () => {
  for (const [url, id] of REQUIRED_URLS) {
    assert.equal(matchRoute(url)?.route.id, id, url);
  }
});

test('unknown URLs resolve to null (not-found), including near-misses', () => {
  for (const url of ['/nope/', '/engine/unknown/', '/roads/', '/roads/a/b/', '/dashboard/x/', '/operations/monitoring/', '/api/health/']) {
    assert.equal(matchRoute(url), null, url);
  }
});

test('paths are matched with or without a trailing slash and with duplicate slashes', () => {
  assert.equal(matchRoute('/engine/pinn')?.route.id, 'enginePinn');
  assert.equal(matchRoute('engine//pinn/')?.route.id, 'enginePinn');
  assert.equal(normalizePath('/engine/pinn'), '/engine/pinn/');
  assert.equal(normalizePath(''), '/');
  assert.equal(normalizePath('///'), '/');
});

test('route params are captured and percent-decoded; buildPath is the inverse', () => {
  const match = matchRoute('/roads/JLN%20A%2FB/');
  assert.equal(match?.route.id, 'roadDetail');
  assert.deepEqual(match?.params, { roadId: 'JLN A/B' });
  assert.equal(buildPath('roadDetail', { roadId: 'JLN A/B' }), '/roads/JLN%20A%2FB/');
  assert.throws(() => buildPath('roadDetail'));
});

test('route table is canonical: unique ids, unique paths, leading and trailing slash', () => {
  assert.equal(new Set(ROUTES.map((r) => r.id)).size, ROUTES.length);
  assert.equal(new Set(ROUTES.map((r) => r.path)).size, ROUTES.length);
  for (const route of ROUTES) {
    assert.equal(route.path, normalizePath(route.path), route.id);
    assert.ok(allowedRolesFor(route).length > 0, `${route.id} has no allowed role`);
  }
});

test('no route shadows another: each concrete path matches exactly its own route', () => {
  for (const route of ROUTES) {
    const concrete = route.path.replace(/:[^/]+/g, 'sample');
    const matching = ROUTES.filter((candidate) => {
      const a = candidate.path.split('/').filter(Boolean);
      const b = concrete.split('/').filter(Boolean);
      return a.length === b.length && a.every((seg, i) => seg.startsWith(':') || seg === b[i]);
    });
    assert.deepEqual(matching.map((r) => r.id), [route.id], route.path);
    assert.equal(matchRoute(concrete)?.route.id, route.id);
  }
});

test('legacy aliases redirect to existing canonical routes and never collide with one', () => {
  for (const [from, to] of Object.entries(LEGACY_REDIRECTS)) {
    assert.equal(matchRoute(from), null, `${from} must not be a real route`);
    assert.ok(matchRoute(to), `${from} redirects to unknown ${to}`);
  }
});

test('base path: strip and re-apply are inverse for the GitHub Pages base and for root hosting', () => {
  assert.equal(DEFAULT_BASE_PATH, '/PavementPinn/');
  assert.equal(stripBasePath('/PavementPinn/', '/PavementPinn/'), '/');
  assert.equal(stripBasePath('/PavementPinn', '/PavementPinn/'), '/');
  assert.equal(stripBasePath('/PavementPinn/engine/pinn', '/PavementPinn/'), '/engine/pinn/');
  assert.equal(stripBasePath('/engine/pinn/', '/'), '/engine/pinn/');
  // A path outside the base (e.g. the dev server root) is treated as app-relative.
  assert.equal(stripBasePath('/', '/PavementPinn/'), '/');
  assert.equal(stripBasePath('/reports/', '/PavementPinn/'), '/reports/');
  for (const route of ROUTES) {
    const concrete = route.path.replace(/:[^/]+/g, 'sample');
    for (const base of ['/PavementPinn/', '/']) {
      assert.equal(stripBasePath(withBasePath(concrete, base), base), concrete);
    }
  }
  assert.equal(withBasePath('/dashboard/', '/PavementPinn/'), '/PavementPinn/dashboard/');
  assert.equal(normalizeBasePath(undefined), '/PavementPinn/');
  assert.equal(normalizeBasePath('/'), '/');
  assert.equal(normalizeBasePath('PavementPinn'), '/PavementPinn/');
});

test('modern shell: every view-bound route round-trips through its view key', () => {
  for (const route of ROUTES) {
    const nav = navForRoute(route.id);
    if (!nav) continue;
    for (const role of allowedRolesFor(route)) {
      const back = routeForNav(nav, role);
      // DASHBOARD and SPK_ORDERS are role-relative: they resolve to the role's own workspace.
      if (nav === 'DASHBOARD') assert.equal(back, roleDashboardRoute(role));
      else if (nav === 'SPK_ORDERS') assert.equal(back, role === 'OPERATIONS_MANAGER' ? 'operationsTasks' : 'engineeringTasks');
      else assert.equal(back, route.id, `${route.id} via ${nav} for ${role}`);
    }
  }
});

test('workspace routes are exactly the ones a shell renders itself; page routes have no classic tab except the simulator', () => {
  for (const route of ROUTES) {
    if (route.kind === 'workspace') assert.ok(navForRoute(route.id), `${route.id} workspace without a shell view`);
  }
  assert.equal(classicTabForRoute('dashboard'), 'MAP');
  assert.equal(classicTabForRoute('engineSimulation'), 'SIMULATOR');
  assert.equal(classicTabForRoute('policy'), 'DASHBOARD');
  assert.equal(classicTabForRoute('reports'), null);
  assert.equal(routeForClassicTab('MAP', 'FIELD_ENGINEER'), 'dashboard');
  assert.equal(routeForClassicTab('SIMULATOR', 'POLICY_MAKER'), 'engineSimulation');
  assert.equal(routeForClassicTab('DASHBOARD', 'OPERATIONS_MANAGER'), 'operations');
  assert.equal(getRoute('operations').path, '/operations/');
});
