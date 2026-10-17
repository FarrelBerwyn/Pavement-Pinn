import React, { useState } from 'react';
import {
  Map as MapIcon,
  HardHat,
  Search,
  Bell,
  FileDown,
  ChevronDown,
  Layers,
  Compass,
  Plus,
  Wrench,
  Navigation,
  Activity,
  History,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Maximize2,
  Cpu,
  Zap,
  ChevronRight,
  X,
  Camera,
  Share2
} from 'lucide-react';
import { RoadSegment, DamageReport, SimulationResult } from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import type { ReportCase } from '../../domain/workflow/model';
import { StateBadge } from '../workflow/ReportWorkflowPanel';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
import { LeafletMap } from '../../components/maps/LeafletMap';

interface PavementPinnDashboardProps {
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  communityReports: DamageReport[];
  currentResult: SimulationResult | null;
  onLaunchSimulation: (segment: RoadSegment) => void;
  onOpenCreateReport: () => void;
  onOpenTechnicalDetails?: () => void;
  onNavigateToSPK?: () => void;
  onNavigateToMap?: () => void;
  /** Open Riwayat Jalan for the selected segment. */
  onOpenRoadHistory?: () => void;
  /** Open workflow cases assigned to this engineer, soonest deadline first. */
  assignedTasks?: ReportCase[];
  searchQuery?: string;
}

export const PavementPinnDashboard: React.FC<PavementPinnDashboardProps> = ({
  currentAccount,
  roadSegments,
  selectedSegment,
  onSelectSegment,
  communityReports,
  currentResult,
  onLaunchSimulation,
  onOpenCreateReport,
  onOpenTechnicalDetails,
  onNavigateToSPK,
  onNavigateToMap,
  onOpenRoadHistory,
  assignedTasks = [],
  searchQuery: externalSearchQuery
}) => {
  // Condition filter
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'GOOD' | 'MODERATE' | 'LIGHT_DAMAGE' | 'HEAVY_DAMAGE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const activeSearchQuery = externalSearchQuery !== undefined ? externalSearchQuery : searchQuery;
  
  // Inspection Checklist State
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    damage_type: false,
    dimension: false,
    photo: false,
    drainage: false,
    recommendation: false
  });
  
  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;
  
  // Modals state
  const [activeModal, setActiveModal] = useState<'SURVEY_GUIDE' | 'DAMAGE_CATALOG' | 'TECH_DETAIL' | null>(null);

  // "Tugas Saya": open cases an Operations Manager assigned to this engineer (shared workflow).
  const myOpenTasks = assignedTasks;

  // Active Segment calculations
  const segmentReports = communityReports.filter((r) => r.segmentId === selectedSegment.id || r.segmentName.includes(selectedSegment.name));
  const activeReport = segmentReports[0] || communityReports[0];

  const pciValue = selectedSegment.currentPci || 62;
  const pciCategory =
    pciValue >= 85 ? 'Baik' : pciValue >= 70 ? 'Perlu Perhatian' : pciValue >= 50 ? 'Rusak Ringan' : 'Rusak Berat';
  const pciColor =
    pciValue >= 85 ? 'text-emerald-400' : pciValue >= 70 ? 'text-amber-300' : pciValue >= 50 ? 'text-orange-400' : 'text-rose-400';
  const pciBadgeBg =
    pciValue >= 85
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : pciValue >= 70
      ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
      : pciValue >= 50
      ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

  // Toggle checklist item
  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };


  return (
    <div className="min-h-full w-full bg-canvas text-slate-100 font-sans pb-12">
      {/* 2. MAIN DASHBOARD CONTENT (2 Columns Grid) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 space-y-6">
        {/* Top Title & Quick Actions */}
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pb-4 border-b border-line">
          <div className="min-w-0 flex-1 basis-[24rem] space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Dashboard Rekayasa & Kondisi Jalan</span>
              <span className="whitespace-nowrap text-xs font-medium text-amber-300 bg-amber-400/10 px-2 py-1 rounded-md border border-amber-400/20">
                Intel OpenVINO Edge AI
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Pantau, periksa, dan laporkan kondisi jalan di lapangan secara prediktif &bull; Insinyur: {currentAccount.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Official Report PDF */}
            <button
              onClick={() => {
                if (currentResult) {
                  generateOfficialReportPdf(currentResult, 'FIELD_ENGINEER');
                } else {
                  alert('Menyiapkan kompilasi Laporan Rekayasa Lapangan PUPR BBPJN...');
                  onLaunchSimulation(selectedSegment);
                }
              }}
              className="h-9 px-3 rounded-lg border border-line bg-surface hover:bg-elevated text-slate-200 hover:text-white text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
              title="Unduh Laporan Rekayasa Sipil (PDF)"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Unduh PDF</span>
            </button>

            {/* OpenVINO Hardware Telemetry Badge (From PDF) */}
            <div className="h-9 flex items-center gap-2 rounded-lg border border-line px-3 text-xs text-slate-400" title="Perangkat inferensi dan latensi diisi dari pengukuran (Halaman Bukti)">
              <Cpu className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Perangkat belum terdeteksi · latensi belum diukur</span>
            </div>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kondisi jalan">
          {/* Dropdown / Semua Kondisi */}
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-slate-700 text-white border border-slate-600 shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Semua Kondisi</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Baik */}
          <button
            onClick={() => setActiveFilter('GOOD')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'GOOD'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Baik</span>
          </button>

          {/* Perlu Perhatian */}
          <button
            onClick={() => setActiveFilter('MODERATE')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'MODERATE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Perlu Perhatian</span>
          </button>

          {/* Rusak Ringan */}
          <button
            onClick={() => setActiveFilter('LIGHT_DAMAGE')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'LIGHT_DAMAGE'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-orange-300 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>Rusak Ringan</span>
          </button>

          {/* Rusak Berat */}
          <button
            onClick={() => setActiveFilter('HEAVY_DAMAGE')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'HEAVY_DAMAGE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Rusak Berat</span>
          </button>

          {/* Filter Action */}
          <button
            onClick={() => setActiveFilter('ALL')}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 ml-auto flex items-center space-x-2 cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* 3. CORE 2-COLUMN LAYOUT: MAP + SUMMARY (LEFT) & SELECTED SEGMENT DETAILS (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Map & Ringkasan Kondisi Segmen & Tugas & Panduan (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* A. Map Card */}
            <div className="bg-surface border border-line rounded-2xl overflow-hidden relative">
              <div className="h-[360px] md:h-[440px] xl:h-[520px] w-full overflow-hidden relative">
                <LeafletMap
                  roadSegments={roadSegments}
                  selectedSegment={selectedSegment}
                  onSelectSegment={onSelectSegment}
                  activeFilter={activeFilter === 'ALL' ? 'ALL' : activeFilter === 'GOOD' ? 'MINOR' : activeFilter === 'MODERATE' ? 'MODERATE' : 'CRITICAL'}
                  communityReports={communityReports}
                  onSelectReport={() => {}}
                  activeRole={currentAccount?.role || 'FIELD_ENGINEER'}
                  currentAccount={currentAccount}
                  onLaunchSimulation={onLaunchSimulation}
                  onNavigateToDashboard={onNavigateToSPK || onNavigateToMap}
                />

                {/* Floating Map Legend (Bottom Left of Map) */}
                <div className="hidden sm:block absolute bottom-3 left-3 z-10 bg-surface border border-line rounded-lg px-3 py-2 text-xs space-y-1 shadow-md text-slate-300 max-w-[calc(100%-12rem)]">
                  <span className="font-medium text-white block">Legenda kondisi</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block" /> Baik
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-amber-400 rounded-full inline-block" /> Perlu Perhatian
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-orange-400 rounded-full inline-block" /> Rusak Ringan
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-rose-500 rounded-full inline-block" /> Rusak Berat
                    </span>
                  </div>
                </div>

                {/* Floating "+ Lapor Kondisi Jalan" Action Button (Bottom Right of Map) */}
                <button
                  onClick={onOpenCreateReport}
                  className="absolute bottom-3 right-3 z-10 h-10 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 text-sm font-semibold shadow-md inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lapor Kondisi Jalan</span>
                </button>
              </div>
            </div>

            {/* Legend below the map on phones (it would cover the map there) */}
            <div className="sm:hidden flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 -mt-2" aria-label="Legenda kondisi">
              <span className="flex items-center gap-2"><span className="w-3 h-1 rounded-full bg-emerald-400" />Baik</span>
              <span className="flex items-center gap-2"><span className="w-3 h-1 rounded-full bg-amber-400" />Perlu Perhatian</span>
              <span className="flex items-center gap-2"><span className="w-3 h-1 rounded-full bg-orange-400" />Rusak Ringan</span>
              <span className="flex items-center gap-2"><span className="w-3 h-1 rounded-full bg-rose-500" />Rusak Berat</span>
            </div>

            {/* B. Ringkasan Kondisi Segmen Card */}
            <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Ringkasan Kondisi Segmen</span>
                  <Info className="w-4 h-4 text-slate-400 cursor-pointer" />
                </h3>
                <span className="min-w-0 truncate text-xs text-slate-400" title={selectedSegment.name}>{selectedSegment.name}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)] gap-6">
                {/* 1. PCI Score (3 cols) */}
                <div className="min-w-0 space-y-2 border-b sm:border-b-0 sm:border-r border-line pb-4 sm:pb-0 sm:pr-4">
                  <span className="text-xs text-slate-400 font-medium">PCI Saat Ini</span>
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-4xl font-semibold ${pciColor} tabular-nums tracking-tight`}>
                      {pciValue}
                    </span>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${pciBadgeBg}`}>
                    {pciCategory}
                  </span>

                  <div className="pt-2 grid grid-cols-2 gap-3 text-xs text-slate-400">
                    <div>
                      <span className="block text-xs text-slate-500">PCI Sebelumnya</span>
                      <span className="font-medium text-slate-300 tabular-nums">68</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">Penurunan</span>
                      <span className="font-medium text-rose-400 tabular-nums flex items-center">&darr; 6</span>
                    </div>
                  </div>
                </div>

                {/* 2. Jenis Kerusakan Dominan (5 cols) */}
                <div className="min-w-0 space-y-3 border-b xl:border-b-0 xl:border-r border-line pb-4 xl:pb-0 xl:pr-4">
                  <span className="text-xs text-slate-400 font-medium block">Jenis Kerusakan Dominan</span>

                  {/* Item 1: Retak Kulit Buaya */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Retak Kulit Buaya</span>
                      <span className="tabular-nums font-medium whitespace-nowrap text-slate-200">40%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>

                  {/* Item 2: Lubang */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Lubang</span>
                      <span className="tabular-nums font-medium whitespace-nowrap text-slate-200">30%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>

                  {/* Item 3: Retak Memanjang */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Retak Memanjang</span>
                      <span className="tabular-nums font-medium whitespace-nowrap text-slate-200">20%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>

                  {/* Item 4: Alur */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Alur</span>
                      <span className="tabular-nums font-medium whitespace-nowrap text-slate-200">10%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: '10%' }} />
                    </div>
                  </div>
                </div>

                {/* 3. Data Pendukung (4 cols) */}
                <div className="min-w-0 space-y-3 text-xs sm:col-span-2 xl:col-span-1">
                  <span className="text-slate-400 font-medium block">Data Pendukung</span>

                  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-line">
                    <span className="text-slate-400">Lalu Lintas (Rata-rata)</span>
                    <span className="tabular-nums font-medium whitespace-nowrap text-slate-200">12.450 kend/hari</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-line">
                    <span className="text-slate-400">Curah Hujan (7 hari)</span>
                    <span className="tabular-nums font-medium whitespace-nowrap text-slate-200">78 mm</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-line">
                    <span className="text-slate-400">Kondisi Tanah Dasar (CBR)</span>
                    <span className="tabular-nums font-medium whitespace-nowrap text-slate-200">{selectedSegment.defaultCbrPercent || 6}%</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Tipe Perkerasan</span>
                    <span className="tabular-nums font-medium whitespace-nowrap text-amber-300">AC-WC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* C. Bottom Row: Tugas Saya (Left) + Panduan Cepat (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tugas Saya */}
              <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">Tugas Saya</h3>
                    <span className="text-xs font-medium text-slate-300 px-2 py-1 rounded-md border border-line">
                      {myOpenTasks.length} tugas aktif
                    </span>
                  </div>
                  <button
                    onClick={onNavigateToSPK}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                <div className="space-y-3">
                  {myOpenTasks.length === 0 && (
                    <p className="text-xs text-slate-400">Belum ada inspeksi yang ditugaskan M.O ke akun Anda.</p>
                  )}
                  {myOpenTasks.slice(0, 2).map((task) => (
                    <div key={task.id} className="bg-elevated border border-white/5 hover:border-white/15 p-4 rounded-2xl space-y-2 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <StateBadge state={task.state} />
                          <h4 className="text-xs font-bold text-white mt-1 truncate">
                            {task.report.damageTypeLabel} · {task.report.segmentName}
                          </h4>
                        </div>
                        <button
                          onClick={onNavigateToSPK}
                          className="h-8 px-3 rounded-lg bg-brand text-navy hover:bg-brand-hover text-xs font-semibold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
                        >
                          Buka Tugas
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                        <span>Batas waktu: {new Date(task.assignment!.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="font-mono text-slate-300">{task.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panduan Cepat */}
              <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white">Panduan Cepat</h3>
                  <span className="text-xs text-slate-400 tabular-nums">Bina Marga / PUPR</span>
                </div>

                <div className="space-y-3">
                  {/* Guideline 1 */}
                  <div
                    onClick={() => setActiveModal('SURVEY_GUIDE')}
                    className="flex items-center justify-between p-4 bg-elevated hover:bg-elevated border border-white/5 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          Cara Survei Jalan
                        </h4>
                        <p className="text-xs text-slate-400">Panduan langkah demi langkah</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Guideline 2 */}
                  <div
                    onClick={() => setActiveModal('DAMAGE_CATALOG')}
                    className="flex items-center justify-between p-4 bg-elevated hover:bg-elevated border border-white/5 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-amber-400/10 text-amber-300 rounded-lg">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          Jenis Kerusakan Jalan
                        </h4>
                        <p className="text-xs text-slate-400">Kenali 19 jenis kerusakan Bina Marga</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DETAIL RUAS JALAN TERPILIH PANEL (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Main Selected Road Segment Panel */}
            <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Ruas Jalan Terpilih</h3>
                  <p className="text-xs text-slate-400 leading-snug mt-1">
                    {selectedSegment.name}
                  </p>
                  <p className="text-xs text-slate-500">{selectedSegment.corridor}</p>
                </div>
                <button
                  onClick={() => alert(`Ruas: ${selectedSegment.name}\nPanjang: ${selectedSegment.lengthKm} km\nPCI: ${selectedSegment.currentPci}`)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Status Badge & Key Metrics */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${pciBadgeBg}`}>
                  {pciCategory}
                </span>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">PCI Terakhir</span>
                  <span className={`text-base font-semibold tabular-nums ${pciColor}`}>{pciValue}</span>
                </div>
              </div>

              {/* Length & Last Update */}
              <div className="grid grid-cols-2 gap-2 bg-elevated p-3 rounded-2xl border border-white/5 text-xs">
                <div>
                  <span className="text-slate-400 block text-xs">Panjang Segmen</span>
                  <span className="font-bold text-slate-200">{selectedSegment.lengthKm * 1000} m</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Update Terakhir</span>
                  <span className="font-bold text-slate-200">2 jam lalu</span>
                </div>
              </div>

              {/* 4 Action Icons Grid: Navigasi, Detail Teknis, Riwayat, Unduh Data */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {/* 1. Navigasi */}
                <button
                  onClick={() => {
                    const [lat, lng] = selectedSegment.coordinates;
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer group"
                  title="Navigasi ke Lokasi"
                >
                  <Navigation className="w-4 h-4 mb-1 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Navigasi</span>
                </button>

                {/* 2. Detail Teknis (PINN Tensor) */}
                <button
                  onClick={() => {
                    if (onOpenTechnicalDetails) {
                      onOpenTechnicalDetails();
                    } else {
                      setActiveModal('TECH_DETAIL');
                    }
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer group"
                  title="Detail Teknis & Tensor PINN"
                >
                  <Activity className="w-4 h-4 mb-1 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Detail Teknis</span>
                </button>

                {/* 3. Riwayat */}
                <button
                  onClick={onOpenRoadHistory}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer group"
                  title="Riwayat Degradasi Jalan"
                >
                  <History className="w-4 h-4 mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Riwayat</span>
                </button>

                {/* 4. Unduh Data */}
                <button
                  onClick={() => {
                    if (currentResult) {
                      generateOfficialReportPdf(currentResult, 'FIELD_ENGINEER');
                    } else {
                      alert('Mengunduh Data Teknis Format PDF Bina Marga...');
                      onLaunchSimulation(selectedSegment);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer group"
                  title="Unduh Data PDF"
                >
                  <FileDown className="w-4 h-4 mb-1 text-amber-400" />
                  <span className="text-xs font-bold">Unduh Data</span>
                </button>
              </div>

              {/* Rekomendasi Tindakan Card */}
              <div className="bg-elevated border border-line rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-300 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Rekomendasi Tindakan
                  </span>
                  <Wrench className="w-4 h-4 text-slate-500" />
                </div>
                <p className="text-xs font-bold text-slate-200 leading-snug">
                  Lakukan penanganan pemeliharaan rutin dalam 3 bulan ke depan
                </p>
                <p className="text-xs text-slate-400">
                  Rekomendasi tebal overlay AC-WC: {selectedSegment.wimDetails?.overlayRecommendationCm || 6.5} cm.
                </p>
              </div>

              {/* Laporan Terbaru di Segmen Ini */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Laporan Terbaru di Segmen Ini</span>
                  <button
                    onClick={onNavigateToMap}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                <div className="bg-elevated border border-white/5 p-3 rounded-2xl flex items-center space-x-3">
                  <img
                    src={activeReport.photoUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80'}
                    alt="Kerusakan"
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-white truncate">{activeReport.damageTypeLabel}</span>
                      <span className="text-xs px-2 py-1 rounded font-bold bg-orange-500/20 text-orange-300">
                        {activeReport.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      Oleh: {activeReport.reporterName}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums mt-1">
                      {activeReport.timestamp}
                    </p>
                  </div>
                </div>

                {/* Pagination Indicator Dots */}
                <div className="flex items-center justify-center space-x-1 pt-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                </div>
              </div>

              {/* Checklist Pemeriksaan Lapangan (0/5) */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Checklist Pemeriksaan Lapangan</span>
                  <span className="text-xs tabular-nums text-emerald-400 font-bold">
                    {completedChecklistCount}/5
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div
                    onClick={() => toggleChecklistItem('damage_type')}
                    className="flex items-center space-x-2 cursor-pointer select-none"
                  >
                    {checklist.damage_type ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={checklist.damage_type ? 'line-through text-slate-500' : ''}>
                      Periksa jenis kerusakan
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('dimension')}
                    className="flex items-center space-x-2 cursor-pointer select-none"
                  >
                    {checklist.dimension ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={checklist.dimension ? 'line-through text-slate-500' : ''}>
                      Ukur dimensi kerusakan
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('photo')}
                    className="flex items-center space-x-2 cursor-pointer select-none"
                  >
                    {checklist.photo ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={checklist.photo ? 'line-through text-slate-500' : ''}>
                      Foto kondisi kerusakan
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('drainage')}
                    className="flex items-center space-x-2 cursor-pointer select-none"
                  >
                    {checklist.drainage ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={checklist.drainage ? 'line-through text-slate-500' : ''}>
                      Catat kondisi drainase
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('recommendation')}
                    className="flex items-center space-x-2 cursor-pointer select-none"
                  >
                    {checklist.recommendation ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={checklist.recommendation ? 'line-through text-slate-500' : ''}>
                      Isi rekomendasi tindakan
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // The checklist is a local reminder; results are saved only through the assigned task.
                    onNavigateToSPK?.();
                  }}
                  className="w-full mt-2 h-10 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kirim hasil lewat Tugas Saya</span>
                </button>
              </div>
            </div>

            {/* Dokumen & Referensi Box */}
            <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white">Dokumen & Referensi</h3>
                <span className="text-xs text-amber-400 font-bold cursor-pointer" onClick={() => setActiveModal('DAMAGE_CATALOG')}>
                  Lihat Semua
                </span>
              </div>

              <div className="space-y-3">
                {/* Doc 1 */}
                <div
                  onClick={() => {
                    if (currentResult) {
                      generateOfficialReportPdf(currentResult, 'FIELD_ENGINEER');
                    } else {
                      alert('Mengunduh Manual Survei Kondisi Jalan Bina Marga 2024 (PDF)...');
                    }
                  }}
                  className="flex items-center justify-between p-3 bg-elevated hover:bg-elevated border border-white/5 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Manual Survei Jalan 2024</h4>
                      <span className="text-xs text-slate-400">PDF &bull; 8.4 MB</span>
                    </div>
                  </div>
                  <FileDown className="w-4 h-4 text-slate-400 hover:text-white" />
                </div>

                {/* Doc 2 */}
                <div
                  onClick={() => {
                    if (currentResult) {
                      generateOfficialReportPdf(currentResult, 'FIELD_ENGINEER');
                    } else {
                      alert('Mengunduh Standar Penilaian Kondisi Jalan (PCI) AASHTO & Bina Marga (PDF)...');
                    }
                  }}
                  className="flex items-center justify-between p-3 bg-elevated hover:bg-elevated border border-white/5 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Standar Penilaian Kondisi Jalan (PCI)</h4>
                      <span className="text-xs text-slate-400">PDF &bull; 5.1 MB</span>
                    </div>
                  </div>
                  <FileDown className="w-4 h-4 text-slate-400 hover:text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. MODALS FOR GUIDES & TASKS */}
      {/* A. Survey Guide Modal */}
      {activeModal === 'SURVEY_GUIDE' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/20 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Panduan Survei Lapangan Bina Marga</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="font-bold text-amber-300">Langkah 1: Identifikasi Titik Kerusakan</span>
                <p>Verifikasi koordinat GPS dan patok kilometer (KM Post). Cocokkan dengan data jaringan jalan nasional BBPJN.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="font-bold text-amber-300">Langkah 2: Pengukuran Dimensi & Tingkat Keparahan (Severity)</span>
                <p>Ukur kedalaman lubang (cm), luas area retak (m²), dan kedalaman alur bekas roda (rutting depth).</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="font-bold text-amber-300">Langkah 3: Pengambilan Foto Geotagging</span>
                <p>Ambil foto tegak lurus permukaan jalan dan foto sudut pandang memanjang (longitudinal view) dengan skala pembanding.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="font-bold text-amber-300">Langkah 4: Evaluasi Drainase Samping</span>
                <p>Pastikan saluran drainase tepi jalan tidak tersumbat endapan atau tertutup vegetasi untuk mencegah infiltrasi air tanah dasar.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="font-bold text-amber-300">Langkah 5: Otorisasi & Disposisi Rekomendasi SPK</span>
                <p>Input data ke sistem PAVEMENT-PINN untuk perhitungan otomatis tebal overlay dan penerbitan Surat Perintah Kerja (SPK).</p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 rounded-2xl bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Mengerti & Tutup Panduan
            </button>
          </div>
        </div>
      )}

      {/* B. Damage Catalog Modal (19 Jenis Kerusakan Bina Marga) */}
      {activeModal === 'DAMAGE_CATALOG' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/20 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Katalog 19 Jenis Kerusakan Jalan (Bina Marga & PCI)</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-rose-400 block">1. Lubang (Potholes)</span>
                <p className="text-slate-400 text-xs mt-1">Cekungan mangkok dengan diameter &gt; 15 cm dan kedalaman &gt; 2.5 cm.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-amber-400 block">2. Retak Kulit Buaya (Alligator Crack)</span>
                <p className="text-slate-400 text-xs mt-1">Retak saling sambung membentuk pola poligon akibat kelelahan beban berulang.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-cyan-400 block">3. Alur Roda (Rutting)</span>
                <p className="text-slate-400 text-xs mt-1">Depresi memanjang pada jalur jejak roda akibat deformasi plastis lapisan aspal/tanah.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-emerald-400 block">4. Retak Memanjang & Melintang</span>
                <p className="text-slate-400 text-xs mt-1">Retak garis lurus searah atau memotong sumbu jalan karena susut termal/sambungan.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-indigo-400 block">5. Amblas / Penurunan (Depression)</span>
                <p className="text-slate-400 text-xs mt-1">Penurunan lokal permukaan perkerasan akibat konsolidasi tanah dasar yang tidak merata.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-purple-400 block">6. Jembul / Keriting (Corrugation & Shoving)</span>
                <p className="text-slate-400 text-xs mt-1">Gelombang transversal akibat gaya gesek pengereman kendaraan berat di persimpangan.</p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 h-10 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm cursor-pointer"
            >
              Tutup Katalog
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
