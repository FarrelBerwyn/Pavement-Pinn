import React, { useState, useMemo } from 'react';
import {
  RoadSegment,
  SimulationResult,
  DamageReport
} from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
import { runPinnSimulation } from '../../engines/pinn/core/pinnEngine';
import { StrategicPolicyMapView } from './StrategicPolicyMapView';
import { NationalRoadHealthMap } from '../road-health/NationalRoadHealthMap';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  FileDown,
  Sparkles,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building2,
  Landmark,
  FileText,
  MapPin,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Send,
  Download,
  Share2,
  Clock,
  ShieldAlert,
  BarChart2,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Users,
  Percent,
  Leaf,
  Plus,
  Minus,
  Info,
  Calendar,
  Wallet,
  ArrowUpRight,
  HardHat,
  Search,
  CheckCircle,
  HelpCircle,
  Headphones,
  Settings,
  LogOut,
  Bell,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';

export type PolicyTabType =
  | 'RINGKASAN_EKSEKUTIF'
  | 'PETA_STRATEGIS'
  | 'KINERJA_JALAN'
  | 'KESEHATAN_JALAN'
  | 'PRIORITAS_NASIONAL'
  | 'PROGRAM_PRIORITAS'
  | 'ANGGARAN_REALISASI'
  | 'ANGGARAN_INVESTASI'
  | 'DAMPAK_EKONOMI'
  | 'PROYEKSI_5_TAHUN'
  | 'LAPORAN_DOKUMEN'
  | 'PENGATURAN';

interface ExecutivePolicyViewProps {
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  simulationResult: SimulationResult | null;
  communityReports: DamageReport[];
  onOpenSimulation?: (segment: RoadSegment) => void;
  onNavigateToMap: () => void;
  activeNavTab?: PolicyTabType;
  onChangeNavTab?: (tab: PolicyTabType) => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const ExecutivePolicyView: React.FC<ExecutivePolicyViewProps> = ({
  currentAccount,
  roadSegments,
  selectedSegment,
  onSelectSegment,
  simulationResult,
  communityReports,
  onOpenSimulation,
  onNavigateToMap,
  activeNavTab = 'PETA_STRATEGIS',
  onChangeNavTab,
  onOpenSettings,
  onLogout
}) => {
  // Internal tab state if not controlled externally
  const [internalTab, setInternalTab] = useState<PolicyTabType>('PETA_STRATEGIS');
  const activeTab = activeNavTab || internalTab;

  const setActiveTab = (tab: PolicyTabType) => {
    if (onChangeNavTab) {
      onChangeNavTab(tab);
    }
    setInternalTab(tab);
  };

  // Selected period filter
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Mei 2025');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState<boolean>(false);
  const [isProvinceModalOpen, setIsProvinceModalOpen] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Map zoom level simulation
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapLayer, setMapLayer] = useState<'RHI' | 'ODOL' | 'BUDGET'>('RHI');
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  // Policy Scenario Interactive Controls
  const [odolEnforcementLevel, setOdolEnforcementLevel] = useState<number>(78);
  const [budgetIncreasePercent, setBudgetIncreasePercent] = useState<number>(25);
  const [projectionHorizonYears, setProjectionHorizonYears] = useState<number>(5);
  const [weatherCondition, setWeatherCondition] = useState<'NORMAL' | 'EXTREME_RAIN'>('NORMAL');
  const [selectedBriefFormat, setSelectedBriefFormat] = useState<'MINISTRY_NOTE' | 'DPR_HEARING' | 'INTER_AGENCY'>('MINISTRY_NOTE');
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);

  // Corridor Budget Allocation Table State
  const [allocatedBudgets, setAllocatedBudgets] = useState<Record<string, { approved: boolean; amountMiliar: number }>>({
    'pantura-km62': { approved: true, amountMiliar: 12.5 },
    'jagorawi-km48': { approved: true, amountMiliar: 6.8 },
    'trans-sumatra-km114': { approved: false, amountMiliar: 18.2 },
    'cipularang-km92': { approved: true, amountMiliar: 9.4 },
    'arteri-cikarang': { approved: false, amountMiliar: 14.0 },
    'pantura-kendal': { approved: false, amountMiliar: 11.2 }
  });

  const handleToggleBudgetApproval = (segmentId: string) => {
    setAllocatedBudgets((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        approved: !prev[segmentId]?.approved
      }
    }));
  };

  const handleUpdateBudgetAmount = (segmentId: string, amount: number) => {
    setAllocatedBudgets((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        amountMiliar: Math.max(0, amount)
      }
    }));
  };

  // Sparkline data for RHI KPI Card (National Trend)
  const sparklineData = [
    { month: 'Nov', rhi: 68.2 },
    { month: 'Des', rhi: 68.9 },
    { month: 'Jan', rhi: 69.1 },
    { month: 'Feb', rhi: 68.8 },
    { month: 'Mar', rhi: 69.7 },
    { month: 'Apr', rhi: 69.2 },
    { month: 'Mei', rhi: 72.4 }
  ];

  // 5 Provinces with Lowest RHI (From screenshot)
  const lowestRhiProvinces = [
    { rank: 1, name: 'Papua Pegunungan', rhi: 34.2, status: 'Sangat Buruk', colorClass: 'bg-amber-400 text-white', badgeClass: 'bg-rose-50 text-rose-600 border border-rose-200' },
    { rank: 2, name: 'Papua', rhi: 38.7, status: 'Buruk', colorClass: 'bg-orange-500 text-white', badgeClass: 'bg-orange-50 text-orange-600 border border-orange-200' },
    { rank: 3, name: 'Nusa Tenggara Timur', rhi: 45.1, status: 'Buruk', colorClass: 'bg-amber-500 text-white', badgeClass: 'bg-orange-50 text-orange-600 border border-orange-200' },
    { rank: 4, name: 'Kalimantan Tengah', rhi: 48.9, status: 'Buruk', colorClass: 'bg-amber-400 text-white', badgeClass: 'bg-orange-50 text-orange-600 border border-orange-200' },
    { rank: 5, name: 'Maluku', rhi: 50.3, status: 'Sedang', colorClass: 'bg-emerald-500 text-white', badgeClass: 'bg-amber-50 text-amber-600 border border-amber-200' }
  ];

  // All 38 Provinces database for modal/view
  const allProvincesData = [
    { name: 'Papua Pegunungan', rhi: 34.2, status: 'Sangat Buruk', km: 245.0, island: 'Papua' },
    { name: 'Papua', rhi: 38.7, status: 'Buruk', km: 412.5, island: 'Papua' },
    { name: 'Papua Barat Daya', rhi: 41.2, status: 'Buruk', km: 310.0, island: 'Papua' },
    { name: 'Nusa Tenggara Timur', rhi: 45.1, status: 'Buruk', km: 580.4, island: 'Nusa Tenggara' },
    { name: 'Kalimantan Tengah', rhi: 48.9, status: 'Buruk', km: 287.6, island: 'Kalimantan' },
    { name: 'Maluku', rhi: 50.3, status: 'Sedang', km: 215.8, island: 'Maluku' },
    { name: 'Maluku Utara', rhi: 52.1, status: 'Sedang', km: 198.4, island: 'Maluku' },
    { name: 'Sulawesi Barat', rhi: 55.4, status: 'Sedang', km: 340.2, island: 'Sulawesi' },
    { name: 'Sumatera Selatan', rhi: 58.2, status: 'Sedang', km: 620.1, island: 'Sumatera' },
    { name: 'Lampung', rhi: 61.5, status: 'Sedang', km: 512.0, island: 'Sumatera' },
    { name: 'Jawa Barat', rhi: 74.8, status: 'Baik', km: 1240.5, island: 'Jawa' },
    { name: 'Jawa Tengah', rhi: 76.2, status: 'Baik', km: 1180.2, island: 'Jawa' },
    { name: 'Jawa Timur', rhi: 78.5, status: 'Baik', km: 1350.0, island: 'Jawa' },
    { name: 'Bali', rhi: 84.1, status: 'Baik', km: 420.0, island: 'Bali' },
    { name: 'DI Yogyakarta', rhi: 86.4, status: 'Baik', km: 290.0, island: 'Jawa' }
  ];

  // Budget Allocation Donut Chart Data (Exact from screenshot Rp 118.5 T)
  const budgetAllocationData = [
    { name: 'Preservasi Jalan', amount: 'Rp 32.3 T', percent: 27, value: 32.3, color: '#10b981' },
    { name: 'Peningkatan Jalan', amount: 'Rp 36.1 T', percent: 30, value: 36.1, color: '#84cc16' },
    { name: 'Pembangunan Baru', amount: 'Rp 28.4 T', percent: 24, value: 28.4, color: '#f59e0b' },
    { name: 'Jembatan', amount: 'Rp 15.6 T', percent: 13, value: 15.6, color: '#8b5cf6' },
    { name: 'Lainnya', amount: 'Rp 6.1 T', percent: 6, value: 6.1, color: '#06b6d4' }
  ];

  // Official Documents & Reports (Exact from screenshot)
  const officialDocuments = [
    {
      id: 'doc-01',
      title: 'Laporan Kesehatan Jalan Nasional - Mei 2025',
      size: 'PDF • 24.5 MB',
      type: 'Laporan Bulanan',
      downloadName: 'Laporan_Kesehatan_Jalan_Nasional_Mei_2025.pdf'
    },
    {
      id: 'doc-02',
      title: 'Proyeksi Anggaran & Dampak 2025-2030',
      size: 'PDF • 18.7 MB',
      type: 'Kajian Strategis',
      downloadName: 'Proyeksi_Anggaran_Dampak_2025_2030.pdf'
    },
    {
      id: 'doc-03',
      title: 'Analisis Koridor Prioritas Nasional',
      size: 'PDF • 15.3 MB',
      type: 'Analisis Teknis',
      downloadName: 'Analisis_Koridor_Prioritas_Nasional_2025.pdf'
    }
  ];

  // Download simulation handler
  const handleDownloadReport = (title: string) => {
    const sim = simulationResult || runPinnSimulation({
      segmentId: selectedSegment.id,
      axleLoadTon: 18,
      rainIntensityMmHr: 45,
      floodDurationHours: 12,
      surfaceTemperatureC: 38,
      subgradeCbrPercent: 5.5,
      asphaltThicknessCm: 15,
      asphaltModulusMpa: 2800,
      targetDevice: 'CPU',
      precisionMode: 'FP32'
    }, selectedSegment);
    generateOfficialReportPdf(sim, currentAccount.role);
    setDownloadSuccessToast(`Laporan "${title}" berhasil diunduh.`);
    setTimeout(() => setDownloadSuccessToast(null), 3500);
  };

  // Copy memo function
  const handleCopyMemo = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const executiveBriefs = {
    MINISTRY_NOTE: {
      title: 'Nota Dinas Resmi: Usulan Alokasi Preservasi Dini Jaringan Jalan Nasional 2026–2030',
      to: 'Menteri Pekerjaan Umum & Kepala Bappenas',
      from: 'Dr. Ir. Retno Wulandari, M.Sc. (Direktur Ketahanan Perkerasan Jalan)',
      date: '23 Mei 2025',
      content: `1. LATAR BELAKANG & TEMUAN UTAMA:
Berdasarkan data Buku Kondisi Jalan Nasional Semester I 2025, panjang jalan tidak mantap tercatat 1.246 km (2,6% dari total 48.573 km). Model Physics-Informed Neural Network (PINN) membuktikan bahwa intervensi perbaikan lapis aus AC-WC pada fase lelah elastis menghemat biaya rekonstruksi hingga 68,4%.

2. DAMPAK TRUK ODOL & REKOMENDASI ZERO ODOL:
Kerugian ekonomi tahunan akibat kendaraan ODOL tercatat Rp 43,4 Triliun - Rp 47,43 Triliun. Penegakan terintegrasi sensor WIM dan PINN diproyeksikan menghemat belanja preservasi APBN Rp 15,7 Triliun dalam 5 tahun.

3. REKOMENDASI ALOKASI ANGGARAN:
Diusulkan pagu preservasi sebesar Rp 32,3 Triliun difokuskan pada koridor prioritas logistik nasional dengan BCR 3,42.`
    },
    DPR_HEARING: {
      title: 'Bahan Paparan Rapat Dengar Pendapat (RDP) Komisi V DPR RI',
      to: 'Ketua dan Anggota Komisi V DPR RI',
      from: 'Kementerian PU & Bappenas RI',
      date: 'Masa Sidang V 2025',
      content: `POKOK-POKOK PENJELASAN EKSEKUTIF PRESERVASI JALAN NASIONAL:

A. AKUNTABILITAS ANGGARAN PRESERVASI (PAGU RP 32,3 TRILIUN):
- Penggunaan teknologi Edge AI & PINN memastikan anggaran dialokasikan berdasarkan kalkulasi regangan fisis struktur.
- Menghentikan pemborosan siklus tambal sulam reaktif.

B. DISPARITAS WILAYAH:
- Alokasi afirmasi difokuskan pada wilayah dengan RHI terendah: Papua Pegunungan (34.2), Papua (38.7), dan NTT (45.1).`
    },
    INTER_AGENCY: {
      title: 'Memo Koordinasi Lintas Kementerian (PUPR - Kemenhub - Korlantas Polri)',
      to: 'Dirjen Perhubungan Darat Kemenhub & Kakorlantas Polri',
      from: 'Executive Policy Board PAVEMENT-PINN',
      date: 'Mei 2025',
      content: `POKOK KESEPAKATAN INTEGRASI SISTEM & PENEGAKAN ZERO ODOL 2027:

1. INTEGRASI DATA UJI KENDARAAN:
Penyatuan API Weigh-In-Motion (WIM) Kemenhub dengan Engine Prediksi Struktural PINN Bina Marga.

2. AMBANG BATAS DINAMIS SAAT MUSIM HUJAN:
Ketika curah hujan ekstrem menurunkan daya dukung tanah dasar CBR, batas izin tonase pada koridor rawan diturunkan 15% secara situasional.`
    }
  };

  return (
    <div className="w-full min-h-full bg-[#f8fafc] text-slate-800 font-sans select-none antialiased flex flex-col">
      {/* Toast Notification for Downloads */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm font-medium border border-white/10 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* SUB-VIEW 1: RINGKASAN EKSEKUTIF (EXACT MATCH WITH ATTACHED SCREENSHOT) */}
      {activeTab === 'RINGKASAN_EKSEKUTIF' && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ringkasan Eksekutif</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Pandangan strategis kondisi jalan nasional untuk pengambilan keputusan
              </p>
            </div>

            {/* Date / Period Selector */}
            <div className="relative">
              <button
                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                className="flex items-center space-x-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs sm:text-sm cursor-pointer transition-all"
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Periode: {selectedPeriod}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {isPeriodDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40">
                  {['Mei 2025', 'April 2025', 'Maret 2025', 'Semester I 2025', 'Tahun Anggaran 2024'].map((period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setSelectedPeriod(period);
                        setIsPeriodDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between ${
                        selectedPeriod === period ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{period}</span>
                      {selectedPeriod === period && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TOP 4 KPI CARDS (Exact Match from Screenshot) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Indeks Kesehatan Jalan Nasional (RHI) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs sm:text-sm">
                  <span>Indeks Kesehatan Jalan Nasional (RHI)</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </div>
                <div className="flex items-baseline space-x-1.5 mt-3">
                  <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">72.4</span>
                  <span className="text-sm font-semibold text-slate-400">/100</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2">
                <div className="flex items-center space-x-1 text-emerald-600 text-xs font-bold">
                  <span>▲</span>
                  <span>3.2 poin dari Apr 2025</span>
                </div>

                {/* Mini Sparkline Chart */}
                <div className="w-24 h-9">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line
                        type="monotone"
                        dataKey="rhi"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Card 2: Total Panjang Jalan Nasional */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between relative group hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs sm:text-sm">
                  <span>Total Panjang Jalan Nasional</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight pt-1">
                  48.573 <span className="text-xl font-bold text-slate-800">km</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">100% jaringan jalan nasional</p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                {/* Road / Asphalt Icon */}
                <svg className="w-6 h-6 fill-slate-700" viewBox="0 0 24 24">
                  <path d="M4 22L8 2H10L8 22H4ZM14 22L16 2H18L20 22H16ZM11 5H13V8H11V5ZM11 11H13V14H11V11ZM11 17H13V20H11V17Z" />
                </svg>
              </div>
            </div>

            {/* Card 3: Ruas Prioritas Tinggi */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between relative group hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs sm:text-sm">
                  <span>Ruas Prioritas Tinggi</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-rose-600 tracking-tight pt-1">
                  1.246 <span className="text-xl font-bold text-rose-600">km</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">2.6% dari total panjang</p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Estimasi Kebutuhan Anggaran */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between relative group hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs sm:text-sm">
                  <span>Estimasi Kebutuhan Anggaran</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight pt-1">
                  <span className="text-xl font-bold text-slate-800 mr-1">Rp</span>28.4 <span className="text-xl font-bold text-slate-800">T</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Untuk 5 tahun ke depan</p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: MAP (2/3) + 5 LOWEST RHI PROVINCES (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Peta Kesehatan Jalan Nasional with Leaflet Light GIS */}
            <div className="lg:col-span-8">
              <NationalRoadHealthMap onNavigateToMap={onNavigateToMap} />
            </div>

            {/* 5 Provinsi dengan RHI Terendah (Exact from screenshot) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1.5 text-slate-800 font-extrabold text-sm sm:text-base">
                    <span>5 Provinsi dengan RHI Terendah</span>
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                  </div>
                  <button
                    onClick={() => setIsProvinceModalOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                {/* Numbered List of 5 Provinces */}
                <div className="space-y-3.5">
                  {lowestRhiProvinces.map((prov) => (
                    <div
                      key={prov.rank}
                      onClick={() => onNavigateToMap()}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Number Circle */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${prov.colorClass}`}>
                          {prov.rank}
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate group-hover:text-amber-600 transition-colors">
                          {prov.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="font-extrabold text-sm text-slate-900">{prov.rhi}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${prov.badgeClass}`}>
                          {prov.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Link */}
              <div className="pt-3 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsProvinceModalOpen(true)}
                  className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <span>Seluruh Provinsi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: 3 COLUMNS (Exact from screenshot) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Col 1: Alokasi Anggaran 2025 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-slate-800 font-extrabold text-sm sm:text-base mb-3">
                  <span>Alokasi Anggaran 2025</span>
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                </div>

                <div className="flex items-center gap-3">
                  {/* Donut Chart with Center Text */}
                  <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={budgetAllocationData}
                          innerRadius={44}
                          outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {budgetAllocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-xs font-extrabold text-slate-900 leading-tight">Rp 118.5 T</span>
                      <span className="text-[10px] font-semibold text-slate-400">Total</span>
                    </div>
                  </div>

                  {/* Legend items with values */}
                  <div className="space-y-1.5 text-[11px] font-semibold flex-1 min-w-0">
                    {budgetAllocationData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                          <span className="text-slate-600 truncate">{item.name}</span>
                        </div>
                        <span className="text-slate-800 font-bold ml-1 shrink-0">{item.amount} ({item.percent}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium mt-4 pt-2 border-t border-slate-100">
                Sumber: Kementerian PUPR, 2025
              </p>
            </div>

            {/* Col 2: Proyeksi Dampak 5 Tahun (2025-2030) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-slate-800 font-extrabold text-sm sm:text-base mb-3">
                  <span>Proyeksi Dampak 5 Tahun (2025-2030)</span>
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                </div>

                <div className="space-y-3.5">
                  {/* Item 1: Potensi Penghematan */}
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-600">Potensi Penghematan</p>
                      <div className="flex items-baseline space-x-2 mt-0.5">
                        <span className="text-base font-extrabold text-slate-900">Rp 15.7 T</span>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded-md">
                          ▲ 23%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Dengan strategi preventif</p>
                    </div>
                  </div>

                  {/* Item 2: Penurunan Kerusakan Berat */}
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <HardHat className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-600">Penurunan Kerusakan Berat</p>
                      <div className="flex items-baseline space-x-2 mt-0.5">
                        <span className="text-base font-extrabold text-slate-900">620 km</span>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded-md">
                          ▲ 41%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Dibanding skenario reaktif</p>
                    </div>
                  </div>

                  {/* Item 3: Peningkatan RHI Nasional */}
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-600">Peningkatan RHI Nasional</p>
                      <div className="flex items-baseline space-x-2 mt-0.5">
                        <span className="text-base font-extrabold text-slate-900">76.8</span>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded-md">
                          ▲ 4.4 poin
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Target pada tahun 2030</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-slate-100 flex justify-start">
                <button
                  onClick={() => setActiveTab('DAMPAK_EKONOMI')}
                  className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <span>Lihat Analisis Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Col 3: Dokumen & Laporan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-slate-800 font-extrabold text-sm sm:text-base mb-3">
                  <span>Dokumen & Laporan</span>
                </div>

                <div className="space-y-3">
                  {officialDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group cursor-pointer"
                      onClick={() => handleDownloadReport(doc.title)}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-amber-600 transition-colors">
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">{doc.size}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadReport(doc.title);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
                        title="Unduh Dokumen"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-slate-100 flex justify-start">
                <button
                  onClick={() => setActiveTab('LAPORAN_DOKUMEN')}
                  className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <span>Lihat Semua Dokumen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM BLUE CALLOUT BANNER (Exact from screenshot) */}
          <div className="bg-[#eef6ff] border border-[#d0e4ff] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start sm:items-center space-x-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Keputusan berbasis data untuk infrastruktur jalan yang lebih baik
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Gunakan data PAVEMENT-PINN untuk perencanaan, penganggaran, dan kebijakan yang lebih tepat sasaran.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('DAMPAK_EKONOMI')}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl border border-slate-300 shadow-sm text-xs sm:text-sm flex items-center space-x-2 shrink-0 cursor-pointer transition-all hover:border-slate-400"
            >
              <span>Pelajari Lebih Lanjut</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: PETA STRATEGIS (EXECUTIVE STRATEGIC MAP WITH PINN & REGIONAL CLUSTERS) */}
      {activeTab === 'PETA_STRATEGIS' && (
        <div className="w-full h-[calc(100vh-64px)] relative flex flex-col flex-1">
          <StrategicPolicyMapView
            roadSegments={roadSegments}
            selectedSegment={selectedSegment}
            onSelectSegment={onSelectSegment}
            simulationResult={simulationResult}
            communityReports={communityReports}
            currentAccount={currentAccount}
            onLaunchSimulation={onOpenSimulation}
            onNavigateToDetailedTab={(tabName) => {
              if (tabName === 'INVESTASI') setActiveTab('ANGGARAN_INVESTASI');
              else if (tabName === 'PROYEKSI') setActiveTab('PROYEKSI_5_TAHUN');
              else if (tabName === 'PRIORITAS') setActiveTab('PROGRAM_PRIORITAS');
              else if (tabName === 'KESEHATAN') setActiveTab('KINERJA_JALAN');
            }}
          />
        </div>
      )}

      {/* SUB-VIEW 3: KESEHATAN JALAN / KINERJA JALAN */}
      {(activeTab === 'KESEHATAN_JALAN' || activeTab === 'KINERJA_JALAN') && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Kesehatan Jalan Nasional (RHI & PCI)</h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Monitoring kemantapan jalan, lendutan FWD, dan indeks retak fatigue per provinsi
              </p>
            </div>
            <button
              onClick={onNavigateToMap}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Buka Peta Interaktif & Segmen</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800 mb-4">Peringkat Kesehatan Jalan 38 Provinsi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="pb-3 px-3">Provinsi</th>
                    <th className="pb-3 px-3">Wilayah</th>
                    <th className="pb-3 px-3">Panjang Jalan (km)</th>
                    <th className="pb-3 px-3">Indeks RHI</th>
                    <th className="pb-3 px-3">Status Kemantapan</th>
                    <th className="pb-3 px-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allProvincesData.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-medium">
                      <td className="py-3 px-3 font-bold text-slate-800">{p.name}</td>
                      <td className="py-3 px-3 text-slate-600">{p.island}</td>
                      <td className="py-3 px-3 text-slate-800">{p.km} km</td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">{p.rhi}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Sangat Buruk'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : p.status === 'Buruk'
                              ? 'bg-orange-50 text-orange-600 border border-orange-200'
                              : p.status === 'Sedang'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={onNavigateToMap}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        >
                          Lihat Segmen →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: PRIORITAS NASIONAL / PROGRAM PRIORITAS */}
      {(activeTab === 'PRIORITAS_NASIONAL' || activeTab === 'PROGRAM_PRIORITAS') && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Koridor Prioritas Nasional & Penanganan Kritis</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Daftar 1.246 km ruas prioritas tinggi yang membutuhkan intervensi struktural segera
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roadSegments.map((segment) => {
              const pci = segment.currentPci ?? 70;
              const lhr = (segment.dailyTrafficVolumeLhr ?? 0).toLocaleString('id-ID');
              const code = segment.kmPost || segment.id;
              const recAction =
                pci < 30
                  ? 'Rekonstruksi Penuh'
                  : pci < 50
                  ? 'Rehabilitasi & Penegakan ODOL'
                  : pci < 70
                  ? 'Mikro-Overlay & Sealing'
                  : 'Preservasi Rutin';

              return (
                <div
                  key={segment.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {code}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          pci < 50
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}
                      >
                        PCI: {pci}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 mt-2">{segment.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{segment.province} • {segment.lengthKm} km</p>

                    <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs font-semibold">
                      <div className="flex justify-between text-slate-600">
                        <span>Lalu Lintas Harian (LHR):</span>
                        <span className="text-slate-900">{lhr} kend/hari</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kadar ODOL Logistik:</span>
                        <span className="text-rose-600 font-bold">{segment.heavyVehiclePercent}%</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Rekomendasi PINN:</span>
                        <span className="text-amber-700 font-bold">{recAction}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        onSelectSegment(segment);
                        if (onOpenSimulation) onOpenSimulation(segment);
                      }}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700"
                    >
                      Simulasi PINN →
                    </button>
                    <button
                      onClick={() => {
                        onSelectSegment(segment);
                        onNavigateToMap();
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      Lokasi Peta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: ANGGARAN & REALISASI / ANGGARAN INVESTASI */}
      {(activeTab === 'ANGGARAN_REALISASI' || activeTab === 'ANGGARAN_INVESTASI') && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Alokasi Anggaran & Matriks Persetujuan Pagu</h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Total Pagu Preservasi Dini: Rp 32.3 Triliun | Total Disetujui: Rp{' '}
                {(Object.values(allocatedBudgets) as Array<{ id: string; name: string; amountMiliar: number; approved: boolean }>).reduce((acc, curr) => (curr.approved ? acc + curr.amountMiliar : acc), 0).toFixed(1)}{' '}
                Miliar
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800 mb-3">Daftar Pagu Koridor Prioritas (Miliar Rupiah)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="pb-3 px-3">Koridor</th>
                    <th className="pb-3 px-3">Status Saat Ini</th>
                    <th className="pb-3 px-3">Alokasi Usulan (Miliar)</th>
                    <th className="pb-3 px-3">BCR Rasio</th>
                    <th className="pb-3 px-3">Persetujuan Eksekutif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {roadSegments.map((seg) => {
                    const budget = allocatedBudgets[seg.id] || { approved: false, amountMiliar: 10.0 };
                    return (
                      <tr key={seg.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-800">{seg.name}</td>
                        <td className="py-3 px-3 text-slate-600">{seg.province} (PCI: {seg.currentPci})</td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={budget.amountMiliar}
                            onChange={(e) => handleUpdateBudgetAmount(seg.id, parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          />
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-600">3.42x</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleBudgetApproval(seg.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              budget.approved
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {budget.approved ? '✓ Disetujui' : 'Belum Disetujui'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: DAMPAK EKONOMI / PROYEKSI 5 TAHUN */}
      {(activeTab === 'DAMPAK_EKONOMI' || activeTab === 'PROYEKSI_5_TAHUN') && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Analisis Dampak Ekonomi & Kerugian ODOL</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Kajian komparatif potensi penghematan anggaran APBN Rp 15,7 Triliun dan reduksi kerusakan
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-500">Kerugian Ekonomi ODOL / Tahun</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">Rp 43,4 T – 47,4 T</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Truk bermuatan lebih memicu eksponensial regangan tarik dasar aspal (Fourth Power Law AASHTO), memangkas umur rencana jalan hingga 60%.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-500">Potensi Efisiensi APBN 5 Tahun</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">Rp 15,7 Triliun</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Diperoleh dari transisi pemeliharaan preventif berbasis model regangan elastis PINN vs perbaikan reaktif jalan berlubang.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-500">Reduksi Emisi Karbon Konstruksi</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600">14.850 Ton CO₂</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Penurunan konsumsi aspal minyak panas dan agregat batu melalui preservasi mikro lapis tipis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: LAPORAN & DOKUMEN */}
      {activeTab === 'LAPORAN_DOKUMEN' && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Dokumen Resmi & Penyusun Nota Kebijakan AI</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Generator resmi bahan paparan RDP Komisi V DPR, Nota Dinas Menteri, dan SKB Lintas Kementerian
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Format Selector */}
            <div className="space-y-3">
              <button
                onClick={() => setSelectedBriefFormat('MINISTRY_NOTE')}
                className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedBriefFormat === 'MINISTRY_NOTE'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Landmark className="w-5 h-5" />
                  <span className="text-sm font-extrabold">Nota Dinas Resmi Menteri</span>
                </div>
                <p className="text-xs mt-1 opacity-80">Usulan Pagu Preservasi Dini Jaringan Jalan Nasional</p>
              </button>

              <button
                onClick={() => setSelectedBriefFormat('DPR_HEARING')}
                className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedBriefFormat === 'DPR_HEARING'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm font-extrabold">Bahan Paparan RDP DPR RI</span>
                </div>
                <p className="text-xs mt-1 opacity-80">Akuntabilitas Anggaran & Disparitas Wilayah</p>
              </button>

              <button
                onClick={() => setSelectedBriefFormat('INTER_AGENCY')}
                className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedBriefFormat === 'INTER_AGENCY'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-extrabold">SKB Lintas Kementerian</span>
                </div>
                <p className="text-xs mt-1 opacity-80">PUPR - Kemenhub - Korlantas Zero ODOL</p>
              </button>
            </div>

            {/* Document Preview Box */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{executiveBriefs[selectedBriefFormat].title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ditujukan kepada: {executiveBriefs[selectedBriefFormat].to}
                  </p>
                </div>
                <button
                  onClick={() => handleCopyMemo(executiveBriefs[selectedBriefFormat].content)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  {copiedMemo ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedMemo ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-800 border border-slate-200 max-h-96 overflow-y-auto">
                {executiveBriefs[selectedBriefFormat].content}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleDownloadReport(executiveBriefs[selectedBriefFormat].title)}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen PDF Resmi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 7: PENGATURAN */}
      {activeTab === 'PENGATURAN' && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Pengaturan Kebijakan & Akun Eksekutif</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Konfigurasi ambang batas RHI kritis, preferensi notifikasi, dan profil pengambil keputusan
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-2xl space-y-4">
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
              <img
                src={currentAccount.avatarUrl}
                alt={currentAccount.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-400"
              />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{currentAccount.name}</h3>
                <p className="text-xs text-slate-500">{currentAccount.agency}</p>
                <span className="inline-block mt-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Policy Maker (Bappenas / Ditjen Bina Marga)
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Ambang Batas Intervensi Dini (RHI)</p>
                  <p className="text-[10px] text-slate-500">Pemicu otomatis SPK preservasi ketika RHI turun</p>
                </div>
                <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                  RHI &lt; 70
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Sensor Weigh-in-Motion (WIM) Terhubung</p>
                  <p className="text-[10px] text-slate-500">Pembaruan real-time muatan tonase gandar</p>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  42 Jembatan Timbang
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Seluruh Provinsi Daftar Lengkap */}
      {isProvinceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Daftar Indeks Kesehatan Jalan Nasional</h3>
                <p className="text-xs text-slate-500">Evaluasi RHI 38 Provinsi Semester I 2025</p>
              </div>
              <button
                onClick={() => setIsProvinceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-2.5 flex-1 pr-1 custom-scrollbar">
              {allProvincesData.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.island} • {p.km} km</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-extrabold text-slate-900">{p.rhi}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'Sangat Buruk'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : p.status === 'Buruk'
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : p.status === 'Sedang'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsProvinceModalOpen(false)}
                className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800"
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
