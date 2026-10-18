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

/* Calm look shared with the report sheet: solid surfaces, thin borders, one yellow accent. */
const UI_CARD = 'rounded-2xl border border-white/[0.08] bg-white/[0.03]';
const UI_FIELD =
  'w-full h-11 rounded-xl border border-white/[0.08] bg-surface px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70';
const UI_PRIMARY =
  'h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';
const UI_GHOST =
  'h-9 px-3 rounded-lg text-sm text-slate-300 hover:bg-white/[0.06] inline-flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';
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

  // Filtered reports list
  const filteredReports = reports.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchType = damageTypeFilter === 'ALL' || r.damageType === damageTypeFilter;
    const matchSearch =
      searchQuery === '' ||
      r.segmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.corridor.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchType && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Intro & quick numbers */}
      <section className={`${UI_CARD} p-5 sm:p-6 space-y-5`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold text-white">Laporan kerusakan jalan</h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Laporan dari warga. Setiap laporan diperiksa petugas sebelum ditindaklanjuti; data WIM yang ditampilkan adalah contoh (DEMO).
            </p>
            <p className="text-xs text-slate-500">
              {myReportsCount > 0
                ? `Anda punya ${myReportsCount} laporan${editableReportsCount > 0 ? `, ${editableReportsCount} masih bisa diedit` : ''}.`
                : 'Anda belum membuat laporan.'}
            </p>
          </div>
          <button onClick={() => setIsFormOpen(true)} className={`${UI_PRIMARY} shrink-0 px-5`}>
            <PlusCircle className="w-4 h-4" />
            <span>Laporkan kerusakan</span>
          </button>
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Total laporan', reports.length],
            ['Diverifikasi petugas', reports.filter((r) => r.status === 'VERIFIED_BY_ENGINEER' || r.status === 'SCHEDULED_FOR_REPAIR').length],
            ['Kritis / lubang', reports.filter((r) => r.severity === 'CRITICAL' || r.damageType === 'POTHOLE').length],
            ['Laporan saya', myReportsCount]
          ].map(([label, value]) => (
            <div key={label as string} className={`${UI_CARD} px-4 py-3`}>
              <dt className="text-xs text-slate-400">{label}</dt>
              <dd className="text-xl font-semibold text-white mt-1">{value}</dd>
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
          setIsFormOpen(false);
          const seg = roadSegments.find((s) => {
            const dist = Math.hypot(s.coordinates[0] - coords[0], s.coordinates[1] - coords[1]);
            return dist < 0.3;
          }) || roadSegments[0];
          onSelectSegmentForMap(seg.id);
        }}
      />

      {/* Filters & search */}
      <section className={`${UI_CARD} p-3 flex flex-col md:flex-row md:items-center gap-3`}>
        <label className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="sr-only">Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={UI_FIELD}>
            <option value="ALL">Semua status ({reports.length})</option>
            <option value="PENDING">Menunggu verifikasi</option>
            <option value="VERIFIED_BY_ENGINEER">Diverifikasi petugas</option>
            <option value="SCHEDULED_FOR_REPAIR">Dijadwalkan</option>
            <option value="REPAIRED">Selesai diperbaiki</option>
            <option value="CLOSED">Ditutup</option>
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
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari lokasi, jalan, pelapor"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${UI_FIELD} pl-10`}
          />
        </label>
      </section>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredReports.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-400 py-10">Tidak ada laporan yang cocok dengan filter.</p>
        )}
        {filteredReports.map((report) => {
          const isMyReport = report.creatorAccountId === currentAccount.id;
          const canEdit = canEditReport(currentAccount, report);

          return (
            <article
              key={report.id}
              onClick={() => setSelectedDetailReport(report)}
              className={`${UI_CARD} overflow-hidden flex flex-col cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.14] transition-colors`}
            >
              <div className="relative aspect-[16/10] bg-white/[0.03]">
                <img src={report.photoUrl} alt={report.damageTypeLabel} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs text-slate-100 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[report.severity] ?? 'bg-slate-400'}`} />
                  {SEVERITY_LABEL[report.severity] ?? report.severity}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{report.segmentName}</h3>
                    <p className="text-xs text-slate-400 truncate">{report.damageTypeLabel} · {report.province}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/[0.1] px-3 py-1 text-xs text-slate-300">
                    {STATUS_LABEL[report.status] ?? report.status}
                  </span>
                </div>

                {report.description && <p className="text-sm text-slate-300 line-clamp-2">{report.description}</p>}

                {report.wimCorrelation && (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs text-slate-400">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Truck className="w-4 h-4 text-amber-400" />
                      Contoh data WIM (DEMO)
                    </span>
                    <span className="block mt-1">
                      Beban sumbu maks {report.wimCorrelation.maxAxleLoadTon} t · lebih {report.wimCorrelation.overloadPercent}%
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-auto pt-1">
                  <img
                    src={report.reporterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <p className="text-xs text-slate-400 truncate min-w-0 flex-1">
                    {report.reporterName}
                    {isMyReport && <span className="text-amber-300"> · Anda</span>}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/[0.06] px-2 py-2 flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpvoteReport(report.id);
                  }}
                  aria-pressed={!!report.userUpvoted}
                  className={`${UI_GHOST} ${report.userUpvoted ? 'text-amber-300' : ''}`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{report.upvotesCount}</span>
                </button>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(report);
                    }}
                    className={UI_GHOST}
                    title="Edit laporan Anda"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSegmentForMap(report.segmentId);
                  }}
                  className={`${UI_GHOST} ml-auto text-amber-300`}
                >
                  <span>Lihat di peta</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
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
