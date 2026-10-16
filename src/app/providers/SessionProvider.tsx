/**
 * Demo session — which stakeholder identity the UI is currently acting as.
 *
 * Before anyone picks an account the visitor is ANONYMOUS: a public viewer that may
 * report road damage without logging in (spec §22), never one of the named demo accounts.
 * The workflow server gives the anonymous visitor its own server-issued id; this
 * provider only tracks which identity the UI shows.
 *
 * This provider does not authenticate anyone. An identity is set here only after the
 * login page has had the credentials checked (by the server, or in the static demo build
 * by the demo verifier) and received the account they open; nothing in the UI switches
 * accounts any more. The account id is remembered in sessionStorage so a refresh keeps the
 * identity, and the app state provider signs the identity out again when no valid session
 * belongs to it (an id written into storage by hand gets no further than that). Server
 * actions are authorized against the server-signed token, not against this state.
 * Limits: docs/LOGIN_AND_DEMO_AUTH.md.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { UserRole } from '../../types';
import { USER_ACCOUNTS, UserAccount } from '../../features/authentication/demoAccounts';

const STORAGE_KEY = 'pavement-pinn.demo-session.account-id';

/** Stable id of the local anonymous identity (the server issues its own anon-… id). */
export const ANONYMOUS_ACCOUNT_ID = 'ANONYMOUS';

const NEUTRAL_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#334155"/><circle cx="32" cy="25" r="11" fill="#94a3b8"/><path d="M12 56c3-11 11-17 20-17s17 6 20 17z" fill="#94a3b8"/></svg>'
  );

/** Visitor who has not picked an account: public viewer, can report, cannot edit. */
export const ANONYMOUS_ACCOUNT: UserAccount = {
  id: ANONYMOUS_ACCOUNT_ID,
  name: 'Pengunjung Anonim',
  title: 'Warga tanpa login',
  role: 'PUBLIC_VIEWER',
  agency: 'Publik',
  agencyCode: 'ANONIM',
  email: '',
  nip: 'Tidak login',
  clearanceLevel: 'Publik — tanpa akun (laporan anonim)',
  avatarUrl: NEUTRAL_AVATAR,
  allowedScopes: ['Lihat peta & laporan publik', 'Buat laporan kerusakan anonim', 'Lacak status laporan dengan ID laporan'],
  restrictedScopes: ['Mengedit laporan', 'Data internal petugas & audit trail']
};

/** Identity before any login. */
export const DEFAULT_PUBLIC_ACCOUNT: UserAccount = ANONYMOUS_ACCOUNT;

export function isAnonymousAccount(account: Pick<UserAccount, 'id'>): boolean {
  return account.id === ANONYMOUS_ACCOUNT_ID;
}

function readStoredAccount(): UserAccount {
  try {
    const storedId = window.sessionStorage.getItem(STORAGE_KEY);
    return USER_ACCOUNTS.find((acc) => acc.id === storedId) ?? DEFAULT_PUBLIC_ACCOUNT;
  } catch {
    return DEFAULT_PUBLIC_ACCOUNT;
  }
}

function storeAccount(account: UserAccount | null): void {
  try {
    if (account && !isAnonymousAccount(account)) {
      window.sessionStorage.setItem(STORAGE_KEY, account.id);
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the session then lives in memory only.
  }
}

export interface SessionValue {
  currentAccount: UserAccount;
  activeRole: UserRole;
  /** Show the account a credential check returned. Call only after a successful login. */
  establishSession: (account: UserAccount) => void;
  /** Return to the anonymous visitor and forget the stored account. */
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState<UserAccount>(readStoredAccount);
  const [activeRole, setActiveRole] = useState<UserRole>(() => currentAccount.role);

  const establishSession = useCallback((account: UserAccount) => {
    setCurrentAccount(account);
    setActiveRole(account.role);
    storeAccount(account);
  }, []);

  const logout = useCallback(() => {
    setCurrentAccount(DEFAULT_PUBLIC_ACCOUNT);
    setActiveRole(DEFAULT_PUBLIC_ACCOUNT.role);
    storeAccount(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ currentAccount, activeRole, establishSession, logout }),
    [currentAccount, activeRole, establishSession, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
