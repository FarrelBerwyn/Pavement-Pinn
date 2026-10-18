import React, { useEffect, useMemo, useRef } from 'react';
import { UserAccount } from '../features/authentication/demoAccounts';
import { RouterProvider, useRouter } from './router';
import { SessionProvider, useSession } from './providers/SessionProvider';
import { AppStateProvider, useAppState } from './providers/AppStateProvider';
import { GlobalModalsProvider, useGlobalModals } from './providers/GlobalModalsProvider';
import { PageHostContext, PageHostValue, useWorkspaceNavigation } from './pageContext';
import { ModernAppLayout } from './layouts/ModernAppLayout';
import { ClassicPortalLayout } from './layouts/ClassicPortalLayout';
import { PAGE_COMPONENTS } from './pageRegistry';
import { AppErrorBoundary } from './AppErrorBoundary';
import { NotFoundPage, ForbiddenPage, ModernAppOnlyPage } from '../pages/not-found/NotFoundPage';
import { buildPath, matchRoute } from './routeConfig';
import { ClassicTab, classicTabForRoute, navForRoute, routeForClassicTab, routeForNav, WorkspaceNav } from './navigation';
import { ServerVersionBanner } from '../components/ui/ServerVersionBanner';
import {
  canOpenRoute,
  homeRouteFor,
  landingRouteAfterLogin,
  loginPathFor,
  resolveRouteAccess,
  usesModernShell
} from './guards/routeAccess';

/**
 * Application shell host: resolves the current route against the signed-in demo
 * identity, picks the shell (modern app or classic portal), derives the shell's active
 * view from the URL and mounts the route's page component in the shell outlet.
 */
function AppShell() {
  const { location, match, navigate, navigateTo } = useRouter();
  const { currentAccount, activeRole, establishSession, logout } = useSession();
  const app = useAppState();
  const modals = useGlobalModals();
  const { setActiveNav, launchSimulation } = useWorkspaceNavigation();

  const isModern = usesModernShell(currentAccount);
  const isRoot = location.path === '/';
  const decision = match ? resolveRouteAccess(match.route, currentAccount) : null;
  const allowedMatch = match && decision === 'ALLOW' ? match : null;
  const homeRoute = homeRouteFor(currentAccount);

  // Guard redirects: `/` goes to the identity's home; a public identity on a protected
  // route is sent to the login page with a `next` parameter. Public routes never redirect.
  useEffect(() => {
    if (isRoot) {
      navigate(`${buildPath(homeRoute)}${location.search}${location.hash}`, { replace: true });
    } else if (match && decision === 'LOGIN_REQUIRED') {
      navigate(loginPathFor(`${location.path}${location.search}`), { replace: true });
    }
  }, [isRoot, match, decision, homeRoute, location.path, location.search, location.hash, navigate]);

  // Remember the last workspace view so standalone pages (login, settings, engine hub, ...)
  // render over it and can return to it.
  const routeNav = allowedMatch ? navForRoute(allowedMatch.route.id) : null;
  const lastWorkspace = useRef<{ nav: WorkspaceNav; href: string } | null>(null);
  useEffect(() => {
    if (routeNav) lastWorkspace.current = { nav: routeNav, href: `${location.path}${location.search}` };
  }, [routeNav, location.path, location.search]);

  const homeNav = navForRoute(homeRoute) ?? 'MAP';
  const rememberedNav =
    lastWorkspace.current && canOpenRoute(routeForNav(lastWorkspace.current.nav, currentAccount.role), currentAccount)
      ? lastWorkspace.current.nav
      : homeNav;
  const activeNav: WorkspaceNav = routeNav ?? rememberedNav;

  // Classic portal: same idea — a standalone page keeps the tab that was open underneath it.
  const routeTab = allowedMatch ? classicTabForRoute(allowedMatch.route.id) : null;
  const lastClassicTab = useRef<ClassicTab>('MAP');
  useEffect(function rememberClassicTab() {
    if (routeTab) lastClassicTab.current = routeTab;
  }, [routeTab]);
  const activeTab: ClassicTab =
    routeTab ??
    (canOpenRoute(routeForClassicTab(lastClassicTab.current, currentAccount.role), currentAccount) ? lastClassicTab.current : 'MAP');

  const host = useMemo<PageHostValue>(
    () => ({
      closePage: () => {
        const remembered = lastWorkspace.current;
        const target = remembered ? matchRoute(remembered.href.split('?')[0]) : null;
        if (remembered && target && canOpenRoute(target.route.id, currentAccount)) {
          navigate(remembered.href);
        } else {
          navigateTo(homeRouteFor(currentAccount));
        }
      },
      completeLogin: (account: UserAccount, nextPath?: string | null) => {
        establishSession(account);
        const next = nextPath ? matchRoute(nextPath.split('?')[0]) : null;
        if (nextPath && next && next.route.id !== 'login' && canOpenRoute(next.route.id, account)) {
          navigate(nextPath);
          return;
        }
        const landing = landingRouteAfterLogin(account, matchRoute(location.path));
        navigateTo(landing.id, landing.params);
      },
      logout: () => {
        app.workflow.gateway.logout();
        logout();
        navigateTo('login');
      }
    }),
    [currentAccount, establishSession, logout, app.workflow.gateway, navigate, navigateTo, location.path]
  );

  // Route outlet content.
  let page: React.ReactNode = null;
  if (!isRoot) {
    if (!match) {
      page = <NotFoundPage />;
    } else if (decision === 'FORBIDDEN') {
      page = <ForbiddenPage route={match.route} />;
    } else if (decision === 'ALLOW') {
      const Page = PAGE_COMPONENTS[match.route.id];
      if (isModern) {
        page = Page ? <Page params={match.params} /> : null;
      } else if (classicTabForRoute(match.route.id) === null) {
        // The classic portal renders map / simulator / dashboard itself; every other route is a page.
        page = Page ? <Page params={match.params} /> : <ModernAppOnlyPage route={match.route} />;
      }
    }
  }

  const openLogin = () => navigateTo('login');

  return (
    <PageHostContext.Provider value={host}>
      {/* The login page is a page of its own: no shell, map or navigation behind it. */}
      {allowedMatch?.route.id === 'login' ? (
        page
      ) : isModern ? (
        <ModernAppLayout
          currentAccount={currentAccount}
          activeRole={activeRole}
          onLogout={host.logout}
          roadSegments={app.roadSegments}
          selectedSegment={app.selectedSegment}
          onSelectSegment={app.selectSegment}
          communityReports={app.communityReports}
          onAddReport={app.addCommunityReport}
          onEditReport={app.editCommunityReport}
          onUpvoteReport={app.upvoteCommunityReport}
          onLaunchSimulation={launchSimulation}
          currentResult={app.currentResult}
          onSimulationComplete={app.completeSimulation}
          onOpenOpenvinoModal={modals.openOpenvinoDiagnostics}
          onOpenAuditModal={modals.openAuditTrail}
          onOpenLoginModal={openLogin}
          activeNav={activeNav}
          onNavigate={setActiveNav}
          onOpenSettings={() => navigateTo('settings')}
        >
          {page}
        </ModernAppLayout>
      ) : (
        <ClassicPortalLayout
          activeTab={activeTab}
          onSelectTab={(tab) => navigateTo(routeForClassicTab(tab, currentAccount.role))}
          onOpenLoginModal={() => navigateTo('settings')}
          onLogout={host.logout}
        >
          {page}
        </ClassicPortalLayout>
      )}
    </PageHostContext.Provider>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <SessionProvider>
        <AppStateProvider>
          <GlobalModalsProvider>
            <AppErrorBoundary>
              <ServerVersionBanner />
              <AppShell />
            </AppErrorBoundary>
          </GlobalModalsProvider>
        </AppStateProvider>
      </SessionProvider>
    </RouterProvider>
  );
}
