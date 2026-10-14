/**
 * Everything a route-level page needs, under the names the page JSX already used when it
 * lived inside the application shell (currentAccount, roadSegments, setActiveNav, ...).
 * Pages read from here instead of receiving two dozen props from a shell.
 */
import { createContext, useContext } from 'react';
import { RoadSegment } from '../types';
import { UserAccount } from '../features/authentication/demoAccounts';
import { useSession } from './providers/SessionProvider';
import { useAppState } from './providers/AppStateProvider';
import { useGlobalModals } from './providers/GlobalModalsProvider';
import { useRouter } from './router';
import { routeForNav, WorkspaceNav } from './navigation';

/** Services provided by the app shell host (see App.tsx). */
export interface PageHostValue {
  /** Leave a standalone page and return to the workspace view that was open before it. */
  closePage: () => void;
  /** Switch demo identity and land on the right route for it. */
  loginAs: (account: UserAccount, nextPath?: string | null) => void;
}

export const PageHostContext = createContext<PageHostValue | null>(null);

export function usePageHost(): PageHostValue {
  const value = useContext(PageHostContext);
  if (!value) throw new Error('usePageHost must be used inside the app shell');
  return value;
}

/** Navigation in the shells' own vocabulary, resolved to canonical routes. */
export function useWorkspaceNavigation() {
  const { navigateTo } = useRouter();
  const { currentAccount } = useSession();
  const { selectSegment } = useAppState();

  const setActiveNav = (nav: WorkspaceNav) => navigateTo(routeForNav(nav, currentAccount.role));

  /** Select a segment and open the simulator for it. */
  const launchSimulation = (segment: RoadSegment) => {
    selectSegment(segment);
    navigateTo('engineSimulation');
  };

  return { setActiveNav, launchSimulation };
}

export function usePageContext() {
  const { currentAccount, activeRole } = useSession();
  const app = useAppState();
  const modals = useGlobalModals();
  const { setActiveNav, launchSimulation } = useWorkspaceNavigation();
  const host = usePageHost();
  const { navigateTo } = useRouter();

  return {
    currentAccount,
    activeRole,
    // Same role predicates the modern shell uses.
    isFieldEngineer: currentAccount.role === 'FIELD_ENGINEER',
    isOperationsManager: currentAccount.role === 'OPERATIONS_MANAGER',
    isPolicyMaker: currentAccount.role === 'POLICY_MAKER',
    roadSegments: app.roadSegments,
    selectedSegment: app.selectedSegment,
    onSelectSegment: app.selectSegment,
    communityReports: app.communityReports,
    onAddReport: app.addCommunityReport,
    onEditReport: app.editCommunityReport,
    onUpvoteReport: app.upvoteCommunityReport,
    currentResult: app.currentResult,
    onSimulationComplete: app.completeSimulation,
    onOpenOpenvinoModal: modals.openOpenvinoDiagnostics,
    onOpenAuditModal: modals.openAuditTrail,
    onOpenWimPipeline: modals.openWimPipeline,
    setActiveNav,
    onLaunchSimulation: launchSimulation,
    /** Open the /login/ route (demo account switcher). */
    openLogin: function openLogin() { navigateTo('login'); },
    closePage: host.closePage,
    loginAs: host.loginAs
  };
}
