/**
 * Route guard logic — pure functions deciding what an identity may open and where it
 * lands. Kept free of React so the full role x route matrix is unit-tested in node.
 *
 * FRONTEND GUARD ONLY. This hides screens from demo identities; it does not protect
 * data. The backend has no authorization (see docs/architecture/RBAC_MATRIX.md).
 */
import type { UserRole } from '../../types';
import { evaluateAccess, isPublicRole, AccessDecision } from '../../features/rbac/accessPolicy';
import { allowedRolesFor, buildPath, getRoute, RouteDefinition, RouteId, RouteMatch } from '../routeConfig';
import { navAfterAccountSwitch, navForRoute, roleDashboardRoute, routeForNav } from '../navigation';

/** The slice of a demo account the guards need. */
export interface GuardIdentity {
  role: UserRole;
  layoutStyle?: 'MODERN_APP' | 'CLASSIC_PORTAL';
}

export function resolveRouteAccess(route: RouteDefinition, identity: GuardIdentity): AccessDecision {
  return evaluateAccess(allowedRolesFor(route), identity.role);
}

export function canOpenRoute(routeId: RouteId, identity: GuardIdentity): boolean {
  return resolveRouteAccess(getRoute(routeId), identity) === 'ALLOW';
}

/**
 * Which shell an identity uses — unchanged from the original App.tsx rule:
 * public roles and MODERN_APP accounts use the modern shell, CLASSIC_PORTAL accounts
 * the classic portal.
 */
export function usesModernShell(identity: GuardIdentity): boolean {
  return isPublicRole(identity.role) || identity.layoutStyle === 'MODERN_APP';
}

/**
 * Landing route for an identity: the public dashboard for public roles and for
 * classic-portal accounts (whose default tab is the map), the role dashboard for
 * modern-app officials.
 */
export function homeRouteFor(identity: GuardIdentity): RouteId {
  if (isPublicRole(identity.role) || !usesModernShell(identity)) return 'dashboard';
  return roleDashboardRoute(identity.role);
}

/**
 * Where to go right after the identity changes (login / account switch).
 * Stays on the current page when the new identity may still see it, applying the
 * modern shell's legacy landing rules; otherwise falls back to the identity's home.
 */
export function landingRouteAfterLogin(identity: GuardIdentity, current: RouteMatch | null): { id: RouteId; params: Record<string, string> } {
  const home = { id: homeRouteFor(identity), params: {} };
  if (!current || current.route.id === 'login') return home;

  let targetId: RouteId = current.route.id;
  if (usesModernShell(identity)) {
    const nav = navForRoute(current.route.id);
    if (nav) {
      targetId = routeForNav(navAfterAccountSwitch(identity.role, nav), identity.role);
    } else if (identity.role === 'POLICY_MAKER') {
      // The policy workspace always opened on its dashboard after a switch.
      targetId = 'policy';
    }
  }

  if (!canOpenRoute(targetId, identity)) return home;
  return { id: targetId, params: targetId === current.route.id ? current.params : {} };
}

/** `/login/?next=<path>` for a protected deep link hit by a public identity. */
export function loginPathFor(nextPath: string): string {
  return `${buildPath('login')}?next=${encodeURIComponent(nextPath)}`;
}

/** Only same-app, canonical-looking paths are accepted as a post-login target. */
export function sanitizeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || next.includes('://')) return null;
  return next;
}
