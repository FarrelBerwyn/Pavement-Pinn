import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { DemoCredential, DemoLayout } from '../../data/reference/demoCredentials';
import { USER_ACCOUNTS } from './demoAccounts';
import { ROLE_LABELS } from './roleLabels';
import { demoCredentialList } from './demoAccess';

interface DemoAccessPanelProps {
  onClose: () => void;
  /** Sign in with these credentials through the normal login path. */
  onUseAccount: (credentials: { username: string; password: string; layout: DemoLayout }) => void;
  busy: boolean;
}

/**
 * Demo access, separate from the login form: lists the dummy demo identities with their
 * credentials. Choosing one still goes through the credential check; nothing here sets an
 * identity directly. Shown only when demo access is enabled for the build.
 */
export const DemoAccessPanel: React.FC<DemoAccessPanelProps> = ({ onClose, onUseAccount, busy }) => {
  const [credentials, setCredentials] = useState<readonly DemoCredential[] | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    demoCredentialList().then((list) => !cancelled && setCredentials(list));
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      // Keep keyboard focus inside the dialog
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[2100] flex items-end sm:items-center justify-center bg-slate-950/50 p-0 sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-access-title"
        aria-describedby="demo-access-note"
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto bg-white text-slate-900 rounded-t-xl sm:rounded-xl border border-slate-200 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="demo-access-title" className="text-base font-semibold">
                Akses akun demo
              </h2>
              <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800">DEMO</span>
            </div>
            <p id="demo-access-note" className="mt-1 text-xs leading-relaxed text-slate-600">
              Akun di bawah ini fiktif dan hanya untuk demonstrasi. Bukan akun, pegawai, atau identitas instansi yang sebenarnya.
              Kredensial ini hanya berlaku di lingkungan lokal atau demo dan tidak memberikan keamanan.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup akses akun demo"
            className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {credentials === null ? (
          <p className="px-5 py-6 text-sm text-slate-600" role="status">
            Memuat akun demo…
          </p>
        ) : credentials.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">Akses demo tidak diaktifkan pada build ini.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {credentials.map((credential) => {
              const account = USER_ACCOUNTS.find((a) => a.id === credential.accounts.MODERN_APP);
              return (
                <li key={credential.username} className="px-5 py-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1d4ed8]">{ROLE_LABELS[credential.role]}</p>
                      <p className="text-sm font-semibold">{account?.name ?? credential.username}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-600">
                        {credential.username} · {credential.password}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUseAccount({ username: credential.username, password: credential.password, layout: 'MODERN_APP' })}
                        className="rounded-md bg-[#0b1f3a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#13305a] disabled:opacity-60 cursor-pointer"
                        aria-label={`Masuk sebagai ${account?.name ?? credential.username} (${ROLE_LABELS[credential.role]})`}
                      >
                        Masuk
                      </button>
                      {credential.accounts.CLASSIC_PORTAL && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onUseAccount({ username: credential.username, password: credential.password, layout: 'CLASSIC_PORTAL' })}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                          aria-label={`Masuk sebagai ${account?.name ?? credential.username} di portal klasik`}
                        >
                          Portal klasik
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
