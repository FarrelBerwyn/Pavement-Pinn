import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Send,
  Truck,
  ThumbsUp,
  MapPin,
  Layers,
  Sparkles,
  Info,
  Eye,
  PenTool,
  PlusCircle,
  Filter,
  Search,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  ShieldCheck,
  Edit3,
  Check,
  X
} from 'lucide-react';
import {
  DamageReport,
  DamageType,
  ReportSeverity,
  ReportStatus,
  RoadSegment,
  UserRole,
  ReportMutationHandler
} from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import { ALL_BINA_MARGA_WIM_STATIONS } from '../../data/reference/indonesianRoads';
import { ReportDetailModal } from './ReportDetailModal';
import { resolveLiveReport } from './reportState';
import { createSessionReport, ReportCreationError } from './reportFactory';
import { settleMutation } from './reportMutations';
import { canEditReport } from '../rbac/accessPolicy';
import { ReportRoadIssueCard } from './ReportRoadIssueCard';
import {
  canonicalStatusOfReport,
  CANONICAL_STATUS_META
} from '../../domain/workflow/canonicalStatus';

interface CommunityReportsDashboardProps {
  activeRole: UserRole;
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  reports: DamageReport[];
  onAddReport: ReportMutationHandler;
  onEditReport?: ReportMutationHandler;
  /** Renders the workflow panel for a report (tracking timeline, staff actions). */
  renderWorkflowPanel?: (reportId: string) => React.ReactNode;
  onUpvoteReport: (reportId: string) => void;
  onSelectSegmentForMap: (segmentId: string) => void;
  onRunSimulationForSegment: (segment: RoadSegment) => void;
}

/* Single Source of Truth design system tokens matching Operations Manager (M.O) */
const UI_CARD = 'rounded-panel border border-line-subtle bg-panel';
const UI_FIELD =
  'w-full h-9 rounded-control border border-line-subtle bg-card px-3 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-[#E8B52B]';
const UI_PRIMARY =
  'h-9 rounded-control bg-[#E8B52B] hover:bg-[#F3C442] text-slate-950 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B52B]/60';
const UI_GHOST =
  'h-7 px-2 rounded-control text-[11px] font-medium text-ink-2 hover:bg-raised hover:text-ink border border-line-subtle bg-card inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B52B]/60';
const SEVERITY_LABEL: Record<string, string> = { LIGHT: 'Ringan', MODERATE: 'Sedang', SEVERE: 'Berat', CRITICAL: 'Kritis' };
const SEVERITY_DOT: Record<string, string> = { LIGHT: 'bg-emerald-400', MODERATE: 'bg-amber-400', SEVERE: 'bg-orange-400', CRITICAL: 'bg-red-400' };
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  VERIFIED_BY_ENGINEER: 'Diverifikasi',
  SCHEDULED_FOR_REPAIR: 'Dijadwalkan',
  REPAIRED: 'Selesai',
  CLOSED: 'Ditutup'
};

export const CommunityReportsDashboard: React.FC<CommunityReportsDashboardProps> = ({
  activeRole,
  currentAccount,
  roadSegments,
  reports,
  onAddReport,
  onEditReport,
  renderWorkflowPanel,
  onUpvoteReport,
  onSelectSegmentForMap,
  onRunSimulationForSegment
}) => {
  // Detail & Before/After Comparison Modal State
  const [selectedDetailReport, setSelectedDetailReport] = useState<DamageReport | null>(null);

  // Edit Report Modal State
  const [editingReport, setEditingReport] = useState<DamageReport | null>(null);

  // Modal / Form state for creating report
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(roadSegments[0]?.id || '');
  const [damageType, setDamageType] = useState<DamageType>('POTHOLE');
  const [severity, setSeverity] = useState<ReportSeverity>('SEVERE');
  const [estimatedDepthCm, setEstimatedDepthCm] = useState<number>(12);
  const [estimatedAreaM2, setEstimatedAreaM2] = useState<number>(4.5);
  const [description, setDescription] = useState<string>('');
  const [photoPresetIndex, setPhotoPresetIndex] = useState<number>(0);

  // Edit form state
  const [editDamageType, setEditDamageType] = useState<DamageType>('POTHOLE');
  const [editSeverity, setEditSeverity] = useState<ReportSeverity>('SEVERE');
  const [editDepthCm, setEditDepthCm] = useState<number>(12);
  const [editAreaM2, setEditAreaM2] = useState<number>(4.5);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPhotoPresetIndex, setEditPhotoPresetIndex] = useState<number>(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [damageTypeFilter, setDamageTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sample photo presets for rapid community reporting
  const PHOTO_PRESETS = [
    {
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
      label: 'Lubang Dalam (Pothole)'
    },
    {
      url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
      label: 'Ambles & Rutting'
    },
    {
      url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600',
      label: 'Retak Buaya Kritis'
    }
  ];

  // Selected segment object for WIM auto-correlation
  const currentSelectedSegment = roadSegments.find((s) => s.id === selectedSegmentId) || roadSegments[0];

  // Find associated WIM station for this segment

  // Reports created by this demo account (by account id, not display name) and those it may still edit
  const myReportsCount = reports.filter((r) => r.creatorAccountId === currentAccount.id).length;
  const editableReportsCount = reports.filter((r) => canEditReport(currentAccount, r)).length;

  // Open edit dialog with prefilled data
  const handleOpenEdit = (report: DamageReport) => {
    if (!canEditReport(currentAccount, report)) return;
    setEditingReport(report);
    setEditDamageType(report.damageType);
    setEditSeverity(report.severity);
    setEditDepthCm(report.estimatedDepthCm);
    setEditAreaM2(report.estimatedAreaM2);
    setEditDescription(report.description);
    const photoIdx = PHOTO_PRESETS.findIndex((p) => p.url === report.photoUrl);
    setEditPhotoPresetIndex(photoIdx >= 0 ? photoIdx : 0);
  };

  // Handle Edit Submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !onEditReport) return;
    // Same ownership rule as the edit button; a stale dialog saves nothing.
    if (!canEditReport(currentAccount, editingReport)) {
      setEditingReport(null);
      return;
    }

    const damageLabels: Record<DamageType, string> = {
      POTHOLE: 'Lubang Dalam (Pothole)',
      ALLIGATOR_CRACK: 'Retak Buaya (Alligator Cracking)',
      RUTTING: 'Ambles & Deformasi Alur (Rutting)',
      CORRUGATION: 'Kerusakan Gelombang (Corrugation)',
      SUBSIDENCE: 'Penurunan Pondasi (Subsidence)',
      CRACK: 'Retak Permukaan (Surface Crack)',
      SURFACE_DAMAGE: 'Kerusakan Permukaan (Surface Damage)',
      ROAD_DEFORMATION: 'Deformasi Jalan (Road Deformation)',
      DEPRESSION: 'Ambles Lokal (Depression)',
      PATCHING: 'Tambalan (Patching)'
    };

    const updated: DamageReport = {
      ...editingReport,
      damageType: editDamageType,
      damageTypeLabel: damageLabels[editDamageType],
      severity: editSeverity,
      estimatedDepthCm: Number(editDepthCm),
      estimatedAreaM2: Number(editAreaM2),
      description: editDescription,
      photoUrl: PHOTO_PRESETS[editPhotoPresetIndex]?.url || editingReport.photoUrl
    };

    const outcome = await settleMutation(onEditReport(updated), updated);
    if (outcome.ok === false) {
      alert(`Perubahan belum tersimpan: ${(outcome as { error: string }).error}`);
      return;
    }
    setEditingReport(null);
  };

  // Handle Form Submission for New Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Mohon isi deskripsi catatan kerusakan jalan!');
      return;
    }

    const damageLabels: Record<DamageType, string> = {
      POTHOLE: 'Lubang Dalam (Pothole)',
      ALLIGATOR_CRACK: 'Retak Buaya (Alligator Cracking)',
      RUTTING: 'Ambles & Deformasi Alur (Rutting)',
      CORRUGATION: 'Kerusakan Gelombang (Corrugation)',
      SUBSIDENCE: 'Penurunan Pondasi (Subsidence)',
      CRACK: 'Retak Permukaan (Surface Crack)',
      SURFACE_DAMAGE: 'Kerusakan Permukaan (Surface Damage)',
      ROAD_DEFORMATION: 'Deformasi Jalan (Road Deformation)',
      DEPRESSION: 'Ambles Lokal (Depression)',
      PATCHING: 'Tambalan (Patching)'
    };

    let newReport: DamageReport;
    try {
      newReport = createSessionReport({
      reporterName: currentAccount.name,
      reporterRole:
        activeRole === 'PUBLIC_REPORTER'
          ? 'Pelapor Masyarakat Terverifikasi'
          : activeRole === 'PUBLIC_VIEWER'
          ? 'Pengamat Komunitas'
          : 'Petugas Lapangan',
      reporterAvatar: currentAccount.avatarUrl,
      timestamp: new Date().toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      segmentId: currentSelectedSegment.id,
      segmentName: currentSelectedSegment.name,
      corridor: currentSelectedSegment.corridor,
      province: currentSelectedSegment.province,
      coordinates: currentSelectedSegment.coordinates,
      damageType: damageType,
      damageTypeLabel: damageLabels[damageType],
      severity: severity,
      estimatedDepthCm: Number(estimatedDepthCm),
      estimatedAreaM2: Number(estimatedAreaM2),
      photoUrl: PHOTO_PRESETS[photoPresetIndex].url,
      description: description,
      upvotesCount: 1,
      userUpvoted: true
      // No repairDetails: the "after" photo comes only from the F.E repair evidence.
      }, currentAccount);
    } catch (error) {
      if (error instanceof ReportCreationError) {
        alert(error.message);
        return;
      }
      throw error;
    }

    const outcome = await settleMutation(onAddReport(newReport), newReport);
    if (outcome.ok === false) {
      alert(`Laporan belum tersimpan: ${(outcome as { error: string }).error}`);
      return;
    }
    setIsFormOpen(false);
    setDescription('');
  };

  // Filtered reports list (supports both canonical status keys and raw report statuses)
  const filteredReports = reports.filter((r) => {
    const statusKey = canonicalStatusOfReport(r);
    const matchStatus =
      statusFilter === 'ALL' ||
      r.status === statusFilter ||
      statusKey === statusFilter;
    const matchType = damageTypeFilter === 'ALL' || r.damageType === damageTypeFilter;
    const matchSearch =
      searchQuery === '' ||
      r.segmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.corridor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchType && matchSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Intro & quick numbers */}
      <section className={`${UI_CARD} p-4 sm:p-5 space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base sm:text-lg font-semibold text-ink">Laporan kerusakan jalan</h2>
            <p className="text-xs sm:text-sm text-ink-2 max-w-2xl">
              Laporan dari warga. Setiap laporan diperiksa petugas sebelum ditindaklanjuti.
            </p>
            <p className="text-[11px] text-ink-3">
              {myReportsCount > 0
                ? `Anda punya ${myReportsCount} laporan${editableReportsCount > 0 ? `, ${editableReportsCount} masih bisa diedit` : ''}.`
                : 'Anda belum membuat laporan.'}
            </p>
          </div>
          <button onClick={() => setIsFormOpen(true)} className={`${UI_PRIMARY} shrink-0 px-4`}>
            <PlusCircle className="w-4 h-4" />
            <span>Laporkan kerusakan</span>
          </button>
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            ['Total laporan', reports.length],
            ['Diverifikasi petugas', reports.filter((r) => r.status === 'VERIFIED_BY_ENGINEER' || r.status === 'SCHEDULED_FOR_REPAIR').length],
            // Severity here is the reporter's own estimate; verified severity comes from the F.E inspection.
            ['Kritis / lubang · dilaporkan warga', reports.filter((r) => r.severity === 'CRITICAL' || r.damageType === 'POTHOLE').length],
            ['Laporan saya', myReportsCount]
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-card border border-line-subtle bg-card px-3.5 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-xs text-ink-3 font-medium">{label}</dt>
              <dd className="text-xl sm:text-2xl font-semibold text-ink mt-0.5 font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* EDIT MODAL / FORM */}
      {editingReport && (
        <div className="fixed inset-0 z-[1450] bg-slate-950/85 flex items-center justify-center p-4">
          <div className="bg-surface/98 border border-white/15 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[92vh] overflow-y-auto animate-fadeIn custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-400 text-slate-950 font-semibold rounded-2xl shadow-md ">
                  <Edit3 className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Edit Laporan Kerusakan: {editingReport.id}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Ruas: <strong className="text-cyan-300">{editingReport.segmentName}</strong> ({editingReport.province})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingReport(null)}
                className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="font-bold text-slate-200">Jenis Kerusakan Jalan:</label>
                  <select
                    value={editDamageType}
                    onChange={(e) => setEditDamageType(e.target.value as DamageType)}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="POTHOLE">Lubang Dalam (Pothole)</option>
                    <option value="ALLIGATOR_CRACK">Retak Buaya (Alligator Cracking)</option>
                    <option value="RUTTING">Ambles & Deformasi Alur (Rutting)</option>
                    <option value="CORRUGATION">Kerusakan Gelombang (Corrugation)</option>
                    <option value="SUBSIDENCE">Penurunan Pondasi (Subsidence)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-200">Tingkat Keparahan Bahaya:</label>
                  <select
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value as ReportSeverity)}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="LIGHT">Ringan (Tidak Membahayakan)</option>
                    <option value="MODERATE">Sedang (Perlu Kehati-hatian)</option>
                    <option value="SEVERE">Parah (Risiko Banting Setir)</option>
                    <option value="CRITICAL">Sangat Kritis (Risiko Kecelakaan Tinggi)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="font-bold text-slate-200">Estimasi Kedalaman (cm):</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editDepthCm}
                    onChange={(e) => setEditDepthCm(Number(e.target.value))}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-slate-200">Estimasi Luas Area (m²):</label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={100}
                    value={editAreaM2}
                    onChange={(e) => setEditAreaM2(Number(e.target.value))}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Photo Preset Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-200 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  Foto Lampiran Lapangan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setEditPhotoPresetIndex(idx)}
                      className={`cursor-pointer rounded-xl border p-1 transition-all ${
                        editPhotoPresetIndex === idx
                          ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50'
                          : 'border-white/10 bg-elevated opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-16 object-cover rounded-lg mb-1" />
                      <p className="text-xs font-bold text-center text-slate-300 truncate">{preset.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Deskripsi */}
              <div className="space-y-2">
                <label className="font-bold text-slate-200">Deskripsi Detail Kerusakan & Dampak:</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-elevated border border-white/15 text-white rounded-xl p-3 focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold flex items-center space-x-2 shadow-lg cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Laporan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL: Report Road Issue Card with Computer Vision & Progress Bar */}
      <ReportRoadIssueCard
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        currentAccount={currentAccount}
        roadSegments={roadSegments}
        selectedSegment={currentSelectedSegment}
        onAddReport={async (newRep) => {
          const outcome = await settleMutation(onAddReport(newRep), newRep);
          if (outcome.ok) setIsFormOpen(false);
          return outcome;
        }}
        onFocusMapLocation={(coords) => {
          const seg = roadSegments.find((s) => {
            const dist = Math.hypot(s.coordinates[0] - coords[0], s.coordinates[1] - coords[1]);
            return dist < 0.3;
          }) || roadSegments[0];
          onSelectSegmentForMap(seg.id);
        }}
      />

      {/* Filters & search */}
      <section className={`${UI_CARD} p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center gap-2.5 sm:gap-3`}>
        <label className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#E8B52B] shrink-0" />
          <span className="sr-only">Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={UI_FIELD}>
            <option value="ALL">Semua status ({reports.length})</option>
            <option value="MENUNGGU_PENINJAUAN">Menunggu Peninjauan</option>
            <option value="BELUM_DITUGASKAN">Belum Ditugaskan</option>
            <option value="MENUNGGU_FE">SPK Ditugaskan (Menunggu F.E)</option>
            <option value="SEDANG_DIKERJAKAN">Sedang Dikerjakan</option>
            <option value="MENUNGGU_VERIFIKASI">Bukti Masuk / Menunggu Verifikasi</option>
            <option value="SELESAI">Selesai</option>
            <option value="PENDING">Menunggu (Raw PENDING)</option>
            <option value="VERIFIED_BY_ENGINEER">Diverifikasi Petugas</option>
          </select>
        </label>
        <label className="w-full md:w-auto">
          <span className="sr-only">Jenis kerusakan</span>
          <select value={damageTypeFilter} onChange={(e) => setDamageTypeFilter(e.target.value)} className={UI_FIELD}>
            <option value="ALL">Semua jenis</option>
            <option value="POTHOLE">Lubang</option>
            <option value="ALLIGATOR_CRACK">Retak buaya</option>
            <option value="RUTTING">Alur / ambles</option>
            <option value="CORRUGATION">Bergelombang</option>
            <option value="SUBSIDENCE">Penurunan</option>
          </select>
        </label>
        <label className="relative w-full md:w-72 md:ml-auto">
          <span className="sr-only">Cari</span>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari lokasi, jalan, pelapor"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${UI_FIELD} pl-9`}
          />
        </label>
      </section>

      {/* Report cards: 5 columns on wide desktop (>= 1600px / 2xl), 4 on xl, 2 on md, 1 on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5 min-w-0">
        {filteredReports.length === 0 && (
          <p className="col-span-full text-center text-sm text-ink-3 py-10">Tidak ada laporan yang cocok dengan filter.</p>
        )}
        {filteredReports.map((report) => {
          const isMyReport = report.creatorAccountId === currentAccount.id;
          const canEdit = canEditReport(currentAccount, report);
          const statusKey = canonicalStatusOfReport(report);
          const statusMeta = CANONICAL_STATUS_META[statusKey];
          const afterPhoto = report.repairDetails?.afterPhotoUrl;
          const isVerifiedDone = statusKey === 'SELESAI' || !!report.repairDetails?.verified;

          return (
            <article
              key={report.id}
              onClick={() => setSelectedDetailReport(report)}
              className="rounded-card border border-line-subtle bg-panel overflow-hidden flex flex-col justify-between cursor-pointer hover:bg-card hover:border-line-active transition-all p-3 sm:p-3.5 gap-2.5 shadow-sm min-w-0 group"
            >
              {/* Top content wrapper */}
              <div className="space-y-2 min-w-0">
                {/* A. HEADER: ID & CANONICAL STATUS */}
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <span
                    className="font-mono text-[10px] font-semibold text-ink-3 bg-card border border-line-subtle px-1.5 py-0.5 rounded truncate max-w-[125px] shrink-0"
                    title={report.id}
                  >
                    {report.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 max-w-[150px] truncate ${statusMeta.badgeClass}`}
                    title={statusMeta.label}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusMeta.dotColor}`} />
                    <span className="truncate">{statusMeta.label}</span>
                  </span>
                </div>

                {/* B. JENIS KERUSAKAN */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[report.severity] ?? 'bg-slate-400'}`} />
                    <h3 className="text-[13px] font-semibold text-ink truncate min-w-0 flex-1">
                      {report.damageTypeLabel}
                    </h3>
                    <span className="text-[11px] text-ink-3 shrink-0">
                      · {SEVERITY_LABEL[report.severity] ?? report.severity}
                    </span>
                  </div>

                  {/* C. LOKASI */}
                  <p
                    className="flex items-start gap-1 text-[11px] text-ink-2 leading-tight min-w-0"
                    title={`${report.segmentName} ${report.corridor ? `(${report.corridor})` : ''}`}
                  >
                    <MapPin className="w-3 h-3 text-ink-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {report.segmentName}
                      {report.corridor && <span className="text-ink-3"> ({report.corridor})</span>}
                    </span>
                  </p>

                  {/* D. DESKRIPSI */}
                  {report.description && (
                    <p
                      className="text-[11px] text-ink-3 italic line-clamp-2 leading-relaxed pt-0.5"
                      title={report.description}
                    >
                      “{report.description}”
                    </p>
                  )}
                </div>

                {/* E. BUKTI SEBELUM DAN SESUDAH (ASPECT 4:3) */}
                <div className="space-y-1 pt-1.5 border-t border-line-subtle min-w-0">
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-medium text-ink-3">
                    <span className="truncate">Bukti Kerusakan</span>
                    <span className="truncate text-right">Bukti Perbaikan</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Foto Sebelum */}
                    <div className="relative rounded-control overflow-hidden border border-line-subtle bg-card/60 aspect-[4/3] group/img">
                      <img
                        src={report.photoUrl}
                        alt="Bukti kerusakan sebelum"
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-medium text-rose-300">
                        Sebelum
                      </span>
                    </div>

                    {/* Foto Sesudah / Placeholder */}
                    {afterPhoto ? (
                      <div className="relative rounded-control overflow-hidden border border-emerald-500/30 bg-card/60 aspect-[4/3] group/img">
                        <img
                          src={afterPhoto}
                          alt="Bukti setelah perbaikan"
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        <span
                          className={`absolute bottom-1 left-1 rounded px-1 py-0.2 text-[9px] font-medium ${
                            isVerifiedDone
                              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-950/90 text-indigo-200 border border-indigo-500/30'
                          }`}
                        >
                          {isVerifiedDone ? '✓ Selesai' : '● Menunggu Verifikasi'}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-control border border-dashed border-line-subtle bg-card/30 flex flex-col items-center justify-center p-1 text-center text-ink-3 aspect-[4/3]">
                        <Clock className="w-3.5 h-3.5 mb-0.5 text-ink-3" />
                        <span className="text-[10px] font-medium text-ink-2 leading-tight">
                          Belum ada bukti perbaikan
                        </span>
                        <span className="text-[9px] text-ink-3 mt-0.5 leading-tight">
                          Menunggu pekerjaan F.E
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* WIM Correlation badge */}
                {report.wimCorrelation && (
                  <div className="rounded-control bg-card/50 border border-line-subtle px-2 py-1 text-[10px] text-ink-3 flex items-center gap-1.5">
                    <Truck className="w-3 h-3 text-[#E8B52B] shrink-0" />
                    <span className="truncate">
                      WIM: Beban {report.wimCorrelation.maxAxleLoadTon} t (lebih {report.wimCorrelation.overloadPercent}%)
                    </span>
                  </div>
                )}
              </div>

              {/* F. FOOTER: METADATA & AKSI */}
              <div className="space-y-2 pt-1 border-t border-line-subtle min-w-0 mt-auto">
                <div className="flex items-center gap-1.5 text-[10px] text-ink-3 min-w-0">
                  {report.reporterAvatar && <img src={report.reporterAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />}
                  <span className="truncate flex-1 text-ink-2">
                    {report.reporterName}
                    {!report.origin && <span className="ml-1 rounded border border-violet-400/40 px-1 text-[9px] font-semibold text-violet-200">DATA CONTOH</span>}
                    {isMyReport && <b className="text-[#E8B52B] font-semibold"> (Anda)</b>}
                  </span>
                  <span className="shrink-0 font-mono text-ink-3">
                    {report.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpvoteReport(report.id);
                    }}
                    aria-pressed={!!report.userUpvoted}
                    className={`h-7 px-2 rounded-control text-[11px] font-medium border border-line-subtle bg-card hover:bg-raised text-ink-2 hover:text-ink inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      report.userUpvoted ? 'text-[#E8B52B] border-[#E8B52B]/40' : ''
                    }`}
                    title="Dukung / upvote laporan ini"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{report.upvotesCount}</span>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(report);
                      }}
                      className="h-7 px-2 rounded-control text-[11px] font-medium border border-line-subtle bg-card hover:bg-raised text-ink-2 hover:text-ink inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit laporan Anda"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSegmentForMap(report.segmentId);
                    }}
                    className="h-7 px-2 rounded-control text-[11px] font-medium border border-line-subtle bg-card hover:bg-raised text-[#E8B52B] hover:text-[#F3C442] inline-flex items-center gap-1 ml-auto transition-colors cursor-pointer"
                    title="Lihat lokasi di peta"
                  >
                    <span>Lihat di peta</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Report Detail & Before/After Comparison Modal */}
      <ReportDetailModal
        isOpen={!!selectedDetailReport}
        onClose={() => setSelectedDetailReport(null)}
        report={resolveLiveReport(selectedDetailReport, reports)}
        onUpvote={onUpvoteReport}
        onStartEdit={(rep) => handleOpenEdit(rep)}
        currentAccount={currentAccount}
        workflowPanel={selectedDetailReport && renderWorkflowPanel ? renderWorkflowPanel(selectedDetailReport.id) : null}
        onFocusMap={(rep) => {
          setSelectedDetailReport(null);
          onSelectSegmentForMap(rep.segmentId);
        }}
      />
    </div>
  );
};
