import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Download,
  Check,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Sliders,
  MapPin,
  Route as RouteIcon
} from 'lucide-react';
import type { RoadSegment, DamageReport } from '../../types';
import type { UserAccount } from '../../features/authentication/demoAccounts';
import type { Language } from '../../i18n/translations';
import { ROLE_LABELS } from '../../features/authentication/roleLabels';

export interface NotificationItem {
  id: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  time: string;
  type: string;
  isUnread: boolean;
  icon?: string;
  caseId?: string;
  done?: boolean;
}

export interface GlobalFloatingTopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSegment?: (segment: RoadSegment) => void;
  onSelectReport?: (report: DamageReport) => void;
  roadSegments?: RoadSegment[];
  communityReports?: DamageReport[];
  language: Language;
  onToggleLanguage: () => void;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  onToggleNotificationRead: (notifId: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  onViewNotificationReport?: (caseId: string) => void;
  currentAccount: UserAccount;
  isAnonymousIdentity: boolean;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
  isPolicyMaker?: boolean;
  onDownloadPolicyReport?: () => void;
  className?: string;
}

export const GlobalFloatingTopBar: React.FC<GlobalFloatingTopBarProps> = ({
  searchQuery,
  onSearchChange,
  onSelectSegment,
  onSelectReport,
  roadSegments = [],
  communityReports = [],
  language,
  onToggleLanguage,
  notifications,
  unreadNotificationsCount,
  onToggleNotificationRead,
  onMarkAllNotificationsAsRead,
  onViewNotificationReport,
  currentAccount,
  isAnonymousIdentity,
  onOpenLoginModal,
  onLogout,
  onOpenSettings,
  onToggleMobileSidebar,
  isPolicyMaker = false,
  onDownloadPolicyReport,
  className = ''
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const topBarRef = useRef<HTMLElement>(null);

  // Global '/' keyboard shortcut to focus search, and 'Escape' to blur / close menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (topBarRef.current && !topBarRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter search results
  const matchingSegments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return roadSegments
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.corridor.toLowerCase().includes(q) ||
          s.province.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [searchQuery, roadSegments]);

  const matchingReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return communityReports
      .filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.segmentName.toLowerCase().includes(q) ||
          r.damageTypeLabel.toLowerCase().includes(q) ||
          (r.corridor && r.corridor.toLowerCase().includes(q))
      )
      .slice(0, 4);
  }, [searchQuery, communityReports]);

  const hasSearchResults =
    searchQuery.trim().length > 0 &&
    (matchingSegments.length > 0 || matchingReports.length > 0);

  const roleLabel = useMemo(() => {
    switch (currentAccount.role) {
      case 'OPERATIONS_MANAGER':
        return 'Ops Manager';
      case 'FIELD_ENGINEER':
        return 'Field Engineer';
      case 'PUBLIC_REPORTER':
        return 'Pelapor Aktif';
      case 'PUBLIC_VIEWER':
        return 'Warga Pengamat';
      case 'POLICY_MAKER':
        return 'Policy Maker';
      default:
        return 'Pengguna';
    }
  }, [currentAccount.role]);

  return (
    <header
      ref={topBarRef}
      className={`h-14 border-b border-[#202B3B] bg-[#080E1B] px-3 sm:px-6 flex items-center justify-between z-40 relative shrink-0 ${className}`}
    >
      {/* 1. LEFT: Hamburger (mobile) + Global Search */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 max-w-xl">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Buka menu navigasi"
          className="md:hidden p-2 rounded-lg border bg-[#121C2C] text-[#9AA8BC] hover:text-[#E8EDF5] border-[#202B3B] transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Global Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA8BC] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSearchFocused(true);
            }}
            placeholder={
              language === 'id'
                ? 'Cari ruas jalan, koridor, atau koordinat...'
                : 'Search road, corridor, or coordinates...'
            }
            className="w-full border border-[#202B3B] rounded-lg pl-9 pr-8 sm:pr-9 py-1.5 text-xs bg-[#121C2C] text-[#E8EDF5] placeholder:text-[#9AA8BC] focus:outline-none focus:border-[#E8B52B] transition-colors"
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setIsSearchFocused(false);
              }}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA8BC] hover:text-[#E8EDF5] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono px-1.5 py-0.5 rounded border text-[#9AA8BC] bg-[#080E1B] border-[#202B3B] hidden sm:block pointer-events-none select-none"
              title="Tekan tombol '/' untuk mencari"
            >
              /
            </span>
          )}

          {/* Search Results Dropdown */}
          {isSearchFocused && hasSearchResults && (
            <div className="absolute left-0 top-full mt-1.5 w-full bg-[#0E1726] border border-[#202B3B] rounded-xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
              {matchingSegments.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA8BC] px-2 py-1">
                    Ruas Jalan ({matchingSegments.length})
                  </p>
                  {matchingSegments.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => {
                        onSelectSegment?.(seg);
                        setIsSearchFocused(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#18243A] transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <RouteIcon className="w-3.5 h-3.5 text-[#E8B52B] shrink-0" />
                          <p className="text-xs font-semibold text-[#E8EDF5] truncate group-hover:text-white">
                            {seg.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-[#9AA8BC] truncate pl-5">
                          {seg.corridor} &bull; {seg.province}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#121C2C] border border-[#202B3B] text-[#9AA8BC]">
                        {seg.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {matchingReports.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-[#202B3B]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA8BC] px-2 py-1">
                    Laporan Kerusakan ({matchingReports.length})
                  </p>
                  {matchingReports.map((rep) => (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => {
                        onSelectReport?.(rep);
                        setIsSearchFocused(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#18243A] transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <p className="text-xs font-semibold text-[#E8EDF5] truncate group-hover:text-white">
                            {rep.damageTypeLabel}
                          </p>
                        </div>
                        <p className="text-[11px] text-[#9AA8BC] truncate pl-5">
                          {rep.segmentName}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#121C2C] border border-[#202B3B] text-amber-400">
                        {rep.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT: System/Lang ID + Download (Policy) + Bell + Profile Pill */}
      <div className="flex items-center gap-2 shrink-0">
        {/* System & Language Indicator: [ID ID] pill */}
        <div className="relative">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[#202B3B] bg-[#121C2C] hover:bg-[#18243A] text-xs font-semibold text-[#E8EDF5] transition-colors cursor-pointer"
            title={language === 'id' ? 'Ganti Bahasa / Switch Language' : 'Switch Language / Ganti Bahasa'}
          >
            <span className="inline-flex items-center justify-center font-bold text-[10px] px-1 py-0.2 rounded bg-[#080E1B] text-[#9AA8BC] border border-[#202B3B]">
              ID
            </span>
            <span className="font-mono text-xs text-[#E8EDF5] font-bold">
              {language === 'id' ? 'ID' : 'EN'}
            </span>
          </button>
        </div>

        {/* Policy Maker Fast Access Download Button */}
        {isPolicyMaker && onDownloadPolicyReport && (
          <button
            type="button"
            onClick={onDownloadPolicyReport}
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#E8B52B] hover:bg-[#cc9624] text-[#080E1B] font-semibold text-xs transition-colors cursor-pointer"
            title="Unduh Laporan Eksekutif PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Laporan</span>
          </button>
        )}

        {/* Notification Bell Button & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsUserMenuOpen(false);
            }}
            className="relative p-2 rounded-lg border border-[#202B3B] bg-[#121C2C] hover:bg-[#18243A] text-[#9AA8BC] hover:text-[#E8EDF5] transition-colors cursor-pointer"
            title="Notifikasi Alur Kerja"
            aria-label="Buka notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#E8B52B] text-[#080E1B] font-bold text-[10px] flex items-center justify-center shadow-sm">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Notification Popover */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 border border-[#202B3B] rounded-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 bg-[#0E1726] text-[#E8EDF5]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#202B3B]">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-[#E8B52B]" />
                  <h4 className="font-semibold text-xs text-[#E8EDF5]">
                    {language === 'id' ? 'Notifikasi Alur Kerja' : 'Workflow Notifications'}
                  </h4>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#E8B52B]/15 text-[#E8B52B] font-bold text-[10px]">
                      {unreadNotificationsCount} {language === 'id' ? 'Baru' : 'New'}
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsAsRead}
                    className="text-xs font-semibold text-[#E8B52B] hover:underline cursor-pointer"
                  >
                    {language === 'id' ? 'Tandai Semua Dibaca' : 'Mark All Read'}
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#9AA8BC] px-1 py-4 text-center">
                    {language === 'id'
                      ? 'Belum ada pembaruan alur kerja untuk akun ini.'
                      : 'No workflow updates for this account yet.'}
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => onToggleNotificationRead(notif.id)}
                      className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        notif.isUnread
                          ? 'bg-[#18243A] border-[#202B3B]'
                          : 'bg-transparent border-transparent hover:bg-[#121C2C]'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className="p-1.5 rounded-md bg-[#121C2C] text-[#E8B52B] shrink-0 mt-0.5">
                          {notif.type === 'VERIFIED' && <Check className="w-3.5 h-3.5 text-[#50A878]" />}
                          {notif.type === 'UPVOTE' && <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
                          {notif.type === 'ALERT' && <AlertTriangle className="w-3.5 h-3.5 text-[#D96B5F]" />}
                          {notif.type === 'REPAIR' && <CheckCircle2 className="w-3.5 h-3.5 text-[#E8B52B]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-xs font-semibold text-[#E8EDF5] truncate">
                              {language === 'id' ? notif.titleId : notif.titleEn}
                            </h5>
                            <span className="text-[11px] font-mono text-[#9AA8BC] shrink-0">{notif.time}</span>
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed text-[#9AA8BC]">
                            {language === 'id' ? notif.descId : notif.descEn}
                          </p>
                          {notif.done && notif.caseId && onViewNotificationReport && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewNotificationReport(notif.caseId!);
                                setIsNotificationsOpen(false);
                              }}
                              className="mt-1.5 rounded-md bg-[#E8B52B] px-2.5 py-1 text-xs font-semibold text-[#080E1B] hover:bg-[#cc9624] cursor-pointer"
                            >
                              {language === 'id' ? 'Lihat Hasil' : 'View Result'}
                            </button>
                          )}
                        </div>
                        {notif.isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E8B52B] shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account Profile Pill Button & Dropdown */}
        <div className="relative z-50">
          <button
            type="button"
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center space-x-2 sm:space-x-2.5 border border-[#202B3B] rounded-lg py-1 pl-1.5 pr-2 sm:pr-2.5 bg-[#121C2C] hover:bg-[#18243A] transition-colors cursor-pointer"
            aria-label="Menu akun pengguna"
          >
            <img
              src={currentAccount.avatarUrl}
              alt={currentAccount.name}
              className="w-7 h-7 rounded-full object-cover border border-[#E8B52B]/40 shrink-0"
            />
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-[#E8EDF5] leading-tight truncate max-w-[120px]">
                Hi, {currentAccount.name.split(' ')[0]}
              </p>
              <p className="text-[11px] text-[#E8B52B] font-medium leading-tight">
                {roleLabel}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#9AA8BC] shrink-0" />
          </button>

          {/* Account Menu Popover */}
          {isUserMenuOpen && (
            <div
              role="menu"
              aria-label="Menu akun"
              className="absolute right-0 mt-2 w-72 border border-[#202B3B] rounded-2xl p-3 shadow-2xl z-[100] bg-[#0E1726] text-[#E8EDF5] animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-1 pb-3 mb-2 border-b border-[#202B3B]">
                <p className="text-sm font-bold text-[#E8EDF5]">{currentAccount.name}</p>
                <p className="text-xs text-[#9AA8BC]">
                  {ROLE_LABELS[currentAccount.role]} &bull; {currentAccount.title}
                </p>
                {currentAccount.agency && <p className="text-xs text-[#9AA8BC] mt-0.5">{currentAccount.agency}</p>}
                {!isAnonymousIdentity && (
                  <span className="inline-block mt-2 text-xs font-semibold text-sky-300 border border-sky-400/40 rounded px-2 py-0.5">
                    Akun demo &bull; identitas fiktif
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs rounded-xl hover:bg-[#18243A] text-[#E8EDF5] transition-colors cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-[#E8B52B]" />
                  <span>{language === 'id' ? 'Pengaturan Akun & Tampilan' : 'Account Settings & Theme'}</span>
                </button>

                {isAnonymousIdentity ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenLoginModal();
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs rounded-xl bg-[#E8B52B] hover:bg-[#cc9624] text-[#080E1B] font-semibold transition-colors mt-2 cursor-pointer"
                  >
                    <span>Masuk ke Sistem</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs rounded-xl bg-white/5 hover:bg-white/10 text-rose-300 hover:text-rose-200 transition-colors mt-2 cursor-pointer"
                  >
                    <span>Keluar dari Akun</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
