import React, { useState } from 'react';
import { UserAccount, USER_ACCOUNTS } from '../data/userAccounts';
import { UserRole } from '../types';
import {
  Lock,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HardHat,
  Truck,
  Briefcase,
  X,
  KeyRound,
  Building2,
  BadgeAlert,
  ArrowRight,
  Camera,
  Users
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: UserAccount;
  onLogin: (account: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  onLogin
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(currentAccount.id);
  const [passwordInput, setPasswordInput] = useState<string>('••••••••••••');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetAccount = USER_ACCOUNTS.find((acc) => acc.id === selectedAccountId) || USER_ACCOUNTS[0];

  const handleAuthenticate = (account: UserAccount) => {
    setIsAuthenticating(true);
    setAuthSuccessMessage(null);

    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthSuccessMessage(`Autentikasi Berhasil! Selamat datang, ${account.name}`);
      setTimeout(() => {
        onLogin(account);
        setAuthSuccessMessage(null);
        onClose();
      }, 700);
    }, 600);
  };

  const roleIcons = {
    FIELD_ENGINEER: <HardHat className="w-5 h-5 text-amber-400" />,
    OPERATIONS_MANAGER: <Truck className="w-5 h-5 text-rose-400" />,
    POLICY_MAKER: <Briefcase className="w-5 h-5 text-indigo-400" />,
    PUBLIC_REPORTER: <Camera className="w-5 h-5 text-cyan-400" />,
    PUBLIC_VIEWER: <Users className="w-5 h-5 text-emerald-400" />
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white">
                  Autentikasi Akun & Tata Kelola Peran RBAC
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  SSO PUPR / Dephub / Bappenas
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Pilih profil akun stakeholder untuk mengakses visualisasi data spesifik dan hak akses PINN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detail Card: Lensa Akun Terautentikasi (Pindahan dari Home Header) */}
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-slate-950 p-4 sm:p-5 rounded-2xl border border-indigo-500/40 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-start space-x-3">
              <img
                src={currentAccount.avatarUrl}
                alt={currentAccount.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400/60 shadow-lg shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400">
                    Lensa Akun Terautentikasi:
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-cyan-300 border border-indigo-400/40 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {currentAccount.name} ({currentAccount.agencyCode})
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight mt-1">
                  {currentAccount.role === 'FIELD_ENGINEER' && 'Field Civil Engineer (BBPJN / Dinas PUPR/PU)'}
                  {currentAccount.role === 'OPERATIONS_MANAGER' && 'Operations Manager (Kemenhub / Petugas Jembatan Timbang / BPTD)'}
                  {currentAccount.role === 'POLICY_MAKER' && 'Executive Policy Maker (Kepala Dinas / Kementerian PU & Bappenas)'}
                  {currentAccount.role === 'PUBLIC_REPORTER' && 'Pelapor Masyarakat Kerusakan Jalan & Koridor Logistik'}
                  {currentAccount.role === 'PUBLIC_VIEWER' && 'Pengamat Komunitas / Citizen Infrastructure Inspector'}
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {currentAccount.role === 'FIELD_ENGINEER' && 'Analisis Keteknikan Struktural & Perencanaan Tebal Lapisan Tambah (Overlay Design)'}
                  {currentAccount.role === 'OPERATIONS_MANAGER' && 'Pemantauan Real-Time Violasi ODOL & Penegakan Ambang Tonase Dinamis di WIM'}
                  {currentAccount.role === 'POLICY_MAKER' && 'Ringkasan Eksekutif, Proyeksi Anggaran Preservasi 5 Tahun & Dampak Zero ODOL 2027'}
                  {currentAccount.role === 'PUBLIC_REPORTER' && 'Input Laporan Foto & Lokasi Kerusakan Jalan, Otomatis Korelasi Telemetri WIM'}
                  {currentAccount.role === 'PUBLIC_VIEWER' && 'Monitoring Laporan Komunitas, Mode Read-Only atau Mode Input Aktif'}
                </p>
              </div>
            </div>

            <div className="text-right hidden md:block font-mono text-xs shrink-0">
              <p className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {currentAccount.clearanceLevel.split(' - ')[0]}
              </p>
              <p className="text-slate-400 text-[11px]">{currentAccount.nip}</p>
              <p className="text-slate-400 text-[11px]">{currentAccount.email}</p>
            </div>
          </div>

          {/* Focus Area Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Fokus Analisis PINN:</span>
            {currentAccount.role === 'FIELD_ENGINEER' && (
              <>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Diagram Regangan (&epsilon;t, &epsilon;v)</span>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Basin Lendutan FWD</span>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Perhitungan Overlay AC-WC</span>
              </>
            )}
            {currentAccount.role === 'OPERATIONS_MANAGER' && (
              <>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Sinyal Alert WIM (Hijau/Kuning/Merah)</span>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; ANPR CCTV Truk</span>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Penindakan & Pengalihan ODOL</span>
              </>
            )}
            {currentAccount.role === 'POLICY_MAKER' && (
              <>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Proyeksi Kurva PCI (1-5 Tahun)</span>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Alokasi Anggaran APBN (Rp)</span>
                <span className="text-xs bg-white/5 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-xl font-medium">&bull; Laporan Ringkas GenAI PDF</span>
              </>
            )}
          </div>
        </div>

        {/* Role Account Switcher Tabs */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center justify-between">
            <span>Pilih Akun Stakeholder Sistem PINN:</span>
            <span className="text-[10px] text-slate-400 font-normal">Satu Klik Langsung Terhubung</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5">
            {USER_ACCOUNTS.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              const isCurrent = currentAccount.id === acc.id;

              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute top-2 right-2 text-[8.5px] font-mono font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full">
                      Aktif
                    </span>
                  )}

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 rounded-xl bg-slate-900/80 border border-white/10 shrink-0">
                        {roleIcons[acc.role]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9.5px] uppercase font-mono font-bold text-slate-400 truncate">
                          {acc.id === 'USR-006'
                            ? 'FIELD ENGR (APP)'
                            : acc.id === 'USR-008'
                            ? 'OPS MGR (APP)'
                            : acc.id === 'USR-007'
                            ? 'POLICY MAKER (APP)'
                            : (acc.role?.replace('_', ' ') || '')}
                        </p>
                        <p className="text-xs font-bold text-white truncate">{acc.name}</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-amber-400/90 font-medium mb-1 truncate">{acc.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{acc.agency}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                    <span className="truncate">{acc.agencyCode}</span>
                    <span className="text-cyan-400 font-bold shrink-0 ml-1">Pilih &rarr;</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Account Detail & Scope Comparison Matrix */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center space-x-3">
              <img
                src={targetAccount.avatarUrl}
                alt={targetAccount.name}
                className="w-10 h-10 rounded-xl object-cover border border-white/20"
              />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {targetAccount.name}
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                    {targetAccount.nip}
                  </span>
                </h4>
                <p className="text-xs text-slate-300">{targetAccount.title} ({targetAccount.agency})</p>
              </div>
            </div>

            <button
              onClick={() => handleAuthenticate(targetAccount)}
              disabled={isAuthenticating}
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 border border-white/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isAuthenticating ? 'Memproses SSO...' : `Login Akun (${targetAccount.agencyCode})`}</span>
            </button>
          </div>

          {authSuccessMessage && (
            <div className="p-3 bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{authSuccessMessage}</span>
            </div>
          )}

          {/* Scope Comparison Matrix: Allowed vs Restricted */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Allowed Data Scopes */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-xl space-y-2">
              <h5 className="text-xs font-bold text-emerald-300 uppercase font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Data & Fitur Yang DAPAT Dilihat / Diakses:
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {targetAccount.allowedScopes.map((scope, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-mono font-bold text-xs">&bull;</span>
                    <span>{scope}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Restricted Data Scopes */}
            <div className="bg-rose-950/20 border border-rose-500/30 p-3.5 rounded-xl space-y-2">
              <h5 className="text-xs font-bold text-rose-300 uppercase font-mono flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-400" />
                Data & Fitur Yang DIBATASI (Restricted RBAC):
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {targetAccount.restrictedScopes.map((scope, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-rose-400 font-mono font-bold text-xs">&times;</span>
                    <span className="opacity-80">{scope}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 border-t border-white/10 pt-3">
          <span className="font-mono text-[11px] flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            Keamanan RBAC Berbasis Kerangka Kerja Tata Kelola Siber PUPR & Dephub 2026.
          </span>
          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl border border-white/10 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
