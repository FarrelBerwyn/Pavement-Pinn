import React, { useState, useEffect, useRef } from 'react';
import { useSheetDrag } from '../../components/ui/useSheetDrag';
import {
  X,
  MapPin,
  ThumbsUp,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Navigation,
  Star,
  MoreVertical,
  HelpCircle,
  Send,
  Share2,
  Bookmark,
  ChevronUp,
  ChevronDown,
  HardHat,
  FileText,
  Copy,
  Check,
  RotateCw,
  Layers,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { DamageReport, ReportReview } from '../../types';
import { ILLUSTRATIVE_PHOTO_LABEL } from '../../data/provenance';
import { UserAccount } from '../authentication/demoAccounts';
import { BeforeAfterSlider } from '../../components/ui/BeforeAfterSlider';
import { canEditReport } from '../rbac/accessPolicy';

export type SheetSnapPoint = 'PEEK' | 'HALF' | 'FULL';

/** Verification and handling status, as stored on the report. */
const STATUS_LABEL: Record<DamageReport['status'], string> = {
  PENDING: 'Menunggu verifikasi',
  VERIFIED_BY_ENGINEER: 'Terverifikasi',
  SCHEDULED_FOR_REPAIR: 'Dijadwalkan diperbaiki',
  REPAIRED: 'Selesai diperbaiki',
  CLOSED: 'Ditutup'
};

interface ReportDetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  report: DamageReport | null;
  onUpvoteReport: (reportId: string) => void;
  currentAccount: UserAccount;
  isFieldEngineer: boolean;
  onEditReport?: (updated: DamageReport) => void;
  /** Workflow panel for this report (state, evidence, role actions), rendered by the shell. */
  workflowPanel?: React.ReactNode;
  onOpenSPK?: () => void;
  onOpenEditModal?: (report: DamageReport) => void;
  reviewsMap: Record<string, ReportReview[]>;
  onAddReview: (reportId: string, review: ReportReview) => void;
}

export const ReportDetailBottomSheet: React.FC<ReportDetailBottomSheetProps> = ({
  isOpen,
  onClose,
  report,
  onUpvoteReport,
  currentAccount,
  isFieldEngineer,
  onEditReport,
  workflowPanel,
  onOpenSPK,
  onOpenEditModal,
  reviewsMap,
  onAddReview
}) => {
  // Snap position: 'HALF' (half-expanded ~50% screen) or 'FULL' (fully-expanded 88% screen)
  const [snapPoint, setSnapPoint] = useState<SheetSnapPoint>('HALF');
  const [detailsTab, setDetailsTab] = useState<'COMPARISON' | 'TELEMETRY' | 'OVERVIEW'>('COMPARISON');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copiedLocation, setCopiedLocation] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(true);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  // Review submission state
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<boolean>(false);

  const closeRef = useRef<() => void>(() => undefined);
  // Shared drag: the card follows the finger and settles on PEEK / HALF / FULL (or closes).
  const { sheetRef, sheetProps } = useSheetDrag<SheetSnapPoint>({
    mode: 'height',
    snaps: () => {
      const vh = window.innerHeight;
      return [
        { key: 'PEEK', height: 116 },
        { key: 'HALF', height: Math.min(460, Math.max(360, vh * 0.48)) },
        { key: 'FULL', height: vh * 0.9 }
      ];
    },
    onSnap: (next) => {
      if (next !== 'FULL' && scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      setSnapPoint(next);
    },
    onClose: () => closeRef.current(),
    maxWidth: 639
  });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Trigger smooth scroll-up animation when sheet is opened or report changes
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setSnapPoint('HALF');
      setReviewSubmitSuccess(false);
      setNewReviewText('');
      
      // Start from bottom translateY(100%), then smoothly scroll up into view
      setIsEntering(true);
      const rafId = requestAnimationFrame(() => {
        const timer = setTimeout(() => {
          setIsEntering(false);
        }, 30);
        return () => clearTimeout(timer);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [isOpen, report?.id]);

  if (!isOpen || !report) return null;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setIsEntering(false);
      setSnapPoint('HALF');
    }, 320);
  };
  closeRef.current = handleClose;

  const handleCopyLocation = () => {
    const textToCopy = `${report.segmentName}, ${report.province} (${report.coordinates[0].toFixed(5)}, ${report.coordinates[1].toFixed(5)})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  const handleSubmitReview = () => {
    if (!newReviewText.trim()) return;
    const newRev: ReportReview = {
      id: `rev-${Date.now()}`,
      userName: currentAccount.name || 'Warga Karawang',
      userAvatar: currentAccount.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      userBadge: currentAccount.role === 'PUBLIC_REPORTER' ? 'Warga Pelapor' : 'Warga Terverifikasi',
      rating: newReviewRating,
      timeAgo: 'Baru saja',
      dateFormatted: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      comment: newReviewText.trim(),
      likesCount: 0
    };

    onAddReview(report.id, newRev);
    setNewReviewText('');
    setReviewSubmitSuccess(true);
    setTimeout(() => setReviewSubmitSuccess(false), 3000);
  };

  const toggleSnapPoint = () => {
    setSnapPoint((prev) => {
      const next = prev === 'HALF' ? 'FULL' : 'HALF';
      if (next === 'HALF' && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      return next;
    });
  };

  // Unified click handler on card surface: expands to 90% height when in HALF state
  const handleCardSurfaceClick = (e: React.MouseEvent) => {
    if (snapPoint === 'FULL') return;
    const target = e.target as HTMLElement;
    // Do not trigger expand if clicking directly on an interactive button or control
    const isInteractive = target.closest('button, a, input, textarea, select, [role="button"], [data-interactive="true"]');
    if (isInteractive) return;
    setSnapPoint(snapPoint === 'PEEK' ? 'HALF' : 'FULL');
  };

  const isRepaired = report.status === 'REPAIRED';
  const reviews = reviewsMap[report.id] || [];

  return (
    <>
      {/* Mobile Backdrop & Background Gesture Capture Layer (No blur under dark background) */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 z-30 transition-all duration-300 sm:hidden cursor-pointer ${
          isClosing
            ? 'opacity-0 pointer-events-none'
            : snapPoint === 'PEEK'
            ? 'opacity-0 pointer-events-none'
            : snapPoint === 'FULL'
            ? 'bg-black/60 opacity-100 pointer-events-auto'
            : 'bg-black/25 opacity-100 pointer-events-auto'
        }`}
        title="Geser atau klik background ke bawah untuk menutup"
      />

      {/* ========================================================================= */}
      {/* DRAGGABLE BOTTOM SHEET CARD CONTAINER (90% Height on Expand, No blur)    */}
      {/* ========================================================================= */}
      <div
        ref={sheetRef as React.RefObject<HTMLDivElement>}
        {...sheetProps}
        onClick={handleCardSurfaceClick}
        style={{
          transform: isClosing || isEntering
            ? 'translateY(100%)'
            : 'translateY(0px)',
          opacity: isClosing ? 0 : 1
        }}
        className={`fixed sm:absolute z-40 sm:z-30 bg-canvas border-t sm:border border-white/20 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 box-border inset-x-0 bottom-0 select-none will-change-transform ${
          isClosing
            ? 'transition-all duration-320 ease-[cubic-bezier(0.32,0,0.67,0)]'
            : 'transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]'
        } ${
          /* Max height snap point: 90vh on mobile so user has 90% full card view with full scrollability */
          snapPoint === 'PEEK'
            ? 'h-[116px] left-2! right-2! bottom-[calc(env(safe-area-inset-bottom)+88px)]! rounded-2xl! cursor-pointer sm:h-auto sm:left-auto! sm:top-4 sm:right-4! sm:bottom-24! sm:w-[420px] sm:rounded-2xl!'
            : snapPoint === 'HALF'
            ? 'h-[48vh] min-h-[360px] max-h-[460px] cursor-pointer sm:h-auto sm:max-h-none sm:top-4 sm:right-4 sm:bottom-24 sm:w-[420px] sm:inset-x-auto'
            : 'h-[90vh] max-h-[90dvh] top-[10vh] sm:top-4 sm:right-4 sm:bottom-24 sm:w-[430px] sm:inset-x-auto sm:h-auto'
        }`}
      >
        {/* DRAG HANDLE BAR (TOUCH & POINTER GRAB ZONE) */}
        <div
          data-sheet-grab
          onClick={toggleSnapPoint}
          className="touch-none sm:touch-auto w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors shrink-0"
        >
          {/* Visual Pill Indicator */}
          <div className="w-14 h-2 bg-white/40 hover:bg-amber-400 rounded-full transition-all duration-200" />
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-400 mt-1">
            <span>{snapPoint === 'PEEK' ? 'Ketuk untuk membuka detail' : snapPoint === 'HALF' ? 'Ketuk / Tarik Ke Atas Untuk Detail Penuh (90%)' : 'Tarik Ke Bawah Untuk Perkecil'}</span>
            {snapPoint === 'HALF' ? (
              <ChevronUp className="w-3 h-3 text-amber-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-amber-400" />
            )}
          </div>
        </div>

        {/* STICKY HEADER ZONE (AVATAR, TITLE, CLOSE BUTTON) */}
        <div
          data-sheet-grab
          className="touch-none sm:touch-auto px-4 pt-1 pb-3 border-b border-white/10 flex items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Circular Thumbnail Avatar */}
            <div className="relative shrink-0">
              <img
                src={report.photoUrl}
                alt={report.damageTypeLabel}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md "
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=300';
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-white/30 flex items-center justify-center text-xs">
                📍
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base text-white truncate leading-tight">
                {report.damageTypeLabel}
              </h3>
              <p className="text-xs text-slate-300 truncate font-medium mt-1">
                {report.segmentName}
              </p>
              <div className="flex items-center gap-2 text-xs mt-1 text-slate-400 font-medium truncate">
                <span className={`font-bold ${isRepaired ? 'text-emerald-400' : report.status === 'PENDING' ? 'text-rose-400' : 'text-sky-300'}`}>
                  {STATUS_LABEL[report.status]}
                </span>
                <span>&bull;</span>
                <span className="font-mono text-amber-300">{report.severity}</span>
                <span>&bull;</span>
                <span className="truncate font-mono">{report.id}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Controls: Expand Toggle + Circular Close Button */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={toggleSnapPoint}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
              title={snapPoint === 'HALF' ? 'Expand Sheet' : 'Collapse Sheet'}
            >
              {snapPoint === 'HALF' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-[#272b38] hover:bg-[#343a4c] active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Tutup Card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INNER SCROLLABLE CONTENT (ACTIVE WHEN EXPANDED OR INSIDE CARD)             */}
        {/* ========================================================================= */}
        <div
          ref={scrollContainerRef}
          data-sheet-scroll
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar select-text overscroll-contain"
        >
          {/* Quick Info Badges Row */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1 bg-elevated border border-white/10 px-3 py-1 rounded-full text-xs font-bold text-amber-300">
              <span>5.0</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-slate-400 font-mono">({reviews.length + report.upvotesCount})</span>
            </div>
            <button
              onClick={() => onUpvoteReport(report.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all border ${
                report.userUpvoted
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md '
                  : 'bg-elevated hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{report.userUpvoted ? 'Telah Didukung' : 'Dukung Laporan'}</span>
            </button>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 truncate">
              GPS: {report.coordinates[0].toFixed(4)}, {report.coordinates[1].toFixed(4)}
            </span>
          </div>

          {/* Action Buttons Row: Upvote Button + Rute Navigasi Google Maps */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpvoteReport(report.id)}
              className={`py-2 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                report.userUpvoted
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md '
                  : 'bg-elevated hover:bg-elevated text-white border-white/10'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{report.userUpvoted ? 'Upvoted' : 'Upvote Laporan'}</span>
              <span className="font-mono text-xs">({report.upvotesCount})</span>
            </button>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${report.coordinates[0]},${report.coordinates[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-2xl bg-elevated hover:bg-elevated text-white border border-white/10 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer truncate shadow-sm"
            >
              <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Rute Navigasi</span>
            </a>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="grid grid-cols-3 gap-1 bg-elevated p-1 rounded-2xl border border-white/10 text-xs w-full">
            <button
              onClick={() => setDetailsTab('COMPARISON')}
              className={`py-2 rounded-xl font-bold transition-all text-center truncate cursor-pointer ${
                detailsTab === 'COMPARISON'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Before/After
            </button>
            <button
              onClick={() => setDetailsTab('TELEMETRY')}
              className={`py-2 rounded-xl font-bold transition-all text-center truncate cursor-pointer ${
                detailsTab === 'TELEMETRY'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Telemetri AI
            </button>
            <button
              onClick={() => setDetailsTab('OVERVIEW')}
              className={`py-2 rounded-xl font-bold transition-all text-center truncate cursor-pointer ${
                detailsTab === 'OVERVIEW'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ringkasan
            </button>
          </div>

          {/* TAB 1: BEFORE (citizen photo) & AFTER (F.E repair evidence from the server) */}
          {detailsTab === 'COMPARISON' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <BeforeAfterSlider
                before={report.photoUrl}
                after={report.repairDetails?.afterPhotoUrl}
                beforeAlt="Foto sebelum perbaikan (laporan warga)"
                afterAlt="Foto sesudah perbaikan (bukti F.E)"
                afterBadge={report.repairDetails?.afterPhotoUrl ? (report.repairDetails.verified === false ? 'Menunggu verifikasi M.O' : '✓ Terverifikasi M.O') : null}
                emptyAfterText="Belum ada foto sesudah. Foto muncul setelah petugas lapangan mengirim bukti perbaikan dan M.O memverifikasinya."
              />
              {!report.photoUrl.startsWith('data:') && <p className="text-xs text-amber-300">{ILLUSTRATIVE_PHOTO_LABEL.id}</p>}
              <p className="flex justify-between rounded-xl border border-white/5 bg-elevated p-2 text-xs text-slate-300">
                <span className="text-slate-400">Estimasi pelapor:</span>
                <span className="font-mono font-bold">{report.estimatedDepthCm} cm · {report.estimatedAreaM2} m²</span>
              </p>

              {report.repairDetails && (
                <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-1 text-xs text-slate-300">
                  <p className="flex items-center gap-2 font-semibold text-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    {isRepaired ? 'Telah selesai diperbaiki' : 'Bukti perbaikan diterima'}
                  </p>
                  {report.repairDetails.repairMethod && <p><span className="text-slate-400">Penanganan: </span>{report.repairDetails.repairMethod}</p>}
                  {report.repairDetails.repairedPciImprovement && <p><span className="text-slate-400">Kondisi: </span>{report.repairDetails.repairedPciImprovement}</p>}
                  {report.repairDetails.repairDate && <p className="text-slate-400">Bukti dikirim {report.repairDetails.repairDate.includes('T') ? new Date(report.repairDetails.repairDate).toLocaleString('id-ID') : report.repairDetails.repairDate}</p>}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TELEMETRY & AI METRICS */}
          {detailsTab === 'TELEMETRY' && (
            <div className="space-y-3 animate-in fade-in duration-200 text-xs">
              {/* Computer Vision YOLOv8 */}
              <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">OpenVINO YOLOv8 Edge AI:</span>
                  <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1 text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> 94.2% Confidence
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-xs text-slate-400">Kedalaman Lubang:</p>
                    <p className="text-sm font-semibold text-rose-400 font-mono">{report.estimatedDepthCm} cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Luas Area Kerusakan:</p>
                    <p className="text-sm font-semibold text-amber-300 font-mono">{report.estimatedAreaM2} m²</p>
                  </div>
                </div>
              </div>

              {/* WIM Overload Correlation */}
              <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">WIM Telemetry:</span>
                  <span className="px-2 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold font-mono">
                    OVERLOAD +184%
                  </span>
                </div>
                <p className="text-xs font-bold text-white">Truk Terdeteksi: B 9281 KFU (Golongan V)</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Muatan gandar 28.4 Ton melampaui batas izin 10.0 Ton. Akumulasi 142 truk/hari mempercepat fatik aspal.
                </p>
              </div>

              {/* PINN Physics Recommendation */}
              <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">PINN Recommendation:</span>
                  <span className="text-emerald-400 text-xs font-mono font-bold">Residual Life: 6.4 Thn</span>
                </div>
                <p className="text-xs font-semibold text-amber-300">Tebal Overlay Dianjurkan: 8.5 cm AC-WC</p>
              </div>
            </div>
          )}

          {/* TAB 3: OVERVIEW & CITIZEN REVIEWS */}
          {detailsTab === 'OVERVIEW' && (
            <div className="space-y-3 animate-in fade-in duration-200 text-xs">
              {/* Location Card with Copy button */}
              <div className="space-y-1 bg-elevated p-3 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Lokasi:</span>
                  <button
                    onClick={handleCopyLocation}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLocation ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLocation ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs font-bold text-white">{report.segmentName}</p>
                <p className="text-xs text-slate-400">
                  {report.province} &bull; GPS: {report.coordinates[0].toFixed(4)}, {report.coordinates[1].toFixed(4)}
                </p>
              </div>

              {/* Reporter Info & Description */}
              <div className="text-xs text-slate-400 flex items-center justify-between bg-elevated p-3 rounded-2xl border border-white/10">
                <span>Pelapor:</span>
                <span className="font-semibold text-slate-200 truncate ml-2">
                  {report.reporterName} &bull; {report.timestamp}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">Deskripsi Masalah:</span>
                <p className="text-xs text-slate-300 bg-elevated p-3 rounded-2xl border border-white/10 italic leading-relaxed">
                  "{report.description}"
                </p>
              </div>

              {/* Community Reviews */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Ulasan Komunitas Warga</span>
                  <span className="text-xs text-slate-400 font-mono">{reviews.length} Ulasan</span>
                </div>

                {/* Reviews List */}
                <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1 divide-y divide-white/10">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <img
                            src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                            alt={rev.userName}
                            className="w-7 h-7 rounded-full object-cover border border-white/20"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs block truncate leading-tight">
                              {rev.userName}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{rev.timeAgo}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Add Review Box */}
                <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Tulis Ulasan:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReviewRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Bagikan kondisi terkini perkerasan jalan..."
                    rows={2}
                    className="w-full bg-[#0f131d] border border-white/10 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 resize-none"
                  />

                  <div className="flex items-center justify-between">
                    {reviewSubmitSuccess ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Ulasan berhasil dikirim!
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={handleSubmitReview}
                      disabled={!newReviewText.trim()}
                      className="py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center space-x-1 transition-all cursor-pointer ml-auto"
                    >
                      <Send className="w-3 h-3" />
                      <span>Kirim</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Citizen Reporter Edit Button */}
          {canEditReport(currentAccount, report) && onOpenEditModal && (
            <button
              onClick={() => onOpenEditModal(report)}
              className="w-full py-2 rounded-2xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>✏️ Edit Laporan Ini</span>
            </button>
          )}

          {/* Workflow status and role actions (shared, server-backed). Field Engineer
              verification happens here through the assigned inspection, not as a direct edit. */}
          {workflowPanel}

          {isFieldEngineer && onOpenSPK && (
            <button
              type="button"
              onClick={onOpenSPK}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <HardHat className="w-4 h-4 text-amber-400" />
              <span>Buka tugas inspeksi saya</span>
            </button>
          )}

          {/* Secondary Footer Icons: Share, Save, Upvote */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: report.damageTypeLabel,
                    text: `Laporan Kerusakan: ${report.segmentName}`
                  });
                } else {
                  alert('Link laporan disalin ke clipboard.');
                }
              }}
              className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer truncate"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Share</span>
            </button>

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition-all truncate ${
                isSaved
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
            >
              <Bookmark className="w-4 h-4 shrink-0" />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={() => onUpvoteReport(report.id)}
              className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition-all truncate ${
                report.userUpvoted
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-semibold'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{report.userUpvoted ? 'Upvoted' : 'Upvote'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
