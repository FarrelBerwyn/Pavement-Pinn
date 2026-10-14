/**
 * Demo session — which stakeholder identity the UI is currently impersonating.
 *
 * THIS IS NOT AUTHENTICATION. Identities come from the bundled demo account list and
 * are selected without credentials (the login form's password field is decorative).
 * The selected account id is remembered in sessionStorage only so that a page refresh
 * or a deep link keeps the same demo identity for the lifetime of the tab.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { UserRole } from '../../types';
import { USER_ACCOUNTS, UserAccount } from '../../features/authentication/demoAccounts';

const STORAGE_KEY = 'pavement-pinn.demo-session.account-id';

/** Identity used before any login: the regular public reporter (unchanged default). */
export const DEFAULT_PUBLIC_ACCOUNT: UserAccount =
  USER_ACCOUNTS.find((acc) => acc.role === 'PUBLIC_REPORTER') || USER_ACCOUNTS[3] || USER_ACCOUNTS[0];

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
    if (account) {
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
  /** Switch to a demo account (also updates the active role). */
  login: (account: UserAccount) => void;
  /** Switch role, selecting the first demo account that has it. */
  selectRole: (role: UserRole) => void;
  /** Return to the default public identity and forget the stored one. */
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Account & Role State (Default to Regular Public User)
  const [currentAccount, setCurrentAccount] = useState<UserAccount>(readStoredAccount);
  const [activeRole, setActiveRole] = useState<UserRole>(() => currentAccount.role);

  // Synchronize login change with role
  const login = useCallback((account: UserAccount) => {
    setCurrentAccount(account);
    setActiveRole(account.role);
    storeAccount(account);
  }, []);

  // Synchronize role change with account
  const selectRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    const matchedAccount = USER_ACCOUNTS.find((acc) => acc.role === role);
    if (matchedAccount) {
      setCurrentAccount(matchedAccount);
      storeAccount(matchedAccount);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentAccount(DEFAULT_PUBLIC_ACCOUNT);
    setActiveRole(DEFAULT_PUBLIC_ACCOUNT.role);
    storeAccount(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ currentAccount, activeRole, login, selectRole, logout }),
    [currentAccount, activeRole, login, selectRole, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
