/**
 * Demo access switch for the browser.
 *
 * Demo access (the demo-account panel on the login page, and credential checks in the
 * static build that has no server) is on in the dev server and in builds made with
 * VITE_DEMO_ACCESS=true. In any other build the demo credentials module is never loaded:
 * the dynamic import below sits behind a constant the bundler folds to `false`, so the
 * credentials are not part of the output (verified by building and searching the output, see
 * docs/LOGIN_AND_DEMO_AUTH.md).
 *
 * The server keeps its own switch (DEMO_AUTH); this flag only decides what the browser
 * bundle contains and shows.
 */
import type { LoginCredentials, OfflineCredentialVerifier } from '../../services/api/workflowClient';
import type { DemoCredential } from '../../data/reference/demoCredentials';

export const DEMO_ACCESS_ENABLED: boolean = import.meta.env.DEV || import.meta.env.VITE_DEMO_ACCESS === 'true';

type DemoCredentialsModule = typeof import('../../data/reference/demoCredentials');

export async function loadDemoCredentials(): Promise<DemoCredentialsModule | null> {
  if (!DEMO_ACCESS_ENABLED) return null;
  return import('../../data/reference/demoCredentials');
}

/** The demo identities to list on the demo-access panel (empty when demo access is off). */
export async function demoCredentialList(): Promise<readonly DemoCredential[]> {
  return (await loadDemoCredentials())?.DEMO_CREDENTIALS ?? [];
}

/**
 * Credential check for the static demo build. Undefined when demo access is off, so that
 * build offers no login at all rather than a check against data it does not contain.
 */
export const offlineDemoVerifier: OfflineCredentialVerifier | undefined = DEMO_ACCESS_ENABLED
  ? async (credentials: LoginCredentials) => {
      const module = await loadDemoCredentials();
      if (!module) return null;
      const credential = module.findDemoCredential(credentials.username);
      if (!credential || credential.password !== credentials.password) return null;
      return module.accountIdFor(credential, credentials.layout);
    }
  : undefined;
