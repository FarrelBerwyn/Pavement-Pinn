import React from 'react';
import logoImg from '../../assets/pavement-pinn-logo.jpg';
import {
  Activity,
  Cpu,
  Map,
  Sliders,
  BarChart3,
  FileCheck,
  ShieldCheck,
  KeyRound,
  HardHat,
  Truck,
  Briefcase,
  Globe,
  Camera,
  Users,
  LogOut
} from 'lucide-react';
import { UserRole, IntelTelemetry } from '../../types';
import { UserAccount } from '../../features/authentication/demoAccounts';

interface NavbarProps {
  activeRole: UserRole;
  activeTab: 'MAP' | 'SIMULATOR' | 'DASHBOARD' | 'OPENVINO' | 'AUDIT';
  onSelectTab: (tab: 'MAP' | 'SIMULATOR' | 'DASHBOARD' | 'OPENVINO' | 'AUDIT') => void;
  telemetry?: IntelTelemetry;
  onOpenQuickSim: () => void;
  currentAccount: UserAccount;
  /** Opens the login page (anonymous visitors) or the account settings (signed in). */
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onToggleCommunityReports?: () => void;
  isCommunityReportOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRole,
  activeTab,
  onSelectTab,
  telemetry,
  onOpenQuickSim,
  currentAccount,
  onOpenLoginModal,
  onLogout,
  onToggleCommunityReports,
  isCommunityReportOpen
}) => {
  const shortRoleLabels: Record<UserRole, string> = {
    FIELD_ENGINEER: 'Field Civil Engineer',
    OPERATIONS_MANAGER: 'Operations Manager WIM',
    POLICY_MAKER: 'Executive Policy Maker',
    PUBLIC_REPORTER: 'Pelapor Kerusakan Jalan',
    PUBLIC_VIEWER: 'Pengamat Komunitas'
  };

  const roleIcons: Record<UserRole, React.ReactNode> = {
    FIELD_ENGINEER: <HardHat className="w-3 h-3 text-amber-400" />,
    OPERATIONS_MANAGER: <Truck className="w-3 h-3 text-rose-400" />,
    POLICY_MAKER: <Briefcase className="w-3 h-3 text-indigo-400" />,
    PUBLIC_REPORTER: <Camera className="w-3 h-3 text-cyan-400" />,
    PUBLIC_VIEWER: <Users className="w-3 h-3 text-emerald-400" />
  };

  const isRegularUser = activeRole === 'PUBLIC_REPORTER' || activeRole === 'PUBLIC_VIEWER';

  return (
    <header className="bg-slate-900/95 border-b border-white/10 text-slate-100 sticky top-0 z-50 shadow-2xl">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-2 cursor-pointer shrink-0 max-w-[190px] sm:max-w-xs" onClick={() => onSelectTab('MAP')}>
            <img 
              src={logoImg} 
              alt="Logo" 
              className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-lg shadow-black/20" 
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm sm:text-base tracking-tight from-white bg-clip-text text-transparent truncate">
                  PAVEMENT PINN
                </span>
                <span className="hidden 2xl:inline-flex items-center px-2 py-0.2 rounded-full text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  <Cpu className="w-2 h-2 mr-1 text-cyan-400" />
                  Intel® OpenVINO™
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xl:block truncate max-w-[170px]">
                DSS · mesin rumus RULE_BASED
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs List */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/70 p-1 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => onSelectTab('MAP')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'MAP'
                  ? 'bg-indigo-600 text-white shadow-lg  border border-white/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Map className="w-4 h-4 text-cyan-300" />
              <span>Peta Geospatial</span>
            </button>

            <button
              onClick={() => onSelectTab('SIMULATOR')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'SIMULATOR'
                  ? 'bg-indigo-600 text-white shadow-lg  border border-white/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-300" />
              <span>PINN Solver</span>
            </button>

            <button
              onClick={() => onSelectTab('DASHBOARD')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'DASHBOARD'
                  ? 'bg-indigo-600 text-white shadow-lg  border border-white/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-300" />
              <span>Dashboard Role</span>
            </button>

            <button
              onClick={() => onSelectTab('OPENVINO')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'OPENVINO'
                  ? 'bg-indigo-600 text-white shadow-lg  border border-white/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-300" />
              <span>Intel AI Diagnostik</span>
            </button>

            <button
              onClick={() => onSelectTab('AUDIT')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'AUDIT'
                  ? 'bg-indigo-600 text-white shadow-lg  border border-white/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-300" />
              <span>Audit Trail</span>
            </button>
          </nav>

          {/* Signed-in identity (no account switching here; logout is separate) */}
          <div className="flex items-center space-x-2">
            {/* Full Account Profile Card (Clickable directly to change account) */}
            <div
              onClick={onOpenLoginModal}
              className="flex items-center space-x-2 bg-slate-950/80 hover:bg-slate-950 border border-indigo-500/30 hover:border-indigo-400/60 p-2 px-3 rounded-2xl cursor-pointer transition-all shadow-md group"
              title="Profil akun"
            >
              <div className="relative shrink-0">
                <img
                  src={currentAccount.avatarUrl}
                  alt={currentAccount.name}
                  className="w-8 h-8 rounded-xl object-cover border border-indigo-400/50 shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border border-white/10">
                  {roleIcons[activeRole]}
                </span>
              </div>

              <div className="text-left hidden sm:block">
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[150px]">
                    {currentAccount.name}
                  </p>
                  <span className="text-xs font-mono font-bold px-2 py-0.2 rounded-full bg-indigo-500/20 text-cyan-300 border border-indigo-500/30 shrink-0">
                    {currentAccount.agencyCode}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{shortRoleLabels[activeRole]}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar"
              title="Keluar"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Keluar</span>
            </button>


            {/* Quick OpenVINO Telemetry Chip */}
            <div
              onClick={() => onSelectTab('OPENVINO')}
              className="hidden xl:flex items-center space-x-2 bg-slate-950/60 border border-white/10 hover:border-cyan-400/40 rounded-xl px-3 py-2 cursor-pointer text-xs transition-colors shadow-sm shrink-0"
              title="Detail arsitektur Intel OpenVINO"
            >
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-cyan-400 font-mono font-semibold text-xs">
                {telemetry ? telemetry.deviceUsed : 'perangkat tidak diketahui'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-200 font-mono text-xs">
                {telemetry?.inferenceLatencyMs != null ? `${telemetry.inferenceLatencyMs} ms` : 'latensi belum diukur'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-white/10 text-xs">
          <button
            onClick={() => onSelectTab('MAP')}
            className={`flex flex-col items-center py-1 px-2 ${
              activeTab === 'MAP' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Map className="w-4 h-4 mb-1" />
            <span>Peta</span>
          </button>
          <button
            onClick={() => onSelectTab('SIMULATOR')}
            className={`flex flex-col items-center py-1 px-2 ${
              activeTab === 'SIMULATOR' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Sliders className="w-4 h-4 mb-1" />
            <span>PINN</span>
          </button>
          <button
            onClick={() => onSelectTab('DASHBOARD')}
            className={`flex flex-col items-center py-1 px-2 ${
              activeTab === 'DASHBOARD' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-1" />
            <span>Dashboard</span>
          </button>

          {/* Laporan Kerusakan (Masyarakat) Button - Disamping Dashboard untuk Pengguna Biasa */}
          {isRegularUser && onToggleCommunityReports && (
            <button
              onClick={() => {
                onSelectTab('MAP');
                onToggleCommunityReports();
              }}
              className={`flex flex-col items-center py-1 px-2 transition-all ${
                isCommunityReportOpen ? 'text-cyan-300 font-semibold' : 'text-cyan-400 hover:text-white font-medium'
              }`}
            >
              <Camera className="w-4 h-4 mb-1 text-cyan-400 animate-pulse" />
              <span className="text-xs">Laporan</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('OPENVINO')}
            className={`flex flex-col items-center py-1 px-2 ${
              activeTab === 'OPENVINO' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Cpu className="w-4 h-4 mb-1" />
            <span>Edge AI</span>
          </button>
          <button
            onClick={() => onSelectTab('AUDIT')}
            className={`flex flex-col items-center py-1 px-2 ${
              activeTab === 'AUDIT' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FileCheck className="w-4 h-4 mb-1" />
            <span>Audit</span>
          </button>
        </div>
      </div>
    </header>
  );
};

