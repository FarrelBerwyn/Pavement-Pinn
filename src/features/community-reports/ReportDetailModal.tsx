import React, { useState } from 'react';
import {
  X,
  MapPin,
  ExternalLink,
  ThumbsUp,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  Edit3,
  Copy,
  Check,
  Eye
} from 'lucide-react';
import { DamageReport } from '../../types';
import { ILLUSTRATIVE_PHOTO_LABEL } from '../../data/provenance';
import { UserAccount } from '../authentication/demoAccounts';
import { canEditReport } from '../rbac/accessPolicy';
import { Language, TRANSLATIONS } from '../../i18n/translations';
import { reportPhotoCaption } from '../../domain/reports/datasetImages';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DamageReport | null;
  onUpvote?: (reportId: string) => void;
  onFocusMap?: (report: DamageReport) => void;
  onStartEdit?: (report: DamageReport) => void;
  currentAccount?: UserAccount;
  language?: Language;
  /** Workflow status/timeline (and role actions for staff), rendered by the page. */
  workflowPanel?: React.ReactNode;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  onUpvote,
  onFocusMap,
  onStartEdit,
  workflowPanel,
  currentAccount,
  language = 'id'
}) => {
  const [activePhotoView, setActivePhotoView] = useState<'BEFORE' | 'AFTER' | 'SIDE_BY_SIDE'>('SIDE_BY_SIDE');
  const [copiedLocation, setCopiedLocation] = useState<boolean>(false);

  if (!isOpen || !report) return null;

  const t = TRANSLATIONS[language];
  const isEn = language === 'en';

  const canEdit = canEditReport(currentAccount, report);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${report.coordinates[0]},${report.coordinates[1]}`;

  const handleCopyLocation = () => {
    const textToCopy = `${report.segmentName}, ${report.province} (${report.coordinates[0].toFixed(5)}, ${report.coordinates[1].toFixed(5)})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  const severityColors = {
    CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    SEVERE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    MODERATE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    LIGHT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  };

  const statusLabels = {
    PENDING: isEn ? 'Under Review' : 'Dalam Peninjauan & Verifikasi',
    VERIFIED_BY_ENGINEER: isEn ? 'Verified by Agency Engineer' : 'Diverifikasi Teknisi',
    SCHEDULED_FOR_REPAIR: isEn ? 'Scheduled for Roadwork' : 'Dijadwalkan Penanganan',
    REPAIRED: isEn ? 'Repaired & Cleared by PUPR' : 'Selesai Diperbaiki'
  };

  const statusBadges = {
    PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    VERIFIED_BY_ENGINEER: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    SCHEDULED_FOR_REPAIR: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    REPAIRED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    CLOSED: 'bg-slate-700/40 text-slate-300 border-slate-500/30'
  };

  // Actual after repair photo from F.E work completion (no fake stock replacement)
  const afterPhotoActual = report.repairDetails?.afterPhotoUrl;

  const repairDate =
    report.repairDetails?.repairDate || (isEn ? 'Not yet scheduled' : 'Belum dijadwalkan');
  const repairMethod =
    report.repairDetails?.repairMethod ||
    (isEn
      ? 'Cold-Mix / Hot-Mix Asphalt Patching + AC-WC 8.5 cm Overlay & Drainage Improvement'
      : 'Penambalan Lubang Cold-Mix / Hot-Mix + Overlay AC-WC 8.5 cm & Penataan Drainase');
  const pciImprovement =
    report.repairDetails?.repairedPciImprovement || (isEn ? 'PCI 28 → PCI 92 (Excellent Condition)' : 'PCI 28 → PCI 92 (Kondisi Sangat Mantap)');
  const agencyInCharge =
    report.repairDetails?.agencyInCharge || (isEn ? 'Responsible agency (not yet assigned)' : 'Instansi berwenang (belum ditetapkan)');
  const engineerNote =
    report.repairDetails?.engineerNote ||
    (isEn
      ? 'No engineer note recorded.'
      : 'Catatan petugas belum dicatat.');

  const isRepairedStatus = report.status === 'REPAIRED';

  return (
    <div className="fixed inset-0 z-[1400] bg-slate-950/85 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 pointer-events-auto overflow-y-auto">
      {/* Main Glassmorphism Card Container (Matched to Right-Side Recent Reports / Issue Details Card) */}
      <div className="bg-surface/98 border border-white/15 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 max-h-[92vh] overflow-y-auto my-auto relative font-sans custom-scrollbar">
        {/* Floating Top Bar / Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 font-semibold shrink-0 shadow-md ">
              <Camera className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {report.id}
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded-full border ${severityColors[report.severity]}`}>
                  {report.severity}
                </span>
                <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${statusBadges[report.status]}`}>
                  {report.status === 'REPAIRED' ? (isEn ? '🎉 Repair Completed' : '🎉 Selesai Perbaikan') : statusLabels[report.status]}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-white mt-1 leading-tight">
                {report.damageTypeLabel} &bull; {report.segmentName}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Edit Report Button (canEditReport: own session report, still PENDING) */}
            {canEdit && onStartEdit && (
              <button
                onClick={() => {
                  onClose();
                  onStartEdit(report);
                }}
                className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
                title="Edit Laporan Anda"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Laporan</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reporter Metadata & Timestamp Card */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-elevated border border-white/10 p-3 rounded-2xl text-xs">
          <div className="flex items-center space-x-3">
            {report.reporterAvatar && (
              <img src={report.reporterAvatar} alt={report.reporterName} className="w-8 h-8 rounded-full object-cover border border-amber-400/50" />
            )}
            <div>
              <p className="font-semibold text-white text-xs">{report.reporterName}</p>
              <p className="text-xs text-slate-400 font-mono">{report.reporterRole}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {report.timestamp}
            </span>
            <span className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full border border-cyan-500/30 font-bold">
              <ThumbsUp className="w-3 h-3 text-cyan-400" />
              {report.upvotesCount} {isEn ? 'Upvotes' : 'Dukungan Warga'}
            </span>
          </div>
        </div>

        {/* BEFORE & AFTER PHOTO COMPARISON SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                {t.beforeAfterComparison}
              </h3>
              {isRepairedStatus && (
                <span className="text-xs font-mono font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  {isEn ? '🎉 Repair Completed' : '🎉 Penanganan Selesai'}
                </span>
              )}
            </div>

            {/* View Mode Switcher Buttons */}
            <div className="flex items-center space-x-1 bg-elevated p-1 rounded-2xl border border-white/10 text-xs font-mono font-bold">
              <button
                onClick={() => setActivePhotoView('SIDE_BY_SIDE')}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  activePhotoView === 'SIDE_BY_SIDE'
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isEn ? 'Side-by-Side' : 'Komparasi 2 Kolom'}
              </button>
              <button
                onClick={() => setActivePhotoView('BEFORE')}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  activePhotoView === 'BEFORE'
                    ? 'bg-rose-500 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔴 {isEn ? 'Before' : 'Sebelum'}
              </button>
              <button
                onClick={() => setActivePhotoView('AFTER')}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  activePhotoView === 'AFTER'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🟢 {isEn ? 'After' : 'Sesudah'}
              </button>
            </div>
          </div>

          {/* Photos Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* BEFORE PHOTO */}
            {(activePhotoView === 'SIDE_BY_SIDE' || activePhotoView === 'BEFORE') && (
              <div className={`relative bg-elevated rounded-2xl overflow-hidden border border-rose-500/30 shadow-lg p-3 space-y-2 ${activePhotoView === 'BEFORE' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
                  <span className="font-semibold text-rose-400 flex items-center gap-1 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>🔴 {t.beforeLabel}</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400">{report.timestamp}</span>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-white/10 h-44 group">
                  <span className="absolute bottom-2 left-2 z-10 bg-slate-950/80 text-amber-300 text-xs font-bold px-2 py-1 rounded">
                    {reportPhotoCaption(report, ILLUSTRATIVE_PHOTO_LABEL[language])}
                  </span>
                  <img
                    src={report.photoUrl}
                    alt={t.beforeLabel}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 px-3 py-1 rounded-full text-xs font-mono font-bold text-rose-300 border border-rose-500/30">
                    {report.damageTypeLabel.split(' ')[0]} ({report.estimatedDepthCm} cm)
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-surface p-2 rounded-xl border border-white/5">
                  <div>
                    <span className="text-slate-400">Kedalaman:</span> <strong className="text-rose-300">{report.estimatedDepthCm} cm</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Luas Area:</span> <strong className="text-amber-300">{report.estimatedAreaM2} m²</strong>
                  </div>
                </div>
              </div>
            )}

            {/* AFTER PHOTO */}
            {(activePhotoView === 'SIDE_BY_SIDE' || activePhotoView === 'AFTER') && (
              <div className={`relative bg-elevated rounded-2xl overflow-hidden border border-emerald-500/30 shadow-lg p-3 space-y-2 ${activePhotoView === 'AFTER' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>🟢 {t.afterLabel}</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{afterPhotoActual ? repairDate : 'Menunggu Pengerjaan'}</span>
                </div>
                {afterPhotoActual ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 h-44 group">
                    <img
                      src={afterPhotoActual}
                      alt={t.afterLabel}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-slate-950/80 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30">
                      {repairMethod.split('+')[0] || 'Perbaikan Lapangan Selesai'}
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-dashed border-white/10 bg-surface/50 h-44 flex flex-col items-center justify-center p-4 text-center">
                    <Clock className="w-7 h-7 mb-2 text-slate-500" />
                    <p className="text-xs font-semibold text-slate-300">Belum ada bukti perbaikan</p>
                    <p className="text-[11px] text-slate-500 mt-1">Pekerjaan lapangan belum diselesaikan oleh Field Engineer (F.E)</p>
                  </div>
                )}
                <div className="text-xs font-mono bg-surface p-2 rounded-xl border border-white/5 text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Status: <strong className={afterPhotoActual ? 'text-emerald-300' : 'text-slate-400'}>{afterPhotoActual ? pciImprovement : 'Belum Ditangani'}</strong></span>
                  <span className="text-xs text-slate-400 truncate max-w-[160px]">{agencyInCharge.split('(')[0]}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location & GPS Info */}
        <div className="bg-elevated p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-amber-400" /> Lokasi & Koordinat Geospasial:
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyLocation}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedLocation ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLocation ? 'Tersalin' : 'Salin GPS'}</span>
              </button>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
              >
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <p className="font-semibold text-white leading-tight">{report.segmentName}</p>
          <p className="text-xs text-slate-400">
            {report.province} &bull; GPS: {report.coordinates[0].toFixed(5)}, {report.coordinates[1].toFixed(5)}
          </p>
        </div>

        {/* Description & Engineer Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs font-bold text-slate-400">Deskripsi Pelapor:</span>
            <p className="text-slate-300 italic leading-relaxed">"{report.description}"</p>
          </div>

          <div className="bg-elevated p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Tindak Lanjut Penanganan:
            </span>
            <p className="text-slate-300 leading-relaxed">{engineerNote}</p>
          </div>
        </div>

        {workflowPanel}

        {/* Dedicated WIM Correlation Box */}
        {report.wimCorrelation && (
          <div className="bg-elevated p-4 rounded-2xl border border-indigo-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold font-mono text-cyan-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400 animate-pulse" />
                KORELASI TELEMETRI SENSOR WEIGH-IN-MOTION (WIM):
              </span>
              <span className="bg-rose-500/20 text-rose-300 text-xs font-mono font-bold px-2 py-1 rounded-full border border-rose-500/30">
                OVERLOAD +{report.wimCorrelation.overloadPercent}%
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div>
                <span className="text-slate-400">Stasiun WIM:</span> <strong className="text-white">{report.wimCorrelation.stationName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Truk Terdeteksi:</span> <strong className="text-white">{report.wimCorrelation.recentTruckPlate}</strong> ({report.wimCorrelation.maxAxleLoadTon} Ton)
              </div>
            </div>
            <p className="text-indigo-200 text-xs leading-relaxed">
              💡 {report.wimCorrelation.causeAnalysisSummary}
            </p>
          </div>
        )}

        {/* ACTION FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          <button
            onClick={() => onUpvote && onUpvote(report.id)}
            className={`w-full sm:w-auto px-4 py-3 rounded-2xl font-semibold text-xs flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
              report.userUpvoted
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg '
                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>
              {report.userUpvoted
                ? (isEn ? 'Upvoted' : 'Dukungan Berhasil (Upvoted)')
                : `${isEn ? 'Upvote Report' : 'Dukung Laporan Ini'} (${report.upvotesCount})`}
            </span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {onFocusMap && (
              <button
                onClick={() => {
                  onFocusMap(report);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isEn ? 'Focus on Map' : 'Fokuskan ke Peta'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

