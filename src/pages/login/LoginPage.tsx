import React, { useCallback, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logoImg from '../../assets/pavement-pinn-logo.jpg';
import { usePageContext } from '../../app/pageContext';
import { useRouter } from '../../app/router';
import { sanitizeNextPath } from '../../app/guards/routeAccess';
import { useAppState } from '../../app/providers/AppStateProvider';
import { isAnonymousAccount } from '../../app/providers/SessionProvider';
import { USER_ACCOUNTS } from '../../features/authentication/demoAccounts';
import { ROLE_LABELS } from '../../features/authentication/roleLabels';
import { DEMO_ACCESS_ENABLED } from '../../features/authentication/demoAccess';
import { DemoAccessPanel } from '../../features/authentication/DemoAccessPanel';
import { loginErrorMessage, validateLoginFields, type LoginFieldErrors } from '../../features/authentication/loginMessages';
import { WorkflowApiError, type LoginCredentials } from '../../services/api/workflowClient';

/**
 * Route: /login/ — sign in with a username (or email) and password.
 *
 * The credentials are checked by the server (or, in the static demo build, by the demo
 * verifier); only the account they open becomes the session. Demo identities are offered
 * on a separate, labelled panel. This is demo authentication, not production
 * authentication: docs/LOGIN_AND_DEMO_AUTH.md.
 */
export const LoginPage: React.FC = () => {
  const { currentAccount, completeLogin, logout } = usePageContext();
  const { query, navigateTo } = useRouter();
  const { workflow } = useAppState();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const demoButtonRef = useRef<HTMLButtonElement>(null);

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      setSubmitting(true);
      setFormError(null);
      try {
        const actor = await workflow.gateway.login(credentials);
        const account = USER_ACCOUNTS.find((a) => a.id === actor.id);
        if (!account) throw new WorkflowApiError('UNKNOWN_ACCOUNT', 'Account not in catalogue', 0);
        completeLogin(account, sanitizeNextPath(query.get('next')));
      } catch (error) {
        const e = error instanceof WorkflowApiError ? error : null;
        setFormError(loginErrorMessage(e?.code, e?.status));
        setSubmitting(false);
        setPassword('');
        // The inputs are re-enabled on the next render; focus the password field after it.
        setTimeout(() => passwordRef.current?.focus(), 0);
      }
    },
    [workflow.gateway, completeLogin, query]
  );

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateLoginFields(username, password);
    setFieldErrors(errors);
    if (errors.username) {
      usernameRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }
    void signIn({ username: username.trim(), password });
  };

  const closeDemo = useCallback(() => {
    setDemoOpen(false);
    demoButtonRef.current?.focus();
  }, []);

  const signedIn = !isAnonymousAccount(currentAccount);
  const inputClass = (invalid: boolean) =>
    `block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 ${
      invalid ? 'border-red-500' : 'border-slate-300 hover:border-slate-400'
    }`;

  return (
    <div className="fixed inset-0 z-[2000] overflow-y-auto bg-slate-100 text-slate-900 font-sans">
      <div className="min-h-full lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        {/* Brand panel (wide screens) */}
        <aside className="hidden lg:flex flex-col justify-between bg-[#0b1f3a] px-12 py-10 text-white">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="" className="h-10 w-10 rounded-md object-cover" />
            <div>
              <p className="text-lg font-bold tracking-wide">PAVEMENT-PINN</p>
              <p className="text-xs text-blue-200">Road Infrastructure Intelligence Platform</p>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold leading-snug">Pemantauan kondisi jalan, pelaporan kerusakan, dan analisis perkerasan dalam satu sistem.</h2>
            <p className="mt-4 text-sm leading-relaxed text-blue-100/80">
              Untuk insinyur lapangan, manajer operasional, pengambil kebijakan, dan masyarakat pelapor.
            </p>
          </div>
          <p className="text-xs text-blue-200/70">Lingkungan demonstrasi. Data dan akun bersifat contoh.</p>
        </aside>

        <main className="flex min-h-full items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">
            {/* Brand header (phones and tablets) */}
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <img src={logoImg} alt="" className="h-10 w-10 rounded-md object-cover" />
              <div>
                <p className="text-base font-bold tracking-wide text-[#0b1f3a]">PAVEMENT-PINN</p>
                <p className="text-xs text-slate-600">Road Infrastructure Intelligence Platform</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-xl font-semibold text-slate-900">Masuk</h1>
              <p className="mt-1 text-sm text-slate-600">Gunakan akun yang diberikan untuk peran Anda.</p>

              {signedIn && (
                <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Saat ini masuk sebagai <strong>{currentAccount.name}</strong> ({ROLE_LABELS[currentAccount.role]}).{' '}
                  <button type="button" onClick={logout} className="font-semibold text-[#1d4ed8] underline underline-offset-2 cursor-pointer">
                    Keluar
                  </button>
                </p>
              )}

              {workflow.mode === 'OFFLINE_DEMO' && (
                <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Build statis tanpa server: kredensial diperiksa di browser dan tidak memberikan keamanan.
                </p>
              )}

              {formError && (
                <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {formError}
                </div>
              )}

              <form noValidate onSubmit={onSubmit} className="mt-5 space-y-4" aria-busy={submitting}>
                <div>
                  <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-medium text-slate-800">
                    Email atau nama pengguna
                  </label>
                  <input
                    ref={usernameRef}
                    id="login-identifier"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    value={username}
                    disabled={submitting}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={fieldErrors.username ? 'login-identifier-error' : undefined}
                    className={inputClass(!!fieldErrors.username)}
                  />
                  {fieldErrors.username && (
                    <p id="login-identifier-error" className="mt-1 text-xs text-red-700">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-800">
                    Kata sandi
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      disabled={submitting}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                      className={`${inputClass(!!fieldErrors.password)} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      aria-pressed={showPassword}
                      aria-controls="login-password"
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="login-password-error" className="mt-1 text-xs text-red-700">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#13305a] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  {submitting ? 'Memeriksa…' : 'Masuk ke Sistem'}
                </button>
              </form>

              <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                {DEMO_ACCESS_ENABLED && (
                  <button
                    ref={demoButtonRef}
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    Akses akun demo
                    <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800">DEMO</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigateTo('dashboard')}
                  className="w-full text-center text-sm font-medium text-[#1d4ed8] underline-offset-2 hover:underline cursor-pointer"
                >
                  Lihat peta publik tanpa masuk
                </button>
              </div>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
              Autentikasi di lingkungan ini adalah mode demo, bukan autentikasi produksi.
            </p>
          </div>
        </main>
      </div>

      {demoOpen && (
        <DemoAccessPanel
          busy={submitting}
          onClose={closeDemo}
          onUseAccount={(credentials) => {
            setDemoOpen(false);
            setUsername(credentials.username);
            setPassword('');
            void signIn(credentials);
          }}
        />
      )}
    </div>
  );
};
