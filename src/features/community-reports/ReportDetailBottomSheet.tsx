import React, { useState, useEffect, useRef } from 'react';
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

  // Dragging gesture state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const dragStartYRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const currentOffsetYRef = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Trigger smooth scroll-up animation when sheet is opened or report changes
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setSnapPoint('HALF');
      setDragOffsetY(0);
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
    setIsDragging(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setIsEntering(false);
      setSnapPoint('HALF');
      setDragOffsetY(0);
    }, 320);
  };

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

  // Touch / Drag Gesture Handlers (for Card & Drag Handle)
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartYRef.current = clientY;
    dragStartTimeRef.current = Date.now();
    currentOffsetYRef.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartYRef.current === null) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartYRef.current;

    // Check if inner content is scrolled
    const scrollContainer = scrollContainerRef.current;
    const isScrolledDown = scrollContainer && scrollContainer.scrollTop > 5;

    // If fully expanded and user is scrolling content downward, allow native scroll
    if (snapPoint === 'FULL' && isScrolledDown && deltaY < 0) {
      return;
    }

    // When pulling down at the top of content while in FULL mode, allow dragging the card down
    if (snapPoint === 'FULL' && isScrolledDown && deltaY > 0) {
      return;
    }

    // Apply drag offset with resistance
    let offset = deltaY;
    if (snapPoint === 'FULL' && deltaY < 0) {
      // Top boundary resistance (can't drag higher than 88vh top limit)
      offset = deltaY * 0.2;
    }
    setDragOffsetY(offset);
    currentOffsetYRef.current = offset;
  };

  const handleTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    const finalDelta = currentOffsetYRef.current;
    const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = finalDelta / elapsed; // px per ms
    dragStartYRef.current = null;
    setIsDragging(false);

    // Gestural Snap & Dismiss Decisions
    if (snapPoint === 'PEEK') {
      if (finalDelta > 40 || velocity > 0.45) {
        handleClose();
      } else {
        if (finalDelta < -30) setSnapPoint('HALF');
        setDragOffsetY(0);
      }
    } else if (snapPoint === 'HALF') {
      if (finalDelta < -45 || (velocity < -0.4 && finalDelta < -20)) {
        // Dragged up significantly -> Expand to FULL
        setSnapPoint('FULL');
        setDragOffsetY(0);
      } else if (finalDelta > 55 || velocity > 0.45) {
        // Dragged down from HALF -> PEEK: the summary stays, the map is free again
        setSnapPoint('PEEK');
        setDragOffsetY(0);
      } else {
        setDragOffsetY(0);
      }
    } else if (snapPoint === 'FULL') {
      if (finalDelta > 160 || (velocity > 0.65 && finalDelta > 80)) {
        // Dragged down deeply from FULL -> Scroll down exit animation and close
        handleClose();
      } else if (finalDelta > 50 || velocity > 0.35) {
        // Dragged down moderately from FULL -> Snap back to HALF
        setSnapPoint('HALF');
        setDragOffsetY(0);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      } else {
        setDragOffsetY(0);
      }
    }
  };

  // Inner Content Scroll/Drag Handlers (Pull down to dismiss when at top)
  const handleContentTouchStart = (e: React.TouchEvent) => {
    const clientY = e.touches[0].clientY;
    dragStartYRef.current = clientY;
    dragStartTimeRef.current = Date.now();
    currentOffsetYRef.current = 0;
  };

  const handleContentTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - dragStartYRef.current;
    const scrollContainer = scrollContainerRef.current;

    // Only initiate sheet drag if at the very top of scroll container and dragging downward
    if (scrollContainer && scrollContainer.scrollTop <= 0 && deltaY > 0) {
      setIsDragging(true);
      setDragOffsetY(deltaY);
      currentOffsetYRef.current = deltaY;
    }
  };

  const handleContentTouchEnd = () => {
    if (isDragging) {
      handleTouchEnd();
    } else {
      dragStartYRef.current = null;
    }
  };

  // Background / Backdrop Gesture Handlers (detect downward scroll/swipe on background to dismiss)
  const handleBackdropTouchStart = (e: React.TouchEvent) => {
    const clientY = e.touches[0].clientY;
    dragStartYRef.current = clientY;
    dragStartTimeRef.current = Date.now();
    currentOffsetYRef.current = 0;
    setIsDragging(true);
  };

  const handleBackdropTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - dragStartYRef.current;
    if (deltaY > 0) {
      // Pulling card down from background
      setDragOffsetY(deltaY);
      currentOffsetYRef.current = deltaY;
    }
  };

  const handleBackdropTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    const finalDelta = currentOffsetYRef.current;
    const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = finalDelta / elapsed;
    dragStartYRef.current = null;
    setIsDragging(false);

    if (finalDelta > 40 || velocity > 0.35) {
      // Swiped/scrolled background down -> Dismiss card
      handleClose();
    } else {
      setDragOffsetY(0);
    }
  };

  // Background Wheel listener for desktop trackpad/mouse scroll down
  const handleBackdropWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 25) {
      // Scrolled down on background -> dismiss card
      handleClose();
    }
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
        onTouchStart={handleBackdropTouchStart}
        onTouchMove={handleBackdropTouchMove}
        onTouchEnd={handleBackdropTouchEnd}
        onWheel={handleBackdropWheel}
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
        ref={sheetRef}
        onClick={handleCardSurfaceClick}
        style={{
          transform: isClosing || isEntering
            ? 'translateY(100%)'
            : isDragging && dragOffsetY !== 0
            ? `translateY(${Math.max(-20, dragOffsetY)}px)`
            : 'translateY(0px)',
          opacity: isClosing ? 0 : 1
        }}
        className={`fixed sm:absolute z-40 sm:z-30 bg-[#0B0F19] border-t sm:border border-white/20 rounded-t-[36px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden text-slate-100 box-border inset-x-0 bottom-0 select-none will-change-transform ${
          isDragging
            ? 'transition-none'
            : isClosing
            ? 'transition-all duration-320 ease-[cubic-bezier(0.32,0,0.67,0)]'
            : 'transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]'
        } ${
          /* Max height snap point: 90vh on mobile so user has 90% full card view with full scrollability */
          snapPoint === 'PEEK'
            ? 'h-[116px] left-2! right-2! bottom-[calc(env(safe-area-inset-bottom)+88px)]! rounded-2xl! cursor-pointer sm:h-auto sm:left-auto! sm:top-4 sm:right-4! sm:bottom-24! sm:w-[420px] sm:rounded-[32px]!'
            : snapPoint === 'HALF'
            ? 'h-[48vh] min-h-[360px] max-h-[460px] cursor-pointer sm:h-auto sm:max-h-none sm:top-4 sm:right-4 sm:bottom-24 sm:w-[420px] sm:inset-x-auto'
            : 'h-[90vh] max-h-[90dvh] top-[10vh] sm:top-4 sm:right-4 sm:bottom-24 sm:w-[430px] sm:inset-x-auto sm:h-auto'
        }`}
      >
        {/* DRAG HANDLE BAR (TOUCH & POINTER GRAB ZONE) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onClick={toggleSnapPoint}
          className="w-full pt-2.5 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors shrink-0"
        >
          {/* Visual Pill Indicator */}
          <div className="w-14 h-1.5 bg-white/40 hover:bg-amber-400 rounded-full transition-all duration-200" />
          <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="px-4 pt-1 pb-2.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Circular Thumbnail Avatar */}
            <div className="relative shrink-0">
              <img
                src={report.photoUrl}
                alt={report.damageTypeLabel}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md shadow-amber-400/25"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=300';
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-white/30 flex items-center justify-center text-[9px]">
                📍
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-black text-sm sm:text-base text-white truncate leading-tight">
                {report.damageTypeLabel}
              </h3>
              <p className="text-xs text-slate-300 truncate font-medium mt-0.5">
                {report.segmentName}
              </p>
              <div className="flex items-center gap-1.5 text-[10.5px] mt-0.5 text-slate-400 font-medium truncate">
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
          <div className="flex items-center space-x-1.5 shrink-0">
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
          onTouchStart={handleContentTouchStart}
          onTouchMove={handleContentTouchMove}
          onTouchEnd={handleContentTouchEnd}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 custom-scrollbar select-text overscroll-contain"
        >
          {/* Quick Info Badges Row */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <div className="flex items-center gap-1 bg-[#171d2e] border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-300">
              <span>5.0</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-slate-400 font-mono">({reviews.length + report.upvotesCount})</span>
            </div>
            <button
              onClick={() => onUpvoteReport(report.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all border ${
                report.userUpvoted
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                  : 'bg-[#171d2e] hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{report.userUpvoted ? 'Telah Didukung' : 'Dukung Laporan'}</span>
            </button>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 truncate">
              GPS: {report.coordinates[0].toFixed(4)}, {report.coordinates[1].toFixed(4)}
            </span>
          </div>

          {/* Action Buttons Row: Upvote Button + Rute Navigasi Google Maps */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpvoteReport(report.id)}
              className={`py-2 px-3 rounded-2xl border text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                report.userUpvoted
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/30'
                  : 'bg-[#171d2e] hover:bg-[#1f273d] text-white border-white/10'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{report.userUpvoted ? 'Upvoted' : 'Upvote Laporan'}</span>
              <span className="font-mono text-[11px]">({report.upvotesCount})</span>
            </button>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${report.coordinates[0]},${report.coordinates[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-2xl bg-[#171d2e] hover:bg-[#1f273d] text-white border border-white/10 text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer truncate shadow-sm"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Rute Navigasi</span>
            </a>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="grid grid-cols-3 gap-1 bg-[#171d2e] p-1 rounded-2xl border border-white/10 text-xs w-full">
            <button
              onClick={() => setDetailsTab('COMPARISON')}
              className={`py-1.5 rounded-xl font-bold transition-all text-center truncate cursor-pointer ${
                detailsTab === 'COMPARISON'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Before/After
            </button>
            <button
              onClick={() => setDetailsTab('TELEMETRY')}
              className={`py-1.5 rounded-xl font-bold transition-all text-center truncate cursor-pointer ${
                detailsTab === 'TELEMETRY'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Telemetri AI
            </button>
            <button
              onClick={() => setDetailsTab('OVERVIEW')}
              className={`py-1.5 rounded-xl font-bold transition-all text-center truncate cursor-pointer ${
                detailsTab === 'OVERVIEW'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ringkasan
            </button>
          </div>

          {/* TAB 1: SIDE-BY-SIDE BEFORE & AFTER */}
          {detailsTab === 'COMPARISON' && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-2">
                {/* Before (Rusak) */}
                <div className="space-y-1.5">
                  <div className="relative rounded-2xl overflow-hidden border border-rose-500/40 bg-slate-950 aspect-video shadow-md">
                    <span className="absolute bottom-1 left-1 z-10 bg-slate-950/80 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {ILLUSTRATIVE_PHOTO_LABEL.id}
                    </span>
                    <img
                      src={report.photoUrl}
                      alt="Sebelum Perbaikan (Rusak)"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[8px] font-mono font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      SEBELUM (RUSAK)
                    </div>
                  </div>
                  <div className="bg-[#171d2e] p-2 rounded-xl border border-white/5 text-[10px] text-slate-300 flex justify-between items-center">
                    <span className="text-slate-400">Kedalaman:</span>
                    <span className="font-mono font-bold text-rose-400">{report.estimatedDepthCm} cm</span>
                  </div>
                </div>

                {/* After (Perbaikan) */}
                <div className="space-y-1.5">
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 aspect-video shadow-md">
                    <img
                      src={
                        report.repairDetails?.afterPhotoUrl ||
                        'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800'
                      }
                      alt="Sesudah Perbaikan (Mulus)"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800';
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-slate-950 text-[8px] font-mono font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                      SESUDAH (PERBAIKAN)
                    </div>
                  </div>
                  <div className="bg-[#171d2e] p-2 rounded-xl border border-white/5 text-[10px] text-slate-300 flex justify-between items-center">
                    <span className="text-slate-400">Target PCI:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {report.repairDetails?.repairedPciImprovement?.split('(')[0] || 'PCI 28 → 88'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Method Summary */}
              <div className="bg-[#171d2e] p-3 rounded-2xl border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-black text-emerald-300 text-xs truncate">
                      {isRepaired ? 'Telah Selesai Diperbaiki PUPR' : 'Standar Pemulihan Bina Marga'}
                    </span>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30 shrink-0">
                    {report.repairDetails?.repairedPciImprovement || 'PCI 28 → 88 (Mulus)'}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 border-t border-white/5 pt-2">
                  <p>
                    <span className="text-slate-400 font-semibold">Metode: </span>
                    <span className="font-medium text-slate-200">
                      {report.repairDetails?.repairMethod || 'Hotmix Asphalt Overlay & Patching AC-WC 6cm'}
                    </span>
                  </p>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    {report.repairDetails?.engineerNote ||
                      'Rekonstruksi aspal dan penanganan lubang telah diverifikasi Tim Bina Marga.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TELEMETRY & AI METRICS */}
          {detailsTab === 'TELEMETRY' && (
            <div className="space-y-2.5 animate-in fade-in duration-200 text-xs">
              {/* Computer Vision YOLOv8 */}
              <div className="bg-[#171d2e] p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">OpenVINO YOLOv8 Edge AI:</span>
                  <span className="font-extrabold text-emerald-400 font-mono flex items-center gap-1 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 94.2% Confidence
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-slate-400">Kedalaman Lubang:</p>
                    <p className="text-sm font-black text-rose-400 font-mono">{report.estimatedDepthCm} cm</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Luas Area Kerusakan:</p>
                    <p className="text-sm font-black text-amber-300 font-mono">{report.estimatedAreaM2} m²</p>
                  </div>
                </div>
              </div>

              {/* WIM Overload Correlation */}
              <div className="bg-[#171d2e] p-3 rounded-2xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">WIM Telemetry:</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold font-mono">
                    OVERLOAD +184%
                  </span>
                </div>
                <p className="text-xs font-bold text-white">Truk Terdeteksi: B 9281 KFU (Golongan V)</p>
                <p className="text-[10.5px] text-slate-300 leading-relaxed">
                  Muatan gandar 28.4 Ton melampaui batas izin 10.0 Ton. Akumulasi 142 truk/hari mempercepat fatik aspal.
                </p>
              </div>

              {/* PINN Physics Recommendation */}
              <div className="bg-[#171d2e] p-3 rounded-2xl border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PINN Recommendation:</span>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">Residual Life: 6.4 Thn</span>
                </div>
                <p className="text-xs font-extrabold text-amber-300">Tebal Overlay Dianjurkan: 8.5 cm AC-WC</p>
              </div>
            </div>
          )}

          {/* TAB 3: OVERVIEW & CITIZEN REVIEWS */}
          {detailsTab === 'OVERVIEW' && (
            <div className="space-y-3 animate-in fade-in duration-200 text-xs">
              {/* Location Card with Copy button */}
              <div className="space-y-1 bg-[#171d2e] p-3 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Lokasi:</span>
                  <button
                    onClick={handleCopyLocation}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLocation ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLocation ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs font-bold text-white">{report.segmentName}</p>
                <p className="text-[10.5px] text-slate-400">
                  {report.province} &bull; GPS: {report.coordinates[0].toFixed(4)}, {report.coordinates[1].toFixed(4)}
                </p>
              </div>

              {/* Reporter Info & Description */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between bg-[#171d2e] p-2.5 rounded-2xl border border-white/10">
                <span>Pelapor:</span>
                <span className="font-semibold text-slate-200 truncate ml-2">
                  {report.reporterName} &bull; {report.timestamp}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Deskripsi Masalah:</span>
                <p className="text-xs text-slate-300 bg-[#171d2e] p-3 rounded-2xl border border-white/10 italic leading-relaxed">
                  "{report.description}"
                </p>
              </div>

              {/* Community Reviews */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Ulasan Komunitas Warga</span>
                  <span className="text-xs text-slate-400 font-mono">{reviews.length} Ulasan</span>
                </div>

                {/* Reviews List */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1 divide-y divide-white/10">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="pt-2.5 first:pt-0 space-y-1.5 text-xs">
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
                            <span className="text-[10px] text-slate-400 font-mono">{rev.timeAgo}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-0.5">
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
                <div className="bg-[#171d2e] p-3 rounded-2xl border border-white/10 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Tulis Ulasan:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReviewRating(star)}
                          className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
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
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ulasan berhasil dikirim!
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={handleSubmitReview}
                      disabled={!newReviewText.trim()}
                      className="py-1.5 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center space-x-1 transition-all cursor-pointer ml-auto"
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
              className="w-full py-2 rounded-2xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <span>✏️ Edit Laporan Ini</span>
            </button>
          )}

          {/* Field Engineer Actions Card */}
          {isFieldEngineer && (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-amber-400" />
                  Otorisasi Insinyur Lapangan PUPR
                </span>
                <span className="text-[9px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                  RBAC-3
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (onEditReport) {
                      onEditReport({
                        ...report,
                        status: 'VERIFIED_BY_ENGINEER',
                        repairDetails: {
                          ...report.repairDetails,
                          repairMethod: 'Hotmix Asphalt Overlay AC-WC 6cm + Tack Coat',
                          engineerNote: `Diverifikasi di lapangan oleh ${currentAccount.name} (${currentAccount.nip}). Ruas dijadwalkan untuk penanganan hotmix.`,
                          repairedPciImprovement: 'PCI 30 → 90 (Kondisi Prima)'
                        }
                      });
                    }
                    alert(`Laporan ${report.id} berhasil DIVERIFIKASI RESMI oleh Insinyur Lapangan PUPR!`);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center space-x-1 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verifikasi</span>
                </button>

                <button
                  onClick={onOpenSPK}
                  className="py-2 px-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] flex items-center justify-center space-x-1 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Terbitkan SPK</span>
                </button>
              </div>
            </div>
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
              <Share2 className="w-3.5 h-3.5 shrink-0" />
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
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={() => onUpvoteReport(report.id)}
              className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition-all truncate ${
                report.userUpvoted
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-extrabold'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{report.userUpvoted ? 'Upvoted' : 'Upvote'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
