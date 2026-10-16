/**
 * DEMO credentials for the five demo identities.
 *
 * These are dummy credentials for a local or explicitly enabled demo environment. They
 * are public by design (they are printed on the demo-access panel) and protect nothing:
 * they exist so the login flow can be exercised end to end. They are not institutional
 * accounts and the people named in the demo catalogue are fictional.
 *
 * Who may import this module:
 * - the server, which checks credentials only while DEMO_AUTH is not "false";
 * - the browser, only through a dynamic import behind the demo-access flag
 *   (src/features/authentication/demoAccess.ts), so builds without that flag do not
 *   contain it;
 * - tests.
 */
import type { UserRole } from '../../types';
import { USER_ACCOUNTS } from './demoAccounts';

export type DemoLayout = 'MODERN_APP' | 'CLASSIC_PORTAL';

export interface DemoCredential {
  username: string;
  password: string;
  role: UserRole;
  /** Demo account per interface. Official roles also have a classic-portal account. */
  accounts: { MODERN_APP: string; CLASSIC_PORTAL?: string };
}

export const DEMO_CREDENTIALS: readonly DemoCredential[] = [
  {
    username: 'field.ahmad',
    password: 'FieldPinn2026!',
    role: 'FIELD_ENGINEER',
    accounts: { MODERN_APP: 'USR-006', CLASSIC_PORTAL: 'USR-001' }
  },
  {
    username: 'ops.hendra',
    password: 'OpsPinn2026!',
    role: 'OPERATIONS_MANAGER',
    accounts: { MODERN_APP: 'USR-008', CLASSIC_PORTAL: 'USR-002' }
  },
  {
    username: 'policy.retno',
    password: 'PolicyPinn2026!',
    role: 'POLICY_MAKER',
    accounts: { MODERN_APP: 'USR-007', CLASSIC_PORTAL: 'USR-003' }
  },
  {
    username: 'citizen.budi',
    password: 'CitizenPinn2026!',
    role: 'PUBLIC_REPORTER',
    accounts: { MODERN_APP: 'USR-004' }
  },
  {
    username: 'viewer.siti',
    password: 'ViewerPinn2026!',
    role: 'PUBLIC_VIEWER',
    accounts: { MODERN_APP: 'USR-005' }
  }
];

/** Account ids a credential can sign in to (one per interface). */
export function accountIdsOf(credential: DemoCredential): string[] {
  return [credential.accounts.MODERN_APP, credential.accounts.CLASSIC_PORTAL].filter((id): id is string => !!id);
}

/**
 * The credential an identifier names: the username, or the email of one of its demo
 * accounts. Case-insensitive, surrounding spaces ignored.
 */
export function findDemoCredential(identifier: unknown): DemoCredential | null {
  if (typeof identifier !== 'string') return null;
  const wanted = identifier.trim().toLowerCase();
  if (wanted === '') return null;
  return (
    DEMO_CREDENTIALS.find((credential) => {
      if (credential.username === wanted) return true;
      return accountIdsOf(credential).some(
        (id) => USER_ACCOUNTS.find((account) => account.id === id)?.email.toLowerCase() === wanted
      );
    }) ?? null
  );
}

/** The account to open for a credential and a requested interface (default: modern app). */
export function accountIdFor(credential: DemoCredential, layout?: unknown): string {
  return layout === 'CLASSIC_PORTAL' && credential.accounts.CLASSIC_PORTAL
    ? credential.accounts.CLASSIC_PORTAL
    : credential.accounts.MODERN_APP;
}

/** Test and demo-panel helper: the credential and interface that open a given account. */
export function demoLoginFor(accountId: string): { username: string; password: string; layout: DemoLayout } | null {
  for (const credential of DEMO_CREDENTIALS) {
    if (credential.accounts.MODERN_APP === accountId) {
      return { username: credential.username, password: credential.password, layout: 'MODERN_APP' };
    }
    if (credential.accounts.CLASSIC_PORTAL === accountId) {
      return { username: credential.username, password: credential.password, layout: 'CLASSIC_PORTAL' };
    }
  }
  return null;
}
