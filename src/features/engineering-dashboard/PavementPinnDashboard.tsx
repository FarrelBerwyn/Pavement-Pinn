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
  const [activeModal, setActiveModal] = useState<'SURVEY_GUIDE' | 'DAMAGE_CATALOG' | 'TECH_DETAIL' | 'TASK_DETAIL' | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

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

  // Mock Tasks list
  const tasksList = [
    {
      id: 'TSK-01',
      title: 'Survei Kondisi Jl. Raya Bogor KM 28-30',
      priority: 'TINGGI',
      deadline: '12 Mei 2026',
      location: 'Kec. Ciracas, Jakarta Timur',
      status: 'Sedang Berjalan',
      segmentId: selectedSegment.id,
      notes: 'Lakukan pengukuran kedalaman lubang dan evaluasi retak kulit buaya menggunakan profilometrik.'
    },
    {
      id: 'TSK-02',
      title: 'Verifikasi Lendutan FWD Ruas Karawang Barat',
      priority: 'SEDANG',
      deadline: '15 Mei 2026',
      location: 'Interchange Karawang Barat KM 02+400',
      status: 'Menunggu Pengukuran',
      segmentId: roadSegments[0]?.id,
      notes: 'Uji lendutan FWD 50 kN untuk kalibrasi residual PDE Burmister PINN model.'
    },
    {
      id: 'TSK-03',
      title: 'Inspeksi Titik Timbangan WIM Tol Cikampek KM 42',
      priority: 'TINGGI',
      deadline: '18 Mei 2026',
      location: 'Gerbang Tol Cikampek Utama',
      status: 'Dijadwalkan',
      segmentId: roadSegments[1]?.id,
      notes: 'Korelasikan sensor beban sumbu WIM terhadap penurunan nilai PCI segmen.'
    }
  ];

  return (
    <div className="min-h-full w-full bg-[#07090e] text-slate-100 font-sans pb-12">
      {/* 2. MAIN DASHBOARD CONTENT (2 Columns Grid) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 space-y-6">
        {/* Top Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Dashboard Rekayasa & Kondisi Jalan</span>
              <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                Intel OpenVINO Edge AI
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Pantau, periksa, dan laporkan kondisi jalan di lapangan secara prediktif &bull; Insinyur: {currentAccount.name}
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 self-start sm:self-auto">
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
              className="px-3.5 py-1.5 rounded-2xl bg-[#161c2c] hover:bg-[#1f273d] text-slate-200 hover:text-white border border-white/10 text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
              title="Unduh Laporan Rekayasa Sipil (PDF)"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Unduh PDF</span>
            </button>

            {/* OpenVINO Hardware Telemetry Badge (From PDF) */}
            <div className="flex items-center space-x-2 bg-[#121724] border border-white/10 rounded-2xl px-3.5 py-1.5 shadow-md">
              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-cyan-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Intel NPU</span>
              </div>
              <span className="text-slate-600">&bull;</span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">8.4 ms</span>
            </div>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {/* Dropdown / Semua Kondisi */}
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-slate-700 text-white border border-slate-600 shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Semua Kondisi</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Baik */}
          <button
            onClick={() => setActiveFilter('GOOD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 ml-auto flex items-center space-x-1.5 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* 3. CORE 2-COLUMN LAYOUT: MAP + SUMMARY (LEFT) & SELECTED SEGMENT DETAILS (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Map & Ringkasan Kondisi Segmen & Tugas & Panduan (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* A. Map Card */}
            <div className="bg-[#121622] border border-white/10 rounded-3xl p-4 shadow-xl overflow-hidden relative">
              <div className="h-[360px] sm:h-[420px] w-full rounded-2xl overflow-hidden relative border border-white/10">
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
                <div className="absolute bottom-3 left-3 z-10 bg-[#0e1320]/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-[10px] space-y-1 shadow-lg text-slate-300">
                  <span className="font-bold text-white block text-[9.5px] uppercase tracking-wider">Legenda Kondisi</span>
                  <div className="flex items-center gap-3">
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
                  className="absolute bottom-3 right-3 z-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-1.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Lapor Kondisi Jalan</span>
                </button>
              </div>
            </div>

            {/* B. Ringkasan Kondisi Segmen Card */}
            <div className="bg-[#121622] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Ringkasan Kondisi Segmen</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                </h3>
                <span className="text-[11px] font-mono text-slate-400">{selectedSegment.name}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* 1. PCI Score (3 cols) */}
                <div className="md:col-span-3 space-y-2 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 pr-0 md:pr-4">
                  <span className="text-[11px] text-slate-400 font-medium">PCI Saat Ini</span>
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-4xl font-black ${pciColor} font-mono tracking-tight`}>
                      {pciValue}
                    </span>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${pciBadgeBg}`}>
                    {pciCategory}
                  </span>

                  <div className="pt-2 flex items-center space-x-3 text-[11px] text-slate-400">
                    <div>
                      <span className="block text-[9.5px] text-slate-500">PCI Sebelumnya</span>
                      <span className="font-bold text-slate-300 font-mono">68</span>
                    </div>
                    <div>
                      <span className="block text-[9.5px] text-slate-500">Penurunan</span>
                      <span className="font-bold text-rose-400 font-mono flex items-center">&darr; 6</span>
                    </div>
                  </div>
                </div>

                {/* 2. Jenis Kerusakan Dominan (5 cols) */}
                <div className="md:col-span-5 space-y-2.5 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 pr-0 md:pr-4">
                  <span className="text-[11px] text-slate-400 font-medium block">Jenis Kerusakan Dominan</span>

                  {/* Item 1: Retak Kulit Buaya */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Retak Kulit Buaya</span>
                      <span className="font-mono font-bold text-slate-200">40%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>

                  {/* Item 2: Lubang */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Lubang</span>
                      <span className="font-mono font-bold text-slate-200">30%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>

                  {/* Item 3: Retak Memanjang */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Retak Memanjang</span>
                      <span className="font-mono font-bold text-slate-200">20%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>

                  {/* Item 4: Alur */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Alur</span>
                      <span className="font-mono font-bold text-slate-200">10%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: '10%' }} />
                    </div>
                  </div>
                </div>

                {/* 3. Data Pendukung (4 cols) */}
                <div className="md:col-span-4 space-y-2.5 text-[11px]">
                  <span className="text-slate-400 font-medium block">Data Pendukung</span>

                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Lalu Lintas (Rata-rata)</span>
                    <span className="font-mono font-bold text-slate-200">12.450 kend/hari</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Curah Hujan (7 hari)</span>
                    <span className="font-mono font-bold text-slate-200">78 mm</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Kondisi Tanah Dasar (CBR)</span>
                    <span className="font-mono font-bold text-slate-200">{selectedSegment.defaultCbrPercent || 6}%</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Tipe Perkerasan</span>
                    <span className="font-mono font-bold text-amber-300">AC-WC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* C. Bottom Row: Tugas Saya (Left) + Panduan Cepat (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tugas Saya */}
              <div className="bg-[#121622] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">Tugas Saya</h3>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      7 tugas aktif
                    </span>
                  </div>
                  <button
                    onClick={onNavigateToSPK}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                <div className="space-y-3">
                  {tasksList.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className="bg-[#181e2f] border border-white/5 hover:border-white/15 p-3.5 rounded-2xl space-y-2 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              task.priority === 'TINGGI'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            Prioritas {task.priority}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1">{task.title}</h4>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setActiveModal('TASK_DETAIL');
                          }}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black rounded-xl transition-transform active:scale-95 cursor-pointer shrink-0"
                        >
                          Lihat Tugas
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                        <span>Batas waktu: {task.deadline}</span>
                        <span className="text-slate-300">{task.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panduan Cepat */}
              <div className="bg-[#121622] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white">Panduan Cepat</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Bina Marga / PUPR</span>
                </div>

                <div className="space-y-3">
                  {/* Guideline 1 */}
                  <div
                    onClick={() => setActiveModal('SURVEY_GUIDE')}
                    className="flex items-center justify-between p-3.5 bg-[#181e2f] hover:bg-[#20283e] border border-white/5 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          Cara Survei Jalan
                        </h4>
                        <p className="text-[10.5px] text-slate-400">Panduan langkah demi langkah</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Guideline 2 */}
                  <div
                    onClick={() => setActiveModal('DAMAGE_CATALOG')}
                    className="flex items-center justify-between p-3.5 bg-[#181e2f] hover:bg-[#20283e] border border-white/5 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          Jenis Kerusakan Jalan
                        </h4>
                        <p className="text-[10.5px] text-slate-400">Kenali 19 jenis kerusakan Bina Marga</p>
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
            <div className="bg-[#121622] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Ruas Jalan Terpilih</h3>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {selectedSegment.name}
                  </p>
                  <p className="text-[10px] text-slate-500">{selectedSegment.corridor}</p>
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
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${pciBadgeBg}`}>
                  {pciCategory}
                </span>
                <div className="text-right">
                  <span className="text-[9.5px] text-slate-400 block uppercase">PCI Terakhir</span>
                  <span className={`text-base font-black font-mono ${pciColor}`}>{pciValue}</span>
                </div>
              </div>

              {/* Length & Last Update */}
              <div className="grid grid-cols-2 gap-2 bg-[#181e2f] p-3 rounded-2xl border border-white/5 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Panjang Segmen</span>
                  <span className="font-bold text-slate-200">{selectedSegment.lengthKm * 1000} m</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Update Terakhir</span>
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
                  <span className="text-[9.5px] font-bold">Navigasi</span>
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
                  <span className="text-[9.5px] font-bold">Detail Teknis</span>
                </button>

                {/* 3. Riwayat */}
                <button
                  onClick={() => alert(`Riwayat Penurunan Segmen ${selectedSegment.name}:\n- 2024: PCI 78 (Baik)\n- 2025: PCI 68 (Perlu Perhatian)\n- 2026: PCI ${pciValue} (${pciCategory})`)}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer group"
                  title="Riwayat Degradasi Jalan"
                >
                  <History className="w-4 h-4 mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-bold">Riwayat</span>
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
                  <FileDown className="w-4 h-4 mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-bold">Unduh Data</span>
                </button>
              </div>

              {/* Rekomendasi Tindakan Card */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Rekomendasi Tindakan
                  </span>
                  <Wrench className="w-4 h-4 text-emerald-400 opacity-60" />
                </div>
                <p className="text-xs font-bold text-slate-200 leading-snug">
                  Lakukan penanganan pemeliharaan rutin dalam 3 bulan ke depan
                </p>
                <p className="text-[10px] text-slate-400">
                  Rekomendasi tebal overlay AC-WC: {selectedSegment.wimDetails?.overlayRecommendationCm || 6.5} cm.
                </p>
              </div>

              {/* Laporan Terbaru di Segmen Ini */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Laporan Terbaru di Segmen Ini</span>
                  <button
                    onClick={onNavigateToMap}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                <div className="bg-[#181e2f] border border-white/5 p-3 rounded-2xl flex items-center space-x-3">
                  <img
                    src={activeReport.photoUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80'}
                    alt="Kerusakan"
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-white truncate">{activeReport.damageTypeLabel}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-orange-500/20 text-orange-300">
                        {activeReport.severity}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                      Oleh: {activeReport.reporterName}
                    </p>
                    <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                      {activeReport.timestamp}
                    </p>
                  </div>
                </div>

                {/* Pagination Indicator Dots */}
                <div className="flex items-center justify-center space-x-1 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
              </div>

              {/* Checklist Pemeriksaan Lapangan (0/5) */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Checklist Pemeriksaan Lapangan</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
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
                    if (completedChecklistCount === 5) {
                      alert('Checklist pemeriksaan selesai 100%! Data terverifikasi tersimpan dalam sistem.');
                    } else {
                      setChecklist({
                        damage_type: true,
                        dimension: true,
                        photo: true,
                        drainage: true,
                        recommendation: true
                      });
                      alert('Memulai mode pemeriksaan lapangan terpandu.');
                    }
                  }}
                  className="w-full mt-2 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{completedChecklistCount === 5 ? 'Pemeriksaan Selesai' : 'Mulai Pemeriksaan'}</span>
                </button>
              </div>
            </div>

            {/* Dokumen & Referensi Box */}
            <div className="bg-[#121622] border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white">Dokumen & Referensi</h3>
                <span className="text-[11px] text-amber-400 font-bold cursor-pointer" onClick={() => setActiveModal('DAMAGE_CATALOG')}>
                  Lihat Semua
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Doc 1 */}
                <div
                  onClick={() => {
                    if (currentResult) {
                      generateOfficialReportPdf(currentResult, 'FIELD_ENGINEER');
                    } else {
                      alert('Mengunduh Manual Survei Kondisi Jalan Bina Marga 2024 (PDF)...');
                    }
                  }}
                  className="flex items-center justify-between p-3 bg-[#181e2f] hover:bg-[#20283e] border border-white/5 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Manual Survei Jalan 2024</h4>
                      <span className="text-[10px] text-slate-400">PDF &bull; 8.4 MB</span>
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
                  className="flex items-center justify-between p-3 bg-[#181e2f] hover:bg-[#20283e] border border-white/5 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Standar Penilaian Kondisi Jalan (PCI)</h4>
                      <span className="text-[10px] text-slate-400">PDF &bull; 5.1 MB</span>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/20 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
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
              className="w-full py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Mengerti & Tutup Panduan
            </button>
          </div>
        </div>
      )}

      {/* B. Damage Catalog Modal (19 Jenis Kerusakan Bina Marga) */}
      {activeModal === 'DAMAGE_CATALOG' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/20 rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
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
                <p className="text-slate-400 text-[11px] mt-1">Cekungan mangkok dengan diameter &gt; 15 cm dan kedalaman &gt; 2.5 cm.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-amber-400 block">2. Retak Kulit Buaya (Alligator Crack)</span>
                <p className="text-slate-400 text-[11px] mt-1">Retak saling sambung membentuk pola poligon akibat kelelahan beban berulang.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-cyan-400 block">3. Alur Roda (Rutting)</span>
                <p className="text-slate-400 text-[11px] mt-1">Depresi memanjang pada jalur jejak roda akibat deformasi plastis lapisan aspal/tanah.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-emerald-400 block">4. Retak Memanjang & Melintang</span>
                <p className="text-slate-400 text-[11px] mt-1">Retak garis lurus searah atau memotong sumbu jalan karena susut termal/sambungan.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-indigo-400 block">5. Amblas / Penurunan (Depression)</span>
                <p className="text-slate-400 text-[11px] mt-1">Penurunan lokal permukaan perkerasan akibat konsolidasi tanah dasar yang tidak merata.</p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-purple-400 block">6. Jembul / Keriting (Corrugation & Shoving)</span>
                <p className="text-slate-400 text-[11px] mt-1">Gelombang transversal akibat gaya gesek pengereman kendaraan berat di persimpangan.</p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer"
            >
              Tutup Katalog
            </button>
          </div>
        </div>
      )}

      {/* C. Task Detail Modal */}
      {activeModal === 'TASK_DETAIL' && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/20 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-400 font-mono">{selectedTask.id}</span>
                <h3 className="text-base font-bold text-white">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Lokasi:</span>
                <span className="font-bold text-white">{selectedTask.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Batas Waktu:</span>
                <span className="font-bold text-rose-400">{selectedTask.deadline}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400">{selectedTask.status}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 mt-2">
                <span className="font-bold text-slate-200 block mb-1">Instruksi Teknis:</span>
                <p className="text-slate-400">{selectedTask.notes}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  alert(`Memulai pelaksanaan tugas: ${selectedTask.title}`);
                  setActiveModal(null);
                }}
                className="py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                Mulai Tugas Lapangan
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 rounded-2xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
