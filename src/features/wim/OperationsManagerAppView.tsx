import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileDown,
  Compass,
  Layers,
  Camera,
  Activity,
  Sliders,
  Share2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileText,
  Building2,
  Navigation,
  Scale,
  Zap,
  Cpu,
  MapPin,
  ExternalLink,
  Edit3,
  ThumbsUp,
  X,
  Printer,
  Car,
  AlertCircle
} from 'lucide-react';
import { RoadSegment, SimulationResult, DamageReport, WimStationDetails } from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
import confetti from 'canvas-confetti';

interface OperationsManagerAppViewProps {
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  simulationResult: SimulationResult | null;
  communityReports: DamageReport[];
  onOpenCreateReport: () => void;
  onEditReport?: (report: DamageReport) => void;
  onUpvoteReport?: (reportId: string) => void;
  onLaunchSimulation: (segment: RoadSegment) => void;
  onNavigateToMap?: () => void;
  onNavigateToEngineering?: () => void;
  onNavigateToRoadHistory?: () => void;
  onNavigateToTechnicalRef?: () => void;
  initialTab?: 'LIVE_WIM' | 'ENFORCEMENT_BATM' | 'DYNAMIC_TONNAGE' | 'COMMUNITY_WIM' | 'DISPATCH';
}

interface WIMLiveRecord {
  id: string;
  plate: string;
  vehicleClass: string;
  axleCount: number;
  axleLoadTon: number;
  legalLimitTon: number;
  overloadPercent: number;
  speedKmh: number;
  stationName: string;
  status: 'SAFE' | 'WARNING' | 'ODOL_VIOLATION';
  timestamp: string;
  cctvSnapshotUrl: string;
  driverName?: string;
  companyName?: string;
}

export const OperationsManagerAppView: React.FC<OperationsManagerAppViewProps> = ({
  currentAccount,
  roadSegments,
  selectedSegment,
  onSelectSegment,
  simulationResult,
  communityReports,
  onOpenCreateReport,
  onEditReport,
  onUpvoteReport,
  onLaunchSimulation,
  onNavigateToMap,
  onNavigateToEngineering,
  onNavigateToRoadHistory,
  onNavigateToTechnicalRef,
  initialTab
}) => {
  // Active Tab inside Operations View
  const [activeOpsTab, setActiveOpsTab] = useState<
    'LIVE_WIM' | 'ENFORCEMENT_BATM' | 'DYNAMIC_TONNAGE' | 'COMMUNITY_WIM' | 'DISPATCH'
  >(initialTab || 'LIVE_WIM');

  useEffect(() => {
    if (initialTab) {
      setActiveOpsTab(initialTab);
    }
  }, [initialTab]);

  // Filter for WIM Live records
  const [wimFilter, setWimFilter] = useState<'ALL' | 'ODOL' | 'WARNING' | 'SAFE'>('ALL');
  const [searchTruckQuery, setSearchTruckQuery] = useState<string>('');

  // Dynamic Tonnage Weather Simulator State
  const [simRainMmHr, setSimRainMmHr] = useState<number>(45);
  const [simCbrPercent, setSimCbrPercent] = useState<number>(selectedSegment.defaultCbrPercent || 5.2);
  const [simFloodDurationHours, setSimFloodDurationHours] = useState<number>(4);

  // Live WIM sensor stream state
  const [wimStream, setWimStream] = useState<WIMLiveRecord[]>([
    {
      id: 'WIM-2026-081',
      plate: 'B 9482 UT',
      vehicleClass: 'Golongan 6B - Truk Tronton 3 Sumbu',
      axleCount: 3,
      axleLoadTon: 24.8,
      legalLimitTon: 10.0,
      overloadPercent: 148,
      speedKmh: 42,
      stationName: 'WIM Balonggandu KM 62 (Pantura)',
      status: 'ODOL_VIOLATION',
      timestamp: 'Baru saja (0.2s lalu)',
      cctvSnapshotUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=400',
      driverName: 'Rahmat Hidayat (SIM B2 Umum)',
      companyName: 'PT. Lintas Jawa Logistik'
    },
    {
      id: 'WIM-2026-082',
      plate: 'BG 8821 ZA',
      vehicleClass: 'Golongan 7B - Truk Tempelan 4 Sumbu',
      axleCount: 4,
      axleLoadTon: 26.2,
      legalLimitTon: 12.0,
      overloadPercent: 118,
      speedKmh: 38,
      stationName: 'WIM Betung KM 114 (Trans-Sumatra)',
      status: 'ODOL_VIOLATION',
      timestamp: '2 menit lalu',
      cctvSnapshotUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=400',
      driverName: 'Suryanto (SIM B2 Umum)',
      companyName: 'CV. Sumatra Trans Mandiri'
    },
    {
      id: 'WIM-2026-083',
      plate: 'E 8831 AA',
      vehicleClass: 'Golongan 5 - Truk Fuso 2 Sumbu',
      axleCount: 2,
      axleLoadTon: 14.5,
      legalLimitTon: 10.0,
      overloadPercent: 45,
      speedKmh: 58,
      stationName: 'WIM Cikarang Utama KM 31',
      status: 'WARNING',
      timestamp: '5 menit lalu',
      cctvSnapshotUrl: 'https://images.unsplash.com/photo-1586191582056-a6b1424e650b?auto=format&fit=crop&q=80&w=400',
      driverName: 'Agus Salim',
      companyName: 'PT. Angkutan Mandiri Perkasa'
    },
    {
      id: 'WIM-2026-084',
      plate: 'DK 9012 B',
      vehicleClass: 'Golongan 4 - Truk Sedang 2 Sumbu',
      axleCount: 2,
      axleLoadTon: 8.8,
      legalLimitTon: 10.0,
      overloadPercent: 0,
      speedKmh: 65,
      stationName: 'WIM Losarang KM 74 (Indramayu)',
      status: 'SAFE',
      timestamp: '8 menit lalu',
      cctvSnapshotUrl: 'https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?auto=format&fit=crop&q=80&w=400',
      driverName: 'I Made Suartana',
      companyName: 'PT. Bali Cargo Express'
    },
    {
      id: 'WIM-2026-085',
      plate: 'KH 8102 FA',
      vehicleClass: 'Golongan 6A - Truk Tronton Tangki',
      axleCount: 3,
      axleLoadTon: 23.4,
      legalLimitTon: 10.0,
      overloadPercent: 134,
      speedKmh: 45,
      stationName: 'WIM Balonggandu KM 62 (Pantura)',
      status: 'ODOL_VIOLATION',
      timestamp: '14 menit lalu',
      cctvSnapshotUrl: 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&q=80&w=400',
      driverName: 'Dedi Kurniawan',
      companyName: 'PT. Borneo Energi Pratama'
    }
  ]);

  // Selected Truck Record for Action Modal
  const [selectedTruckForAction, setSelectedTruckForAction] = useState<WIMLiveRecord | null>(null);
  const [activeModalType, setActiveModalType] = useState<
    'BATM_MODAL' | 'REROUTE_MODAL' | 'ETLE_MODAL' | 'ANPR_PREVIEW' | null
  >(null);

  // Enforcement feedback toast
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Trigger Action
  const handleExecuteAction = (actionTitle: string) => {
    setActionSuccessToast(actionTitle);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    setActiveModalType(null);
    setTimeout(() => setActionSuccessToast(null), 4500);
  };

  // Filtered WIM stream
  const filteredWimStream = useMemo(() => {
    return wimStream.filter((rec) => {
      if (wimFilter === 'ODOL' && rec.status !== 'ODOL_VIOLATION') return false;
      if (wimFilter === 'WARNING' && rec.status !== 'WARNING') return false;
      if (wimFilter === 'SAFE' && rec.status !== 'SAFE') return false;
      if (searchTruckQuery.trim()) {
        const q = searchTruckQuery.toLowerCase();
        return (
          rec.plate.toLowerCase().includes(q) ||
          rec.vehicleClass.toLowerCase().includes(q) ||
          rec.stationName.toLowerCase().includes(q) ||
          (rec.driverName && rec.driverName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [wimStream, wimFilter, searchTruckQuery]);

  // Dynamic Tonnage Math:
  // Base legal limit is 18 Ton. During heavy rain (e.g. >50 mm/hr) and low CBR, limit drops to 11.5 - 13.5 Ton.
  const dynamicAllowedTonnage = useMemo(() => {
    const rainFactor = Math.max(0.65, 1 - (simRainMmHr / 100) * 0.35);
    const cbrFactor = Math.min(1.15, Math.max(0.7, Math.sqrt(simCbrPercent / 6.0)));
    const calculated = 18.0 * rainFactor * cbrFactor;
    return Math.round(calculated * 10) / 10;
  }, [simRainMmHr, simCbrPercent]);

  // Fourth power law damage multiplier
  const damageFactorOverload = useMemo(() => {
    const sampleAxle = selectedSegment.defaultAxleLoadTon || 18.5;
    const baseStandard = 8.16; // Standard Single Axle Load in tons (Bina Marga MDPJ)
    const multiplier = Math.pow(sampleAxle / baseStandard, 4);
    return Math.round(multiplier * 10) / 10;
  }, [selectedSegment]);

  // Alert status derived from simulation or selected segment
  const alertStatus = simulationResult
    ? simulationResult.roleOutputs.operationsManager.alertStatus
    : selectedSegment.activeOdolAlert || 'RED';

  const operationalAlertSummary = simulationResult
    ? simulationResult.roleOutputs.operationsManager.operationalAlertSummary
    : `Peringatan Kritis ODOL di ${selectedSegment.name}. Ambang batas muatan dinamis saat cuaca basah: ${dynamicAllowedTonnage} Ton.`;

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#0b0f19] text-slate-100 font-sans pb-16">
      {/* 1. TOP HEADER BANNER: Role Identity & Traffic Light Alert System */}
      <div className="border-b border-slate-800 bg-slate-900 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-slate-800 text-rose-400 rounded-xl border border-slate-700 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] bg-rose-500/10 text-rose-300 font-mono font-semibold px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  RBAC Level 2: Operations Manager WIM & Penindakan
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                  {currentAccount.agencyCode} &bull; {currentAccount.name}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
                <span>Pusat Kendali Operasional WIM & Penindakan ODOL</span>
                <span className="text-xs font-mono font-normal text-slate-400 hidden sm:inline">
                  (Gateway Real-Time Bina Marga & Kemenhub)
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {simulationResult && (
              <button
                onClick={() => generateOfficialReportPdf(simulationResult, 'OPERATIONS_MANAGER')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-indigo-500 flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Cetak Sinyal WIM & Ringkasan Penindakan Format PDF Resmi Kemenhub"
              >
                <FileDown className="w-4 h-4 text-indigo-200" />
                <span>Cetak Sinyal WIM PDF</span>
              </button>
            )}

            <button
              onClick={onOpenCreateReport}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl border border-amber-400 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Buat Laporan Kerusakan Baru dari Lokasi Pos Timbang"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Lapor Kerusakan Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* TOAST ACTION CONFIRMATION */}
        {actionSuccessToast && (
          <div className="p-3.5 rounded-xl bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs">Instruksi Penindakan Operasional Berhasil Diterbitkan!</p>
                <p className="text-[11px] text-slate-300">{actionSuccessToast}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
              AUDIT-LOGGED
            </span>
          </div>
        )}

        {/* 2.1 REAL-TIME TRAFFIC LIGHT SIGNAL ALERT & DYNAMIC TONNAGE BANNER */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
            alertStatus === 'RED'
              ? 'bg-slate-900 border-rose-500/40'
              : alertStatus === 'YELLOW'
              ? 'bg-slate-900 border-amber-500/40'
              : 'bg-slate-900 border-emerald-500/40'
          }`}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              {/* Traffic Light Visual Indicator */}
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-xl sm:text-2xl text-white shrink-0 border ${
                  alertStatus === 'RED'
                    ? 'bg-rose-600 border-rose-500'
                    : alertStatus === 'YELLOW'
                    ? 'bg-amber-500 border-amber-400'
                    : 'bg-emerald-600 border-emerald-500'
                }`}
              >
                {alertStatus === 'RED' ? '🔴' : alertStatus === 'YELLOW' ? '🟡' : '🟢'}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Sinyal Keamanan WIM Pos Timbang:
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      alertStatus === 'RED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : alertStatus === 'YELLOW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    STATUS {alertStatus} (Kemenhub Decision Matrix)
                  </span>
                </div>

                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                  {operationalAlertSummary}
                </h2>

                <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    Ruas Terpantau: <strong className="text-white font-medium">{selectedSegment.name}</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Batas Tonase Musiman/Hujan:{' '}
                    <strong className="text-amber-300 font-mono font-semibold">{dynamicAllowedTonnage} Ton</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Daya Rusak ODOL (4th Power Law):{' '}
                    <strong className="text-rose-400 font-mono font-semibold">{damageFactorOverload}x Lebih Cepat Aus</strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Enforcement Trigger Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto shrink-0">
              <button
                onClick={() => {
                  setSelectedTruckForAction(wimStream[0]);
                  setActiveModalType('BATM_MODAL');
                }}
                className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-rose-500 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Transfer Muatan (BATM)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedTruckForAction(wimStream[0]);
                  setActiveModalType('REROUTE_MODAL');
                }}
                className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                <span>Pengalihan Rute</span>
              </button>

              <button
                onClick={() => {
                  setSelectedTruckForAction(wimStream[0]);
                  setActiveModalType('ETLE_MODAL');
                }}
                className="flex-1 sm:flex-initial bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-semibold text-xs px-3 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                title="Tilang Elektronik ETLE WIM"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tilang ETLE</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2.2 TOP 4 KPI OPERATIONAL METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Truk Melintas Hari Ini */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Total Truk WIM Hari Ini</p>
              <h3 className="text-xl font-bold text-white font-mono">1,842</h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <span>&uarr; +14.2%</span> <span className="text-slate-400">vs rerata harian</span>
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Pelanggaran ODOL Kritis */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-mono uppercase text-rose-400 font-semibold">Pelanggaran ODOL Kritis (&gt;20T)</p>
              <h3 className="text-xl font-bold text-rose-400 font-mono">142</h3>
              <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3" />
                <span>7.7% Tingkat Pelanggaran</span>
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Penindakan Berhasil & Denda */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-mono uppercase text-amber-400 font-semibold">BATM & Denda Terbit</p>
              <h3 className="text-xl font-bold text-amber-400 font-mono">Rp 182.5 Jt</h3>
              <p className="text-[11px] text-slate-300 font-medium">28 Transfer &bull; 45 Reroute</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Intel OpenVINO Edge Telemetry */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-mono uppercase text-indigo-300 font-semibold">Intel OpenVINO Edge</p>
              <h3 className="text-xl font-bold text-white font-mono">6.2 ms</h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <Cpu className="w-3 h-3 text-slate-400" />
                <span>Target &lt;10ms (NPU INT8)</span>
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* 2.3 NAVIGATION TABS INSIDE OPERATIONS MANAGER VIEW */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveOpsTab('LIVE_WIM')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeOpsTab === 'LIVE_WIM'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>POS WIM & ANPR</span>
          </button>

          <button
            onClick={() => setActiveOpsTab('ENFORCEMENT_BATM')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeOpsTab === 'ENFORCEMENT_BATM'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Penindakan ODOL (BATM)</span>
          </button>

          <button
            onClick={() => setActiveOpsTab('DYNAMIC_TONNAGE')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeOpsTab === 'DYNAMIC_TONNAGE'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Cuaca & Tonase Dinamis</span>
          </button>

          <button
            onClick={() => setActiveOpsTab('COMMUNITY_WIM')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeOpsTab === 'COMMUNITY_WIM'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kondisi Jalan & Korelasi WIM</span>
          </button>

          <button
            onClick={() => setActiveOpsTab('DISPATCH')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeOpsTab === 'DISPATCH'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rekayasa & Disposisi</span>
          </button>
        </div>

        {/* 2.4 TAB 1: LIVE WIM STREAM & ANPR CCTV SCANNER */}
        {activeOpsTab === 'LIVE_WIM' && (
          <div className="space-y-4">
            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase mr-1">Filter:</span>
                <button
                  onClick={() => setWimFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    wimFilter === 'ALL' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setWimFilter('ODOL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    wimFilter === 'ODOL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold' : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Pelanggaran ODOL
                </button>
                <button
                  onClick={() => setWimFilter('WARNING')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    wimFilter === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  Waspada
                </button>
                <button
                  onClick={() => setWimFilter('SAFE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    wimFilter === 'SAFE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  Aman
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari plat nomor, golongan, sopir..."
                  value={searchTruckQuery}
                  onChange={(e) => setSearchTruckQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* WIM Records Grid / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredWimStream.map((rec) => {
                const isOverload = rec.status === 'ODOL_VIOLATION';
                return (
                  <div
                    key={rec.id}
                    className={`bg-slate-900 border rounded-xl p-4 space-y-3 flex flex-col justify-between ${
                      isOverload ? 'border-rose-500/40' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Header: Plate & Status */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-700 text-white">
                            {rec.plate}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{rec.timestamp}</span>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            rec.status === 'ODOL_VIOLATION'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                              : rec.status === 'WARNING'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {rec.status === 'ODOL_VIOLATION' ? 'ODOL' : rec.status === 'WARNING' ? 'WASPADA' : 'AMAN'}
                        </span>
                      </div>

                      {/* CCTV ANPR Snapshot & Vehicle Info */}
                      <div className="flex items-start space-x-3 mt-2.5">
                        <div
                          className="relative w-20 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer group"
                          onClick={() => {
                            setSelectedTruckForAction(rec);
                            setActiveModalType('ANPR_PREVIEW');
                          }}
                        >
                          <img
                            src={rec.cctvSnapshotUrl}
                            alt={rec.plate}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-slate-950/90 font-mono text-cyan-300 px-1 rounded">
                            ANPR
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-bold text-white truncate">{rec.vehicleClass}</p>
                          <p className="text-[11px] text-slate-400 truncate">{rec.stationName}</p>
                          <p className="text-[11px] text-slate-400 truncate">Sopir: {rec.driverName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{rec.companyName}</p>
                        </div>
                      </div>

                      {/* Weight & Speed Metric Badges */}
                      <div className="grid grid-cols-3 gap-2 mt-2.5 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <div>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">Beban Sumbu</p>
                          <p
                            className={`text-xs font-mono font-bold ${
                              rec.axleLoadTon > 18 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {rec.axleLoadTon} Ton
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">Batas Izin</p>
                          <p className="text-xs font-mono text-slate-300">{rec.legalLimitTon} Ton</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">Overload</p>
                          <p
                            className={`text-xs font-mono font-bold ${
                              rec.overloadPercent > 50 ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            +{rec.overloadPercent}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedTruckForAction(rec);
                          setActiveModalType('BATM_MODAL');
                        }}
                        className="flex-1 bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white font-semibold text-xs py-1.5 rounded-lg border border-rose-500/30 transition-colors cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>BATM</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedTruckForAction(rec);
                          setActiveModalType('REROUTE_MODAL');
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Compass className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reroute</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedTruckForAction(rec);
                          setActiveModalType('ETLE_MODAL');
                        }}
                        className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-200 hover:text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-indigo-500/30 transition-colors cursor-pointer"
                        title="Terbitkan Tilang ETLE"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2.5 TAB 2: ENFORCEMENT ACTIONS & BATM GENERATOR */}
        {activeOpsTab === 'ENFORCEMENT_BATM' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Manajemen Penindakan & Berita Acara Transfer Muatan (BATM)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Berdasarkan PP No. 74 Tahun 2014 & SE Dirjen Perhubungan Darat tentang Penegakan Hukum Zero ODOL
                  </p>
                </div>

                <span className="text-xs font-mono font-semibold bg-rose-500/10 text-rose-300 px-2.5 py-1 rounded border border-rose-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Pos Jembatan Timbang Aktif
                </span>
              </div>

              {/* Protocol Flowchart */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Tahap 1: Deteksi WIM</span>
                  <h4 className="text-xs font-bold text-white">Sensor WIM Menangkap Overload</h4>
                  <p className="text-[11px] text-slate-400">
                    Kendaraan melebihi JBI &gt;20% otomatis memicu sinyal RED pada display gate jembatan timbang.
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">Tahap 2: Penerbitan BATM</span>
                  <h4 className="text-xs font-bold text-white">Transfer Muatan Wajib</h4>
                  <p className="text-[11px] text-slate-400">
                    Penerbitan surat perintah pemindahan muatan berlebih ke truk kedua di kantong parkir resmi BPTD.
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Tahap 3: ETLE & Kliring</span>
                  <h4 className="text-xs font-bold text-white">Tilang Elektronik & Izin Jalan</h4>
                  <p className="text-[11px] text-slate-400">
                    Setelah muatan ditimbang ulang dan sesuai batas dinamis, kendaraan diterbitkan Surat Izin Lanjut.
                  </p>
                </div>
              </div>

              {/* Pending Enforcement Queue Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="text-[10px] font-mono text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">ID Berkas</th>
                      <th className="p-2.5">Plat & Golongan</th>
                      <th className="p-2.5">Beban / Izin</th>
                      <th className="p-2.5">Kelebihan (Ton)</th>
                      <th className="p-2.5">Status Penindakan</th>
                      <th className="p-2.5 text-right">Aksi Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-sans">
                    {wimStream.filter((r) => r.status === 'ODOL_VIOLATION').map((truck) => (
                      <tr key={truck.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-2.5 font-mono font-semibold text-slate-400">{truck.id}</td>
                        <td className="p-2.5">
                          <p className="font-mono font-bold text-white">{truck.plate}</p>
                          <p className="text-[10px] text-slate-400">{truck.vehicleClass}</p>
                        </td>
                        <td className="p-2.5 font-mono">
                          <span className="text-rose-400 font-bold">{truck.axleLoadTon} Ton</span> / {truck.legalLimitTon} Ton
                        </td>
                        <td className="p-2.5 font-mono text-rose-400 font-bold">
                          +{(truck.axleLoadTon - truck.legalLimitTon).toFixed(1)} Ton (+{truck.overloadPercent}%)
                        </td>
                        <td className="p-2.5">
                          <span className="bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-rose-500/20">
                            MENUNGGU TRANSFER MUATAN
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedTruckForAction(truck);
                              setActiveModalType('BATM_MODAL');
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Proses BATM
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

        {/* 2.6 TAB 3: DYNAMIC SEASONAL & WEATHER TONNAGE SIMULATOR */}
        {activeOpsTab === 'DYNAMIC_TONNAGE' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Kalkulator Ambang Batas Tonase Dinamis (Dynamic Seasonal Tonnage)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Infiltrasi air hujan ke lapisan pondasi aspal menurunkan daya dukung tanah dasar (CBR). Sistem PINN
                  mengestimasi batas tonase yang diperbolehkan secara dinamis untuk mencegah keruntuhan struktur.
                </p>
              </div>

              {/* Interactive Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Slider 1: Curah Hujan */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">Intensitas Hujan (BMKG)</span>
                    <span className="font-mono font-bold text-cyan-300">{simRainMmHr} mm/jam</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={simRainMmHr}
                    onChange={(e) => setSimRainMmHr(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0 (Kering)</span>
                    <span>50 (Lebat)</span>
                    <span>100 (Ekstrem)</span>
                  </div>
                </div>

                {/* Slider 2: Nilai CBR Tanah Dasar */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">CBR Tanah Dasar</span>
                    <span className="font-mono font-bold text-amber-300">{simCbrPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={0.1}
                    value={simCbrPercent}
                    onChange={(e) => setSimCbrPercent(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>2% (Rawa)</span>
                    <span>6% (Standar)</span>
                    <span>12% (Keras)</span>
                  </div>
                </div>

                {/* Slider 3: Durasi Genangan Air */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">Durasi Genangan Air</span>
                    <span className="font-mono font-bold text-indigo-300">{simFloodDurationHours} Jam</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={simFloodDurationHours}
                    onChange={(e) => setSimFloodDurationHours(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0 Jam</span>
                    <span>12 Jam</span>
                    <span>24 Jam</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Output Comparison Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                    Rekomendasi Ambang Batas Real-Time:
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    Batas Beban Sumbu Diizinkan Saat Ini:{' '}
                    <span className="text-amber-300 font-mono text-lg font-bold">{dynamicAllowedTonnage} Ton</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {simRainMmHr > 40
                      ? '⚠️ Hujan lebat memicu penurunan daya dukung struktural sebesar 35%. Truk dengan beban >' +
                        dynamicAllowedTonnage +
                        ' Ton harus ditahan atau dialihkan ke jalan tol.'
                      : 'Kondisi cuaca stabil. Ambang batas muatan standar berlaku normal.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    handleExecuteAction(
                      `Ambang Batas Tonase Dinamis Baru Diberlakukan: ${dynamicAllowedTonnage} Ton di Ruas ${selectedSegment.name}`
                    );
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-indigo-500 shrink-0 transition-colors cursor-pointer"
                >
                  Terapkan Batas ke Sensor WIM
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2.7 TAB 4: COMMUNITY REPORTS & WIM TRUCK CORRELATION */}
        {activeOpsTab === 'COMMUNITY_WIM' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Feed Laporan Kerusakan Warga Terkorelasi WIM
                </h3>
                <p className="text-xs text-slate-400">
                  Data kerusakan jalan yang dilaporkan warga dikorelasikan otomatis dengan riwayat lintasan truk ODOL.
                </p>
              </div>

              <button
                onClick={onOpenCreateReport}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg border border-amber-400 flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-slate-950" />
                <span>Input Laporan Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {communityReports.map((report) => {
                return (
                  <div
                    key={report.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <img
                            src={report.reporterAvatar || currentAccount.avatarUrl}
                            alt={report.reporterName}
                            className="w-6 h-6 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{report.reporterName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{report.timestamp}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            report.severity === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {report.severity}
                        </span>
                      </div>

                      {/* Photo and description */}
                      <div className="flex items-start space-x-3 mt-2.5">
                        <img
                          src={report.photoUrl}
                          alt={report.damageTypeLabel}
                          className="w-20 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="text-xs font-bold text-white">{report.damageTypeLabel}</h4>
                          <p className="text-[11px] text-amber-400 font-medium">{report.segmentName}</p>
                          <p className="text-xs text-slate-300 line-clamp-2">{report.description}</p>
                        </div>
                      </div>

                      {/* WIM Correlation Box */}
                      {report.wimCorrelation && (
                        <div className="mt-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-0.5">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-400 flex items-center gap-1 font-semibold">
                              <Truck className="w-3 h-3 text-rose-400" /> Truk Terkorelasi:
                            </span>
                            <span className="text-cyan-300 font-bold">{report.wimCorrelation.recentTruckPlate}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Beban As: <strong>{report.wimCorrelation.maxAxleLoadTon} Ton</strong> (+
                            {report.wimCorrelation.overloadPercent}% Overload).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions: Edit & Upvote */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <button
                        onClick={() => onUpvoteReport && onUpvoteReport(report.id)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                          report.userUpvoted
                            ? 'bg-slate-800 text-white border border-slate-700'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                        <span>{report.upvotesCount} Dukungan</span>
                      </button>

                      {onEditReport && (
                        <button
                          onClick={() => onEditReport(report)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2.5 py-1 rounded-lg border border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit Laporan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2.8 TAB 5: CROSS-AGENCY DISPATCH (BINA MARGA & POLRI) */}
        {activeOpsTab === 'DISPATCH' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Sistem Disposisi Lintas-Instansi (Kemenhub &bull; Bina Marga PUPR &bull; Korlantas Polri)
                </h3>
                <p className="text-xs text-slate-400">
                  Kirimkan notifikasi darurat penanganan jalan langsung ke Pejabat Pembuat Komitmen (PPK) Bina Marga atau
                  petugas Satlantas Polri.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {/* Dispatch Option 1: Bina Marga Overlay Urgensi */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Disposisi Preservasi ke Ditjen Bina Marga</h4>
                      <p className="text-[10px] text-slate-400">BBPJN DKI-Jawa Barat / Balai Pelaksanaan Jalan</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">
                    Notifikasi kerusakan struktural akibat 142 truk ODOL melintas di {selectedSegment.name}. Minta
                    penjadwalan perbaikan lapis aus AC-WC 6 cm sebelum retak amblas meluas.
                  </p>
                  <button
                    onClick={() => handleExecuteAction(`Disposisi Preservasi Jalan Resmi Dikirim ke BBPJN / PPK Bina Marga`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-lg border border-indigo-500 transition-colors cursor-pointer"
                  >
                    Kirim Disposisi ke Bina Marga
                  </button>
                </div>

                {/* Dispatch Option 2: Korlantas Polri Tilang ETLE */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-lg bg-slate-800 text-rose-400 border border-slate-700">
                      <Car className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Integrasi ETLE WIM ke Korlantas Polri</h4>
                      <p className="text-[10px] text-slate-400">Pusat Penegakan Hukum Lalu Lintas Elektronik</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">
                    Sinkronisasi data plat nomor dan bobot tonase truk pelanggar ODOL langsung ke server ETLE Korlantas
                    untuk pemblokiran STNK otomatis saat perpanjangan pajak tahunan.
                  </p>
                  <button
                    onClick={() => handleExecuteAction(`Data 142 Truk ODOL Berhasil Disinkronkan ke ETLE Korlantas Polri`)}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-lg border border-rose-500 transition-colors cursor-pointer"
                  >
                    Sinkronisasi ke ETLE Korlantas
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. MODALS (BATM, REROUTE, ETLE, ANPR) */}
      {/* 3.1 BATM (BERITA ACARA TRANSFER MUATAN) MODAL */}
      {activeModalType === 'BATM_MODAL' && selectedTruckForAction && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Berita Acara Transfer Muatan (BATM)</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Nomor: BATM/BPTD-VIII/ODOL/2026/0882</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalType(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Official Document Details */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-slate-400 font-mono text-[10px]">Plat Nomor Truk:</span>
                  <p className="font-mono font-bold text-white">{selectedTruckForAction.plate}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono text-[10px]">Golongan Kendaraan:</span>
                  <p className="font-semibold text-white">{selectedTruckForAction.vehicleClass}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono text-[10px]">Nama Pengemudi:</span>
                  <p className="font-semibold text-white">{selectedTruckForAction.driverName || 'Rahmat Hidayat'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono text-[10px]">Perusahaan Logistik:</span>
                  <p className="font-semibold text-white">{selectedTruckForAction.companyName || 'PT. Logistik Prima'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px]">Total Muatan WIM:</span>
                  <p className="font-mono font-bold text-rose-400 text-xs">{selectedTruckForAction.axleLoadTon} Ton</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Batas Dinamis:</span>
                  <p className="font-mono font-bold text-amber-300 text-xs">{dynamicAllowedTonnage} Ton</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Wajib Ditransfer:</span>
                  <p className="font-mono font-bold text-rose-400 text-xs">
                    {(selectedTruckForAction.axleLoadTon - dynamicAllowedTonnage).toFixed(1)} Ton
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Berdasarkan hasil penimbangan sensor WIM di {selectedTruckForAction.stationName}, kendaraan
                tersebut melanggar batas tonase. Pengemudi diperintahkan memindahkan muatan berlebih ke kendaraan
                pendukung di kantong parkir jembatan timbang sebelum diizinkan melanjutkan perjalanan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModalType(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  handleExecuteAction(
                    `Surat BATM untuk Truk ${selectedTruckForAction.plate} (${(
                      selectedTruckForAction.axleLoadTon - dynamicAllowedTonnage
                    ).toFixed(1)} Ton Transfer) Resmi Diterbitkan`
                  )
                }
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Terbitkan & Cetak BATM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.2 REROUTE MODAL */}
      {activeModalType === 'REROUTE_MODAL' && selectedTruckForAction && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-3.5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                Surat Perintah Pengalihan Rute
              </h3>
              <button
                onClick={() => setActiveModalType(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Mengingat daya dukung perkerasan arteri di {selectedSegment.name} dalam kondisi kritis (PCI:{' '}
              {selectedSegment.currentPci}), truk <strong className="text-white">{selectedTruckForAction.plate}</strong>{' '}
              ({selectedTruckForAction.axleLoadTon} Ton) dialihkan ke:
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-cyan-300">Jalur Alternatif Berdaya Dukung Tinggi:</p>
              <p className="text-white font-medium">&bull; Masuk Gerbang Tol Terdekat &rarr; Koridor Tol Trans-Jawa</p>
              <p className="text-slate-400 text-[10px]">Kecepatan maksimum 60 km/jam pada lajur kiri khusus kendaraan berat.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModalType(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  handleExecuteAction(`Perintah Pengalihan Rute Truk ${selectedTruckForAction.plate} Berhasil Diterbitkan`)
                }
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Kirim Perintah Reroute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.3 ETLE MODAL */}
      {activeModalType === 'ETLE_MODAL' && selectedTruckForAction && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-3.5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Penilangan Elektronik ETLE WIM
              </h3>
              <button
                onClick={() => setActiveModalType(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Plat Nomor:</span>
                <span className="font-mono font-bold text-white">{selectedTruckForAction.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pasal Pelanggaran:</span>
                <span className="text-slate-200">Pasal 307 UU No. 22/2009</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Denda Maksimum:</span>
                <span className="font-mono font-bold text-amber-400">Rp 500.000</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModalType(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  handleExecuteAction(`Surat Tilang ETLE WIM Terbit untuk ${selectedTruckForAction.plate}`)
                }
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Terbitkan Tilang ETLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.4 ANPR CCTV PREVIEW MODAL */}
      {activeModalType === 'ANPR_PREVIEW' && selectedTruckForAction && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4.5 shadow-xl space-y-3.5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                Pemindaian CCTV ANPR: {selectedTruckForAction.plate}
              </h3>
              <button
                onClick={() => setActiveModalType(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-700 relative">
              <img
                src={selectedTruckForAction.cctvSnapshotUrl}
                alt={selectedTruckForAction.plate}
                className="w-full h-56 object-cover"
              />
              <div className="absolute top-2 left-2 bg-slate-950/90 font-mono text-[10px] text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                ANPR MATCH: 99.4%
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setActiveModalType(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold"
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
