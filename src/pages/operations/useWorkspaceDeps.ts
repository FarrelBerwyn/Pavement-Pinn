/** Route-layer wiring for the analysis workspace: session actor, router and the gateway. */
import { useMemo } from 'react';
import { useRouter } from '../../app/router';
import { useSession } from '../../app/providers/SessionProvider';
import { useAppState } from '../../app/providers/AppStateProvider';
import type { Actor } from '../../domain/workflow/model';
import { workspaceGateway } from '../../features/workspace/api';
import type { WorkspaceDeps } from '../../features/workspace/WorkspaceContext';

export function useWorkspaceDeps(): WorkspaceDeps {
  const { currentAccount } = useSession();
  const { communityReports } = useAppState();
  const { location, navigate } = useRouter();
  const actor: Actor = { id: currentAccount.id, role: currentAccount.role, kind: 'DEMO_ACCOUNT' };
  const actorRef = useMemo(() => ({ current: actor }), []); // eslint-disable-line react-hooks/exhaustive-deps
  actorRef.current = actor;
  const gateway = useMemo(() => workspaceGateway(() => communityReports, () => actorRef.current), []); // eslint-disable-line react-hooks/exhaustive-deps
  return { gateway, actor, location, navigate };
}
