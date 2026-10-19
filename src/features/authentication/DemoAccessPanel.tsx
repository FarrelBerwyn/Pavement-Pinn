import React, { useEffect, useRef, useState } from 'react';
import { useSheetDrag } from '../../components/ui/useSheetDrag';
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
  // Swipe down to close on phones (from the top of the panel).
  const sheet = useSheetDrag({ mode: 'translate', onClose, maxWidth: 639 });

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
    <div className="fixed inset-0 z-[2100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        ref={(el) => {
          dialogRef.current = el;
          sheet.sheetRef.current = el;
        }}
        {...sheet.sheetProps}
        data-sheet-scroll
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-access-title"
        aria-describedby="demo-access-note"
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto bg-[#191B20] text-[#F5F5F7] rounded-t-[20px] sm:rounded-[24px] border border-[#30333A] shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#30333A] px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="demo-access-title" className="text-base font-bold text-[#F5F5F7]">
                Akses akun demo
              </h2>
              <span className="rounded-full border border-[#F5BC24]/40 bg-[#F5BC24]/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#F5BC24]">
                DEMO
              </span>
            </div>
            <p id="demo-access-note" className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
              Akun di bawah ini fiktif dan hanya untuk demonstrasi. Bukan akun, pegawai, atau identitas instansi yang sebenarnya.
              Kredensial ini hanya berlaku di lingkungan lokal atau demo dan tidak memberikan keamanan.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup akses akun demo"
            className="shrink-0 rounded-[10px] p-2 text-[#858995] hover:bg-[#111318] hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {credentials === null ? (
          <p className="px-6 py-8 text-sm text-[#A1A1AA]" role="status">
            Memuat akun demo…
          </p>
        ) : credentials.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[#A1A1AA]">Akses demo tidak diaktifkan pada build ini.</p>
        ) : (
          <ul className="divide-y divide-[#30333A]">
            {credentials.map((credential) => {
              const account = USER_ACCOUNTS.find((a) => a.id === credential.accounts.MODERN_APP);
              return (
                <li key={credential.username} className="px-6 py-4 hover:bg-[#111318]/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F5BC24]">{ROLE_LABELS[credential.role]}</p>
                      <p className="text-sm font-semibold text-[#F5F5F7]">{account?.name ?? credential.username}</p>
                      <p className="mt-1 font-mono text-xs text-[#858995]">
                        {credential.username} · {credential.password}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUseAccount({ username: credential.username, password: credential.password, layout: 'MODERN_APP' })}
                        className="rounded-[10px] bg-[#F5BC24] px-3.5 py-2 text-xs font-bold text-[#11110F] hover:bg-[#FFD052] disabled:opacity-60 transition-colors cursor-pointer"
                        aria-label={`Masuk sebagai ${account?.name ?? credential.username} (${ROLE_LABELS[credential.role]})`}
                      >
                        Masuk
                      </button>
                      {credential.accounts.CLASSIC_PORTAL && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onUseAccount({ username: credential.username, password: credential.password, layout: 'CLASSIC_PORTAL' })}
                          className="rounded-[10px] border border-[#30333A] bg-[#111318] px-3.5 py-2 text-xs font-medium text-[#D4D4D8] hover:border-[#424652] hover:bg-[#1A1D24] disabled:opacity-60 transition-colors cursor-pointer"
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
