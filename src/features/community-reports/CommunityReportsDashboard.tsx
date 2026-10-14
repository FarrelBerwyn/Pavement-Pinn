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
  UserRole
} from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import { ALL_BINA_MARGA_WIM_STATIONS } from '../../data/reference/indonesianRoads';
import { ReportDetailModal } from './ReportDetailModal';
import { ReportRoadIssueCard } from './ReportRoadIssueCard';

interface CommunityReportsDashboardProps {
  activeRole: UserRole;
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  reports: DamageReport[];
  onAddReport: (newReport: DamageReport) => void;
  onEditReport?: (updatedReport: DamageReport) => void;
  onUpvoteReport: (reportId: string) => void;
  onSelectSegmentForMap: (segmentId: string) => void;
  onRunSimulationForSegment: (segment: RoadSegment) => void;
}

export const CommunityReportsDashboard: React.FC<CommunityReportsDashboardProps> = ({
  activeRole,
  currentAccount,
  roadSegments,
  reports,
  onAddReport,
  onEditReport,
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
  const matchedWimStation =
    ALL_BINA_MARGA_WIM_STATIONS.find(
      (wim) =>
        (currentSelectedSegment && wim.corridor.toLowerCase().includes(currentSelectedSegment.corridor.toLowerCase().split(' ')[0])) ||
        (currentSelectedSegment && wim.province === currentSelectedSegment.province)
    ) || ALL_BINA_MARGA_WIM_STATIONS[0];

  // Count reports created by current user
  const myReportsCount = reports.filter((r) => r.reporterName === currentAccount.name).length;

  // Open edit dialog with prefilled data
  const handleOpenEdit = (report: DamageReport) => {
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
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !onEditReport) return;

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

    onEditReport(updated);
    setEditingReport(null);
  };

  // Handle Form Submission for New Report
  const handleSubmitReport = (e: React.FormEvent) => {
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

    const newReport: DamageReport = {
      id: `REP-${Date.now().toString().slice(-6)}`,
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
      status: 'PENDING',
      upvotesCount: 1,
      userUpvoted: true,
      repairDetails: {
        afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800',
        repairDate: 'Proyeksi Restorasi PUPR',
        repairMethod: 'Hotmix Asphalt Overlay & Patching AC-WC 6cm',
        repairedPciImprovement: 'Target: PCI >85 (Mulus)',
        engineerNote: 'Standar perbaikan rekonstruksi perkerasan jalan terverifikasi Bina Marga.',
        agencyInCharge: 'Dinas PUPR & BBPJN'
      },
      wimCorrelation: {
        hasWimData: true,
        stationId: matchedWimStation.stationId,
        stationName: matchedWimStation.stationName,
        corridor: matchedWimStation.corridor,
        recentTruckPlate: matchedWimStation.licensePlate,
        recentTruckClass: matchedWimStation.vehicleClass,
        maxAxleLoadTon: matchedWimStation.maxAxleLoadTon,
        legalLimitTon: matchedWimStation.legalLimitTon,
        overloadPercent: matchedWimStation.overloadPercent,
        overloadCategory: matchedWimStation.overloadCategory || 'EXTREME',
        correlatedOverloadTrucksCount: Math.floor(110 + Math.random() * 120),
        estimatedPinnContributionPercent: Math.floor(72 + Math.random() * 20),
        causeAnalysisSummary: `Korelasi PINN & WIM Otomatis: Kerusakan di ${currentSelectedSegment.name} dipercepat hingga ${Math.floor(72 + Math.random() * 20)}% oleh beban terdeteksi kendaraan ${matchedWimStation.vehicleClass} (${matchedWimStation.licensePlate}) berbeban ${matchedWimStation.maxAxleLoadTon} Ton (+${matchedWimStation.overloadPercent}% Overload) dari Stasiun WIM ${matchedWimStation.stationName}.`
      }
    };

    onAddReport(newReport);
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
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Public Role Controls */}
      <div className="bg-[#121622]/95 border border-white/15 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3.5 bg-amber-400 text-slate-950 font-black rounded-2xl shadow-md shadow-amber-400/20 shrink-0">
              <Camera className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  Partisipasi Komunitas & Pelaporan Jalan
                </span>
                {activeRole === 'PUBLIC_REPORTER' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    User 1 (Budi Santoso): Bisa Lapor & Edit Laporannya ({myReportsCount} Laporan)
                  </span>
                )}
                {activeRole === 'PUBLIC_VIEWER' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-amber-400" />
                    User 2 (Siti Aminah): Melihat & Bisa Lapor ({myReportsCount === 0 ? 'Belum Ada Laporan Dibuat' : `${myReportsCount} Laporan Dibuat (Dapat Diedit)`})
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1">
                Portal Pelaporan Kerusakan Jalan & Korelasi Kendaraan WIM
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl">
                Setiap laporan masyarakat secara otomatis dihubungkan dengan sensor telemetri kendaraan berat **Weigh-In-Motion (WIM) Bina Marga** & kalkulasi fisika perkerasan **PINN** untuk mengetahui truk pemicu utama kerusakan.
              </p>
            </div>
          </div>

          {/* Action Button: Input New Damage Report */}
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-3 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-xl shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>+ Laporkan Kerusakan Jalan Baru</span>
          </button>
        </div>

        {/* Quick Statistics Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="bg-[#171d2e] p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Total Laporan Komunitas:</span>
            <p className="text-base font-extrabold text-white font-mono">{reports.length} Laporan</p>
          </div>
          <div className="bg-[#171d2e] p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Terverifikasi Engineer:</span>
            <p className="text-base font-extrabold text-emerald-400 font-mono">
              {reports.filter((r) => r.status === 'VERIFIED_BY_ENGINEER' || r.status === 'SCHEDULED_FOR_REPAIR').length} Laporan
            </p>
          </div>
          <div className="bg-[#171d2e] p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Kategori Kritis & Lubang:</span>
            <p className="text-base font-extrabold text-rose-400 font-mono">
              {reports.filter((r) => r.severity === 'CRITICAL' || r.damageType === 'POTHOLE').length} Laporan
            </p>
          </div>
          <div className="bg-[#171d2e] p-2.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Laporan Saya Sendiri:</span>
            <p className="text-base font-extrabold text-amber-400 font-mono">
              {myReportsCount} Laporan ({myReportsCount > 0 ? 'Dapat Diedit' : 'Belum Ada'})
            </p>
          </div>
        </div>
      </div>

      {/* EDIT MODAL / FORM */}
      {editingReport && (
        <div className="fixed inset-0 z-[1450] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121622]/98 border border-white/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[92vh] overflow-y-auto animate-fadeIn custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-400 text-slate-950 font-black rounded-2xl shadow-md shadow-amber-400/20">
                  <Edit3 className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
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
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Jenis Kerusakan Jalan:</label>
                  <select
                    value={editDamageType}
                    onChange={(e) => setEditDamageType(e.target.value as DamageType)}
                    className="w-full bg-[#171d2e] border border-white/15 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="POTHOLE">Lubang Dalam (Pothole)</option>
                    <option value="ALLIGATOR_CRACK">Retak Buaya (Alligator Cracking)</option>
                    <option value="RUTTING">Ambles & Deformasi Alur (Rutting)</option>
                    <option value="CORRUGATION">Kerusakan Gelombang (Corrugation)</option>
                    <option value="SUBSIDENCE">Penurunan Pondasi (Subsidence)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Tingkat Keparahan Bahaya:</label>
                  <select
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value as ReportSeverity)}
                    className="w-full bg-[#171d2e] border border-white/15 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="LIGHT">Ringan (Tidak Membahayakan)</option>
                    <option value="MODERATE">Sedang (Perlu Kehati-hatian)</option>
                    <option value="SEVERE">Parah (Risiko Banting Setir)</option>
                    <option value="CRITICAL">Sangat Kritis (Risiko Kecelakaan Tinggi)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Estimasi Kedalaman (cm):</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editDepthCm}
                    onChange={(e) => setEditDepthCm(Number(e.target.value))}
                    className="w-full bg-[#171d2e] border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">Estimasi Luas Area (m²):</label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={100}
                    value={editAreaM2}
                    onChange={(e) => setEditAreaM2(Number(e.target.value))}
                    className="w-full bg-[#171d2e] border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Photo Preset Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
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
                          : 'border-white/10 bg-[#171d2e] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-16 object-cover rounded-lg mb-1" />
                      <p className="text-[9.5px] font-bold text-center text-slate-300 truncate">{preset.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Deskripsi */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Deskripsi Detail Kerusakan & Dampak:</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#171d2e] border border-white/15 text-white rounded-xl p-3 focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black flex items-center space-x-1.5 shadow-lg shadow-amber-400/25 cursor-pointer"
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
        onAddReport={(newRep) => {
          onAddReport(newRep);
          setIsFormOpen(false);
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

      {/* FILTER BAR & SEARCH */}
      <div className="bg-[#121622]/95 border border-white/15 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs backdrop-blur-xl">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-300 font-mono">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#171d2e] border border-white/10 text-white rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">Semua Status ({reports.length})</option>
            <option value="PENDING">🕒 Menunggu Verifikasi</option>
            <option value="VERIFIED_BY_ENGINEER">✅ Terverifikasi Engineer</option>
            <option value="SCHEDULED_FOR_REPAIR">🚧 Dijadwalkan Penanganan</option>
            <option value="REPAIRED">🎉 Selesai Diperbaiki</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="font-bold text-slate-300 font-mono">Jenis Kerusakan:</span>
          <select
            value={damageTypeFilter}
            onChange={(e) => setDamageTypeFilter(e.target.value)}
            className="bg-[#171d2e] border border-white/10 text-white rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="POTHOLE">Lubang (Pothole)</option>
            <option value="ALLIGATOR_CRACK">Retak Buaya</option>
            <option value="RUTTING">Ambles & Rutting</option>
            <option value="CORRUGATION">Kerusakan Gelombang</option>
            <option value="SUBSIDENCE">Penurunan Pondasi</option>
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari lokasi, jalan, pelapor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#171d2e] border border-white/10 text-white rounded-xl pl-8 pr-3 py-1.5 font-sans focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* REPORTS LIST (FEED OF CITIZEN REPORTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => {
          const isMyReport = report.reporterName === currentAccount.name;

          return (
            <div
              key={report.id}
              onClick={() => setSelectedDetailReport(report)}
              className="bg-[#121622]/95 border border-white/15 hover:border-amber-400/50 hover:bg-[#151b2b] rounded-3xl p-4 space-y-3 shadow-xl transition-all flex flex-col justify-between group cursor-pointer backdrop-blur-xl"
            >
              <div>
                {/* Reporter Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={
                        report.reporterAvatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
                      }
                      alt={report.reporterName}
                      className="w-8 h-8 rounded-xl object-cover border border-white/20"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                          {report.reporterName}
                        </h4>
                        {isMyReport && (
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{report.reporterRole}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[9.5px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      report.status === 'VERIFIED_BY_ENGINEER'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : report.status === 'SCHEDULED_FOR_REPAIR'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    {report.status === 'VERIFIED_BY_ENGINEER' && '✅ Diverifikasi'}
                    {report.status === 'SCHEDULED_FOR_REPAIR' && '🚧 Dijadwalkan'}
                    {report.status === 'PENDING' && '🕒 Menunggu'}
                  </span>
                </div>

                {/* Photo & Severity Badge */}
                <div className="relative mt-3 rounded-2xl overflow-hidden border border-white/10 h-40">
                  <img src={report.photoUrl} alt={report.damageTypeLabel} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{report.severity}</span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-mono text-amber-300 border border-white/10">
                    📍 {report.province}
                  </div>
                </div>

                {/* Location & Title */}
                <div className="mt-3 space-y-1">
                  <h3 className="text-xs font-extrabold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">{report.segmentName}</h3>
                  <p className="text-[10.5px] text-slate-400 font-medium">{report.corridor}</p>
                  <div className="inline-block bg-[#171d2e] text-amber-300 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                    {report.damageTypeLabel} &bull; Dalam: {report.estimatedDepthCm} cm &bull; Luas: {report.estimatedAreaM2} m²
                  </div>
                  <p className="text-xs text-slate-300 pt-1 line-clamp-2 italic">"{report.description}"</p>
                </div>

                {/* Dedicated WIM Vehicle Overload Correlation Box */}
                {report.wimCorrelation && (
                  <div className="mt-3 bg-[#171d2e] border border-indigo-500/30 rounded-2xl p-3 space-y-1.5 text-[10.5px]">
                    <div className="flex items-center justify-between font-mono font-bold text-cyan-300 border-b border-indigo-500/20 pb-1">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" /> KORELASI VEHICLE WIM:
                      </span>
                      <span className="text-rose-400 text-[9.5px]">
                        Pemicu: +{report.wimCorrelation.overloadPercent}% ODOL
                      </span>
                    </div>
                    <p className="text-slate-300 font-mono text-[10px]">
                      Truk Terdeteksi: <strong className="text-white">{report.wimCorrelation.recentTruckPlate}</strong> ({report.wimCorrelation.maxAxleLoadTon} Ton)
                    </p>
                    <p className="text-indigo-200 text-[10px] leading-tight">
                      {report.wimCorrelation.causeAnalysisSummary}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Card Controls: Upvote, Edit (if author), Detail & Map */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between mt-3 text-xs gap-1.5">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpvoteReport(report.id);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1 border cursor-pointer ${
                      report.userUpvoted
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{report.upvotesCount}</span>
                  </button>

                  {/* EDIT BUTTON (Available only for the author of this report) */}
                  {isMyReport && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(report);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] font-mono transition-all flex items-center space-x-1 shadow-md shadow-amber-400/20 cursor-pointer"
                      title="Edit Laporan Anda"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDetailReport(report);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#171d2e] hover:bg-white/10 text-slate-200 font-bold text-[11px] font-mono transition-all flex items-center space-x-1 border border-white/10 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Detail</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSegmentForMap(report.segmentId);
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 font-mono flex items-center space-x-0.5 cursor-pointer"
                  >
                    <span>Peta</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Detail & Before/After Comparison Modal */}
      <ReportDetailModal
        isOpen={!!selectedDetailReport}
        onClose={() => setSelectedDetailReport(null)}
        report={selectedDetailReport}
        onUpvote={onUpvoteReport}
        onStartEdit={(rep) => handleOpenEdit(rep)}
        currentAccount={currentAccount}
        onFocusMap={(rep) => {
          setSelectedDetailReport(null);
          onSelectSegmentForMap(rep.segmentId);
        }}
      />
    </div>
  );
};
