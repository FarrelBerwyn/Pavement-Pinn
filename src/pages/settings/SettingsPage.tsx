import React from 'react';
import { Moon, Settings, Sun, X } from 'lucide-react';
import { usePageContext } from '../../app/pageContext';
import { useThemePreference, type ThemeMode } from '../../app/themePreference';

/**
 * Route: /settings/ — account summary and the entry point to switch demo account.
 *
 * Markup moved verbatim from the modern shell's "User Settings" modal; closing it
 * returns to the workspace view that was open before.
 */
export const SettingsPage: React.FC = () => {
  const { currentAccount, closePage, openLogin } = usePageContext();
  const [theme, setTheme] = useThemePreference();
  const themes: Array<{ id: ThemeMode; label: string; hint: string; Icon: typeof Moon }> = [
    { id: 'dark', label: 'Gelap', hint: 'Bawaan', Icon: Moon },
    { id: 'light', label: 'Terang', hint: 'Uji coba', Icon: Sun }
  ];

  return (
    <div className="fixed inset-0 z-[1500] bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 font-semibold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">User Settings</h3>
              <p className="text-xs text-slate-400">{currentAccount.name}</p>
            </div>
          </div>
          <button
            onClick={closePage}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-slate-400 text-xs font-bold">Role:</span>
            <p className="font-semibold text-white">{currentAccount.title}</p>
            <p className="text-xs text-amber-400 font-mono">{currentAccount.role}</p>
          </div>

          <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-slate-400 text-xs font-bold">Agency / Organization:</span>
            <p className="font-bold text-white">{currentAccount.agency}</p>
          </div>

          <fieldset className="bg-elevated p-3 rounded-xl border border-line space-y-2">
            <legend className="sr-only">Tampilan</legend>
            <p className="text-sm font-medium text-white">Tampilan</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode tampilan">
              {themes.map(({ id, label, hint, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={theme === id}
                  onClick={() => setTheme(id)}
                  className={`h-12 px-3 rounded-lg border text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                    theme === id ? 'border-amber-400 bg-amber-400/10 text-white' : 'border-line text-slate-300 hover:bg-surface'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${theme === id ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto text-xs text-slate-400">{hint}</span>
                </button>
              ))}
            </div>
            {theme === 'light' && (
              <p className="text-xs text-slate-400">Mode terang masih uji coba: bilah atas dan menu ikut terang, sebagian halaman kerja tetap gelap.</p>
            )}
          </fieldset>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                
                openLogin();
              }}
              className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs"
            >
              Switch User Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
