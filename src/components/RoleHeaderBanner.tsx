import React from 'react';
import { UserRole } from '../types';
import { UserAccount } from '../data/userAccounts';
import { HardHat, Truck, Briefcase, ShieldCheck, KeyRound, Camera, Users } from 'lucide-react';

interface RoleHeaderBannerProps {
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onSelectTab: (tab: 'MAP' | 'SIMULATOR' | 'DASHBOARD' | 'OPENVINO' | 'AUDIT') => void;
  currentAccount: UserAccount;
  onOpenLoginModal: () => void;
}

export const RoleHeaderBanner: React.FC<RoleHeaderBannerProps> = ({
  activeRole,
  onSelectRole,
  currentAccount,
  onOpenLoginModal
}) => {
  const shortRoles: Record<UserRole, string> = {
    FIELD_ENGINEER: 'Field Civil Engineer',
    OPERATIONS_MANAGER: 'Operations Manager WIM',
    POLICY_MAKER: 'Executive Policy Maker',
    PUBLIC_REPORTER: 'Pelapor Kerusakan Jalan',
    PUBLIC_VIEWER: 'Pengamat Komunitas'
  };

  const roleIcons: Record<UserRole, React.ReactNode> = {
    FIELD_ENGINEER: <HardHat className="w-3.5 h-3.5 text-amber-400" />,
    OPERATIONS_MANAGER: <Truck className="w-3.5 h-3.5 text-rose-400" />,
    POLICY_MAKER: <Briefcase className="w-3.5 h-3.5 text-indigo-400" />,
    PUBLIC_REPORTER: <Camera className="w-3.5 h-3.5 text-cyan-400" />,
    PUBLIC_VIEWER: <Users className="w-3.5 h-3.5 text-emerald-400" />
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border-b border-white/10 py-2 px-4 sm:px-6 lg:px-8 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Card Ganti Akun (Nama & Role Singkat) */}
        <div
          onClick={onOpenLoginModal}
          className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 p-1.5 pr-3.5 rounded-2xl cursor-pointer transition-all shadow-sm group"
          title="Klik untuk membuka Pop Up Detail & Ganti Akun"
        >
          <div className="relative shrink-0">
            <img
              src={currentAccount.avatarUrl}
              alt={currentAccount.name}
              className="w-9 h-9 rounded-xl object-cover border border-indigo-400/50 shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-white/10">
              {roleIcons[activeRole]}
            </span>
          </div>

          <div className="text-left">
            <div className="flex items-center space-x-2">
              <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                {currentAccount.name}
              </p>
              <span className="text-[9px] font-mono font-bold px-2 py-0.2 rounded-full bg-indigo-500/20 text-cyan-300 border border-indigo-500/30">
                {currentAccount.agencyCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{shortRoles[activeRole]}</span>
            </p>
          </div>

          <div className="ml-2 pl-3 border-l border-white/10 shrink-0">
            <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-xl font-mono font-bold border border-indigo-400/30 group-hover:bg-indigo-500 group-hover:text-white transition-all flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-cyan-300" />
              <span>Ganti Akun</span>
            </span>
          </div>
        </div>

        {/* Quick Role Switcher Buttons */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 hidden md:inline">
            Akses Cepat Role:
          </span>
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => onSelectRole('FIELD_ENGINEER')}
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all ${
                activeRole === 'FIELD_ENGINEER'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Field Eng
            </button>
            <button
              onClick={() => onSelectRole('OPERATIONS_MANAGER')}
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all ${
                activeRole === 'OPERATIONS_MANAGER'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ops WIM
            </button>
            <button
              onClick={() => onSelectRole('POLICY_MAKER')}
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all ${
                activeRole === 'POLICY_MAKER'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Policy
            </button>
            <button
              onClick={() => onSelectRole('PUBLIC_REPORTER')}
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all ${
                activeRole === 'PUBLIC_REPORTER'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pelapor Warga
            </button>
            <button
              onClick={() => onSelectRole('PUBLIC_VIEWER')}
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all ${
                activeRole === 'PUBLIC_VIEWER'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pengamat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


