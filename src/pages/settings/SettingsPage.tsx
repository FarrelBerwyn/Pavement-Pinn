import React from 'react';
import { Settings, X } from 'lucide-react';
import { usePageContext } from '../../app/pageContext';

/**
 * Route: /settings/ — account summary and the entry point to switch demo account.
 *
 * Markup moved verbatim from the modern shell's "User Settings" modal; closing it
 * returns to the workspace view that was open before.
 */
export const SettingsPage: React.FC = () => {
  const { currentAccount, closePage, openLogin } = usePageContext();

  return (
    <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121622] border border-white/20 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">User Settings</h3>
              <p className="text-xs text-slate-400">{currentAccount.name}</p>
            </div>
          </div>
          <button
            onClick={closePage}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-[#181f33] p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">Role:</span>
            <p className="font-extrabold text-white">{currentAccount.title}</p>
            <p className="text-[11px] text-amber-400 font-mono">{currentAccount.role}</p>
          </div>

          <div className="bg-[#181f33] p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">Agency / Organization:</span>
            <p className="font-bold text-white">{currentAccount.agency}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                
                openLogin();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
            >
              Switch User Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
