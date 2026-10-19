import React, { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
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
import { PavementMap } from '../../components/maps/PavementMap';

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
    pciValue >= 85 ? 'text-[#50A878]' : pciValue >= 70 ? 'text-[#D7A84B]' : pciValue >= 50 ? 'text-[#D88A45]' : 'text-[#D96B5F]';
  const pciBadgeBg =
    pciValue >= 85
      ? 'bg-[#50A878]/14 text-[#50A878] border-[#50A878]/30'
      : pciValue >= 70
      ? 'bg-[#D7A84B]/14 text-[#D7A84B] border-[#D7A84B]/30'
      : pciValue >= 50
      ? 'bg-[#D88A45]/14 text-[#D88A45] border-[#D88A45]/30'
      : 'bg-[#D96B5F]/14 text-[#D96B5F] border-[#D96B5F]/30';

  // Toggle checklist item
  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Alignment refs: Map bottom aligns strictly with the bottom of the Rekomendasi Tindakan text
  const mapCardRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const recommendationTextRef = useRef<HTMLParagraphElement>(null);
  const [mapCalculatedHeight, setMapCalculatedHeight] = useState<number | null>(null);

  const updateMapHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    // On mobile / tablet (< lg breakpoint: 1024px), use natural responsive height
    if (window.innerWidth < 1024) {
      setMapCalculatedHeight(null);
      return;
    }
    const mapEl = mapCardRef.current;
    const recTextEl = recommendationTextRef.current;
    if (!mapEl || !recTextEl) return;

    const mapTop = mapEl.getBoundingClientRect().top;
    const recTextBottom = recTextEl.getBoundingClientRect().bottom;

    // Desired height so the bottom edge of the map card aligns with the bottom of the recommendation text
    const targetHeight = Math.round(recTextBottom - mapTop);

    // Safeguard minimum height (at least 280px so map is always readable)
    if (targetHeight >= 280) {
      setMapCalculatedHeight((prev) => (prev !== targetHeight ? targetHeight : prev));
    }
  }, []);

  useLayoutEffect(() => {
    updateMapHeight();

    const rightPanelEl = rightPanelRef.current;
    const recTextEl = recommendationTextRef.current;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateMapHeight();
      });
      if (rightPanelEl) resizeObserver.observe(rightPanelEl);
      if (recTextEl) resizeObserver.observe(recTextEl);
    }

    const handleWindowResize = () => {
      updateMapHeight();
    };

    window.addEventListener('resize', handleWindowResize);
    const rafId = requestAnimationFrame(updateMapHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      cancelAnimationFrame(rafId);
    };
  }, [updateMapHeight, selectedSegment]);


  return (
    <div className="min-h-full w-full bg-workspace text-ink font-sans pb-12">
      {/* 2. MAIN DASHBOARD CONTENT (2 Columns Grid) */}
      <main className="w-full min-w-0 px-4 sm:px-5 pt-4 sm:pt-5 pb-8 space-y-4">
        {/* Top Title & Quick Actions */}
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pb-3 sm:pb-4 border-b border-line-subtle">
          <div className="min-w-0 flex-1 basis-[24rem]">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="text-[20px] sm:text-[22px] font-semibold text-ink tracking-tight leading-tight">
                Dashboard Rekayasa & Kondisi Jalan
              </h1>
              <span className="text-[11px] font-mono text-[#E8B52B] bg-card border border-line-subtle px-2 py-0.5 rounded-md shrink-0">
                Intel OpenVINO Edge AI
              </span>
            </div>
            <p className="text-[12px] text-ink-2 mt-1 leading-normal">
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
              className="h-8 px-3 rounded-control border border-line-subtle bg-card hover:bg-raised text-ink text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh Laporan Rekayasa Sipil (PDF)"
            >
              <FileDown className="w-3.5 h-3.5 text-[#E8B52B]" />
              <span>Unduh PDF</span>
            </button>

            {/* OpenVINO Hardware Telemetry Badge (From PDF) */}
            <div className="h-8 flex items-center gap-2 rounded-control border border-line-subtle bg-card px-2.5 text-xs text-ink-2" title="Perangkat inferensi dan latensi diisi dari pengukuran (Halaman Bukti)">
              <Cpu className="w-3.5 h-3.5 text-ink-3 shrink-0" />
              <span className="whitespace-nowrap">Perangkat belum terdeteksi · latensi belum diukur</span>
            </div>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kondisi jalan">
          {/* Dropdown / Semua Kondisi */}
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`h-8 px-3 rounded-control text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-raised text-ink border border-line-active shadow-xs'
                : 'bg-card text-ink-2 hover:text-ink border border-line-subtle hover:border-line-active'
            }`}
          >
            <span>Semua Kondisi</span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-2" />
          </button>

          {/* Baik */}
          <button
            onClick={() => setActiveFilter('GOOD')}
            className={`h-8 px-3 rounded-control text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'GOOD'
                ? 'bg-[#50A878]/14 text-[#50A878] border border-[#50A878]/40 font-semibold'
                : 'bg-card text-ink-2 hover:text-[#50A878] border border-line-subtle hover:border-line-active'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#50A878]" />
            <span>Baik</span>
          </button>

          {/* Perlu Perhatian */}
          <button
            onClick={() => setActiveFilter('MODERATE')}
            className={`h-8 px-3 rounded-control text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'MODERATE'
                ? 'bg-[#D7A84B]/14 text-[#D7A84B] border border-[#D7A84B]/40 font-semibold'
                : 'bg-card text-ink-2 hover:text-[#D7A84B] border border-line-subtle hover:border-line-active'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D7A84B]" />
            <span>Perlu Perhatian</span>
          </button>

          {/* Rusak Ringan */}
          <button
            onClick={() => setActiveFilter('LIGHT_DAMAGE')}
            className={`h-8 px-3 rounded-control text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'LIGHT_DAMAGE'
                ? 'bg-[#D88A45]/14 text-[#D88A45] border border-[#D88A45]/40 font-semibold'
                : 'bg-card text-ink-2 hover:text-[#D88A45] border border-line-subtle hover:border-line-active'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D88A45]" />
            <span>Rusak Ringan</span>
          </button>

          {/* Rusak Berat */}
          <button
            onClick={() => setActiveFilter('HEAVY_DAMAGE')}
            className={`h-8 px-3 rounded-control text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
              activeFilter === 'HEAVY_DAMAGE'
                ? 'bg-[#D96B5F]/14 text-[#D96B5F] border border-[#D96B5F]/40 font-semibold'
                : 'bg-card text-ink-2 hover:text-[#D96B5F] border border-line-subtle hover:border-line-active'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D96B5F]" />
            <span>Rusak Berat</span>
          </button>

          {/* Filter Action */}
          <button
            onClick={() => setActiveFilter('ALL')}
            className="h-8 px-3 rounded-control text-xs font-medium bg-card text-ink-2 hover:text-ink border border-line-subtle hover:border-line-active ml-auto flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* 3. CORE 2-COLUMN LAYOUT: MAP + SUMMARY (LEFT) & SELECTED SEGMENT DETAILS (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
          {/* LEFT COLUMN: Map & Ringkasan Kondisi Segmen & Tugas & Panduan (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4 lg:gap-5">
            {/* A. Map Card */}
            <div
              ref={mapCardRef}
              style={{
                height: mapCalculatedHeight ? `${mapCalculatedHeight}px` : undefined
              }}
              className="bg-panel border border-line-subtle rounded-map overflow-hidden relative isolate transition-[height] duration-200 h-[340px] sm:h-[380px] lg:h-[370px]"
            >
              <div className="w-full h-full min-h-[280px] overflow-hidden relative">
                <PavementMap
                  compact
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
                <div className="hidden sm:block absolute bottom-3 left-3 z-10 bg-panel/95 backdrop-blur-sm border border-line-subtle rounded-control px-3 py-2 text-xs space-y-1 shadow-md text-ink-2 max-w-[calc(100%-12rem)]">
                  <span className="font-semibold text-ink block text-[11px]">Legenda kondisi</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#50A878]" /> Baik
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D7A84B]" /> Perlu Perhatian
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D88A45]" /> Rusak Ringan
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D96B5F]" /> Rusak Berat
                    </span>
                  </div>
                </div>

                {/* Floating "+ Lapor Kondisi Jalan" Action Button (Bottom Right of Map) */}
                <button
                  onClick={onOpenCreateReport}
                  className="absolute bottom-3 right-3 z-10 bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-bold text-xs px-3.5 h-8.5 rounded-control shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Lapor Kondisi Jalan</span>
                </button>
              </div>
            </div>

            {/* Legend below the map on phones (it would cover the map there) */}
            <div className="sm:hidden flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2 -mt-1" aria-label="Legenda kondisi">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#50A878]" />Baik</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D7A84B]" />Perlu Perhatian</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D88A45]" />Rusak Ringan</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D96B5F]" />Rusak Berat</span>
            </div>

            {/* B. Ringkasan Kondisi Segmen Card */}
            <div className="bg-panel border border-line-subtle rounded-panel p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line-subtle pb-3">
                <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  <span>Ringkasan Kondisi Segmen</span>
                  <Info className="w-3.5 h-3.5 text-ink-3 cursor-pointer" />
                </h3>
                <span className="min-w-0 truncate text-[11px] font-mono text-ink-3" title={selectedSegment.name}>{selectedSegment.name}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)] gap-5 lg:gap-6">
                {/* 1. PCI Score (3 cols) */}
                <div className="min-w-0 space-y-2 border-b sm:border-b-0 sm:border-r border-line-subtle pb-4 sm:pb-0 sm:pr-4">
                  <span className="text-[12px] text-ink-2 font-medium">PCI Saat Ini</span>
                  <div className="flex items-baseline space-x-2 my-1">
                    <span className={`text-[32px] sm:text-[36px] font-semibold ${pciColor} tabular-nums tracking-tight leading-none`}>
                      {pciValue}
                    </span>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${pciBadgeBg}`}>
                    {pciCategory}
                  </span>

                  <div className="pt-2.5 grid grid-cols-2 gap-3 text-xs text-ink-2">
                    <div>
                      <span className="block text-[11px] text-ink-3">PCI Sebelumnya</span>
                      <span className="font-medium text-ink tabular-nums text-[12px]">68</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-ink-3">Penurunan</span>
                      <span className="font-medium text-[#D96B5F] tabular-nums text-[12px] flex items-center">&darr; 6</span>
                    </div>
                  </div>
                </div>

                {/* 2. Jenis Kerusakan Dominan (5 cols) */}
                <div className="min-w-0 space-y-2.5 border-b xl:border-b-0 xl:border-r border-line-subtle pb-4 xl:pb-0 xl:pr-4">
                  <span className="text-[12px] text-ink-2 font-medium block">Jenis Kerusakan Dominan</span>

                  {/* Item 1: Retak Kulit Buaya */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink text-[12px]">Retak Kulit Buaya</span>
                      <span className="tabular-nums font-mono text-[12px] text-ink">40%</span>
                    </div>
                    <div className="h-1.5 w-full bg-card rounded-full overflow-hidden">
                      <div className="h-full bg-[#D7A84B] rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>

                  {/* Item 2: Lubang */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink text-[12px]">Lubang</span>
                      <span className="tabular-nums font-mono text-[12px] text-ink">30%</span>
                    </div>
                    <div className="h-1.5 w-full bg-card rounded-full overflow-hidden">
                      <div className="h-full bg-[#D96B5F] rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>

                  {/* Item 3: Retak Memanjang */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink text-[12px]">Retak Memanjang</span>
                      <span className="tabular-nums font-mono text-[12px] text-ink">20%</span>
                    </div>
                    <div className="h-1.5 w-full bg-card rounded-full overflow-hidden">
                      <div className="h-full bg-[#8296b0] rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>

                  {/* Item 4: Alur */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink text-[12px]">Alur</span>
                      <span className="tabular-nums font-mono text-[12px] text-ink">10%</span>
                    </div>
                    <div className="h-1.5 w-full bg-card rounded-full overflow-hidden">
                      <div className="h-full bg-[#50A878] rounded-full" style={{ width: '10%' }} />
                    </div>
                  </div>
                </div>

                {/* 3. Data Pendukung (4 cols) */}
                <div className="min-w-0 space-y-2 text-xs sm:col-span-2 xl:col-span-1">
                  <span className="text-[12px] text-ink-2 font-medium block">Data Pendukung</span>

                  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-line-subtle">
                    <span className="text-[12px] text-ink-2">Lalu Lintas (Rata-rata)</span>
                    <span className="tabular-nums font-medium whitespace-nowrap text-ink text-[12px]">12.450 kend/hari</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-line-subtle">
                    <span className="text-[12px] text-ink-2">Curah Hujan (7 hari)</span>
                    <span className="tabular-nums font-medium whitespace-nowrap text-ink text-[12px]">78 mm</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-line-subtle">
                    <span className="text-[12px] text-ink-2">Kondisi Tanah Dasar (CBR)</span>
                    <span className="tabular-nums font-medium whitespace-nowrap text-ink text-[12px]">{selectedSegment.defaultCbrPercent || 6}%</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[12px] text-ink-2">Tipe Perkerasan</span>
                    <span className="tabular-nums font-mono font-semibold whitespace-nowrap text-[#E8B52B] text-[12px]">AC-WC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* C. Bottom Row: Tugas Saya (Left) + Panduan Cepat (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Tugas Saya */}
              <div className="bg-panel border border-line-subtle rounded-panel p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-line-subtle pb-2.5">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-[13px] font-semibold text-ink">Tugas Saya</h3>
                    <span className="text-[11px] font-mono font-medium text-ink-2 bg-card border border-line-subtle px-2 py-0.5 rounded-md">
                      {myOpenTasks.length} tugas aktif
                    </span>
                  </div>
                  <button
                    onClick={onNavigateToSPK}
                    className="text-[12px] font-medium text-[#E8B52B] hover:text-[#f3be48] transition-colors cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                <div className="space-y-2.5">
                  {myOpenTasks.length === 0 && (
                    <p className="text-xs text-ink-3 py-2">Belum ada inspeksi yang ditugaskan M.O ke akun Anda.</p>
                  )}
                  {myOpenTasks.slice(0, 2).map((task) => (
                    <div key={task.id} className="px-3.5 py-3 rounded-nested bg-card border border-line-subtle hover:bg-raised hover:border-line-active transition-colors space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <StateBadge state={task.state} />
                          <h4 className="text-xs font-semibold text-ink mt-1 truncate">
                            {task.report.damageTypeLabel} · {task.report.segmentName}
                          </h4>
                        </div>
                        <button
                          onClick={onNavigateToSPK}
                          className="h-7 px-2.5 rounded-md bg-raised hover:bg-raised-hover border border-line-subtle text-ink font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          Buka Tugas
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-3 pt-1.5 border-t border-line-subtle">
                        <span>Batas waktu: {new Date(task.assignment!.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="font-mono text-ink-2">{task.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panduan Cepat */}
              <div className="bg-panel border border-line-subtle rounded-panel p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-line-subtle pb-2.5">
                  <h3 className="text-[13px] font-semibold text-ink">Panduan Cepat</h3>
                  <span className="text-[11px] font-mono text-ink-3">Bina Marga / PUPR</span>
                </div>

                <div className="space-y-2.5">
                  {/* Guideline 1 */}
                  <div
                    onClick={() => setActiveModal('SURVEY_GUIDE')}
                    className="p-3 bg-card hover:bg-raised border border-line-subtle hover:border-line-active rounded-nested cursor-pointer transition-colors group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-raised text-[#E8B52B] rounded-lg">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-ink group-hover:text-[#E8B52B] transition-colors">
                          Cara Survei Jalan
                        </h4>
                        <p className="text-[11px] text-ink-3">Panduan langkah demi langkah</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Guideline 2 */}
                  <div
                    onClick={() => setActiveModal('DAMAGE_CATALOG')}
                    className="p-3 bg-card hover:bg-raised border border-line-subtle hover:border-line-active rounded-nested cursor-pointer transition-colors group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-raised text-[#E8B52B] rounded-lg">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-ink group-hover:text-[#E8B52B] transition-colors">
                          Jenis Kerusakan Jalan
                        </h4>
                        <p className="text-[11px] text-ink-3">Kenali 19 jenis kerusakan Bina Marga</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DETAIL RUAS JALAN TERPILIH PANEL (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-5">
            {/* Main Selected Road Segment Panel */}
            <div ref={rightPanelRef} className="bg-panel border border-line-subtle rounded-panel p-4 sm:p-5 flex flex-col gap-3.5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-line-subtle pb-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">Ruas Jalan Terpilih</h3>
                  <p className="text-xs text-ink-2 leading-snug mt-1">
                    {selectedSegment.name}
                  </p>
                  <p className="text-[11px] text-ink-3">{selectedSegment.corridor}</p>
                </div>
                <button
                  onClick={() => alert(`Ruas: ${selectedSegment.name}\nPanjang: ${selectedSegment.lengthKm} km\nPCI: ${selectedSegment.currentPci}`)}
                  className="text-ink-3 hover:text-ink p-1.5 rounded-nested hover:bg-raised transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Status Badge & Key Metrics */}
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${pciBadgeBg}`}>
                  {pciCategory}
                </span>
                <div className="text-right">
                  <span className="text-[11px] text-ink-3 block">PCI Terakhir</span>
                  <span className={`text-[22px] sm:text-[24px] font-semibold tabular-nums leading-none ${pciColor}`}>{pciValue}</span>
                </div>
              </div>

              {/* Length & Last Update */}
              <div className="grid grid-cols-2 gap-2 bg-card p-3 rounded-nested border border-line-subtle text-xs">
                <div>
                  <span className="text-ink-3 block text-[11px]">Panjang Segmen</span>
                  <span className="font-medium text-ink">{selectedSegment.lengthKm * 1000} m</span>
                </div>
                <div>
                  <span className="text-ink-3 block text-[11px]">Update Terakhir</span>
                  <span className="font-medium text-ink">2 jam lalu</span>
                </div>
              </div>

              {/* 4 Action Icons Grid: Navigasi, Detail Teknis, Riwayat, Unduh Data */}
              <div className="grid grid-cols-4 gap-2">
                {/* 1. Navigasi */}
                <button
                  onClick={() => {
                    const [lat, lng] = selectedSegment.coordinates;
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                  }}
                  className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-nested bg-card hover:bg-raised text-ink-2 hover:text-ink border border-line-subtle hover:border-line-active transition-all cursor-pointer group"
                  title="Navigasi ke Lokasi"
                >
                  <Navigation className="w-4 h-4 mb-1 text-sky-400 group-hover:scale-105 transition-transform" />
                  <span className="text-[11px] font-medium">Navigasi</span>
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
                  className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-nested bg-card hover:bg-raised text-ink-2 hover:text-ink border border-line-subtle hover:border-line-active transition-all cursor-pointer group"
                  title="Detail Teknis & Tensor PINN"
                >
                  <Activity className="w-4 h-4 mb-1 text-[#E8B52B] group-hover:scale-105 transition-transform" />
                  <span className="text-[11px] font-medium">Detail Teknis</span>
                </button>

                {/* 3. Riwayat */}
                <button
                  onClick={onOpenRoadHistory}
                  className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-nested bg-card hover:bg-raised text-ink-2 hover:text-ink border border-line-subtle hover:border-line-active transition-all cursor-pointer group"
                  title="Riwayat Degradasi Jalan"
                >
                  <History className="w-4 h-4 mb-1 text-indigo-400 group-hover:scale-105 transition-transform" />
                  <span className="text-[11px] font-medium">Riwayat</span>
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
                  className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-nested bg-card hover:bg-raised text-ink-2 hover:text-ink border border-line-subtle hover:border-line-active transition-all cursor-pointer group"
                  title="Unduh Data PDF"
                >
                  <FileDown className="w-4 h-4 mb-1 text-[#E8B52B] group-hover:scale-105 transition-transform" />
                  <span className="text-[11px] font-medium">Unduh Data</span>
                </button>
              </div>

              {/* Rekomendasi Tindakan Card */}
              <div className="bg-card border border-line-subtle rounded-nested p-3 sm:p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#E8B52B] flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Rekomendasi Tindakan
                  </span>
                  <Wrench className="w-3.5 h-3.5 text-ink-3" />
                </div>
                <p className="text-xs font-semibold text-ink leading-snug">
                  Lakukan penanganan pemeliharaan rutin dalam 3 bulan ke depan
                </p>
                <p ref={recommendationTextRef} className="text-[11px] text-ink-3 leading-relaxed">
                  Rekomendasi tebal overlay AC-WC: {selectedSegment.wimDetails?.overlayRecommendationCm || 6.5} cm.
                </p>
              </div>

              {/* Laporan Terbaru di Segmen Ini */}
              <div className="space-y-2.5 pt-3.5 border-t border-line-subtle">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-xs font-semibold text-ink">Laporan Terbaru di Segmen Ini</span>
                  <button
                    onClick={onNavigateToMap}
                    className="text-xs text-[#E8B52B] hover:text-[#d49e29] font-medium cursor-pointer transition-colors"
                  >
                    Lihat Semua
                  </button>
                </div>

                <div className="bg-card border border-line-subtle p-3 rounded-nested flex items-center space-x-3">
                  <img
                    src={activeReport.photoUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80'}
                    alt="Kerusakan"
                    className="w-13 h-13 rounded-lg object-cover border border-line-subtle shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-ink truncate">{activeReport.damageTypeLabel}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[#D88A45]/15 text-[#D88A45] border border-[#D88A45]/30">
                        {activeReport.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                      Oleh: {activeReport.reporterName}
                    </p>
                    <p className="text-[11px] text-ink-3 tabular-nums mt-0.5">
                      {activeReport.timestamp}
                    </p>
                  </div>
                </div>

                {/* Pagination Indicator Dots */}
                <div className="flex items-center justify-center space-x-1.5 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8B52B]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-line-active" />
                  <span className="w-1.5 h-1.5 rounded-full bg-line-active" />
                  <span className="w-1.5 h-1.5 rounded-full bg-line-active" />
                  <span className="w-1.5 h-1.5 rounded-full bg-line-active" />
                </div>
              </div>

              {/* Checklist Pemeriksaan Lapangan (0/5) */}
              <div className="space-y-2.5 pt-3.5 border-t border-line-subtle">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-xs font-semibold text-ink">Checklist Pemeriksaan Lapangan</span>
                  <span className="text-xs tabular-nums text-[#50A878] font-semibold">
                    {completedChecklistCount}/5
                  </span>
                </div>

                <div className="space-y-2 text-xs text-ink-2">
                  <div
                    onClick={() => toggleChecklistItem('damage_type')}
                    className="flex items-center space-x-2 cursor-pointer select-none hover:text-ink transition-colors"
                  >
                    {checklist.damage_type ? (
                      <CheckSquare className="w-4 h-4 text-[#50A878] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3 shrink-0" />
                    )}
                    <span className={checklist.damage_type ? 'line-through text-ink-3' : ''}>
                      Periksa jenis kerusakan
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('dimension')}
                    className="flex items-center space-x-2 cursor-pointer select-none hover:text-ink transition-colors"
                  >
                    {checklist.dimension ? (
                      <CheckSquare className="w-4 h-4 text-[#50A878] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3 shrink-0" />
                    )}
                    <span className={checklist.dimension ? 'line-through text-ink-3' : ''}>
                      Ukur dimensi kerusakan
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('photo')}
                    className="flex items-center space-x-2 cursor-pointer select-none hover:text-ink transition-colors"
                  >
                    {checklist.photo ? (
                      <CheckSquare className="w-4 h-4 text-[#50A878] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3 shrink-0" />
                    )}
                    <span className={checklist.photo ? 'line-through text-ink-3' : ''}>
                      Foto kondisi kerusakan
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('drainage')}
                    className="flex items-center space-x-2 cursor-pointer select-none hover:text-ink transition-colors"
                  >
                    {checklist.drainage ? (
                      <CheckSquare className="w-4 h-4 text-[#50A878] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3 shrink-0" />
                    )}
                    <span className={checklist.drainage ? 'line-through text-ink-3' : ''}>
                      Catat kondisi drainase
                    </span>
                  </div>

                  <div
                    onClick={() => toggleChecklistItem('recommendation')}
                    className="flex items-center space-x-2 cursor-pointer select-none hover:text-ink transition-colors"
                  >
                    {checklist.recommendation ? (
                      <CheckSquare className="w-4 h-4 text-[#50A878] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3 shrink-0" />
                    )}
                    <span className={checklist.recommendation ? 'line-through text-ink-3' : ''}>
                      Isi rekomendasi tindakan
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // The checklist is a local reminder; results are saved only through the assigned task.
                    onNavigateToSPK?.();
                  }}
                  className="w-full mt-2 h-8.5 rounded-control bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kirim hasil lewat Tugas Saya</span>
                </button>
              </div>
            </div>

            {/* Dokumen & Referensi Box */}
            <div className="bg-panel border border-line-subtle rounded-panel p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line-subtle pb-3">
                <h3 className="text-[14px] font-semibold text-ink">Dokumen & Referensi</h3>
                <span className="text-xs text-[#E8B52B] hover:text-[#d49e29] font-medium cursor-pointer transition-colors" onClick={() => setActiveModal('DAMAGE_CATALOG')}>
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
                  className="flex items-center justify-between p-3 bg-card hover:bg-raised border border-line-subtle hover:border-line-active rounded-nested cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-ink">Manual Survei Jalan 2024</h4>
                      <span className="text-[11px] text-ink-3">PDF &bull; 8.4 MB</span>
                    </div>
                  </div>
                  <FileDown className="w-4 h-4 text-ink-3 hover:text-ink transition-colors" />
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
                  className="flex items-center justify-between p-3 bg-card hover:bg-raised border border-line-subtle hover:border-line-active rounded-nested cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-[#E8B52B] shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-ink">Standar Penilaian Kondisi Jalan (PCI)</h4>
                      <span className="text-[11px] text-ink-3">PDF &bull; 5.1 MB</span>
                    </div>
                  </div>
                  <FileDown className="w-4 h-4 text-ink-3 hover:text-ink transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. MODALS FOR GUIDES & TASKS */}
      {/* A. Survey Guide Modal */}
      {activeModal === 'SURVEY_GUIDE' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-panel border border-line-subtle rounded-panel max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-[#E8B52B]" />
                <h3 className="text-[15px] font-semibold text-ink">Panduan Survei Lapangan Bina Marga</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-nested text-ink-3 hover:text-ink hover:bg-raised transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-ink-2 leading-relaxed">
              <div className="p-3 bg-card rounded-nested border border-line-subtle space-y-1">
                <span className="font-semibold text-[#E8B52B]">Langkah 1: Identifikasi Titik Kerusakan</span>
                <p>Verifikasi koordinat GPS dan patok kilometer (KM Post). Cocokkan dengan data jaringan jalan nasional BBPJN.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle space-y-1">
                <span className="font-semibold text-[#E8B52B]">Langkah 2: Pengukuran Dimensi & Tingkat Keparahan (Severity)</span>
                <p>Ukur kedalaman lubang (cm), luas area retak (m²), dan kedalaman alur bekas roda (rutting depth).</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle space-y-1">
                <span className="font-semibold text-[#E8B52B]">Langkah 3: Pengambilan Foto Geotagging</span>
                <p>Ambil foto tegak lurus permukaan jalan dan foto sudut pandang memanjang (longitudinal view) dengan skala pembanding.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle space-y-1">
                <span className="font-semibold text-[#E8B52B]">Langkah 4: Evaluasi Drainase Samping</span>
                <p>Pastikan saluran drainase tepi jalan tidak tersumbat endapan atau tertutup vegetasi untuk mencegah infiltrasi air tanah dasar.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle space-y-1">
                <span className="font-semibold text-[#E8B52B]">Langkah 5: Otorisasi & Disposisi Rekomendasi SPK</span>
                <p>Input data ke sistem PAVEMENT-PINN untuk perhitungan otomatis tebal overlay dan penerbitan Surat Perintah Kerja (SPK).</p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-control bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-bold text-xs cursor-pointer transition-colors"
            >
              Mengerti & Tutup Panduan
            </button>
          </div>
        </div>
      )}

      {/* B. Damage Catalog Modal (19 Jenis Kerusakan Bina Marga) */}
      {activeModal === 'DAMAGE_CATALOG' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-panel border border-line-subtle rounded-panel max-w-3xl w-full p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-[#50A878]" />
                <h3 className="text-[15px] font-semibold text-ink">Katalog 19 Jenis Kerusakan Jalan (Bina Marga & PCI)</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-nested text-ink-3 hover:text-ink hover:bg-raised transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-card rounded-nested border border-line-subtle">
                <span className="font-semibold text-[#D96B5F] block">1. Lubang (Potholes)</span>
                <p className="text-ink-3 text-xs mt-1">Cekungan mangkok dengan diameter &gt; 15 cm dan kedalaman &gt; 2.5 cm.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle">
                <span className="font-semibold text-[#D7A84B] block">2. Retak Kulit Buaya (Alligator Crack)</span>
                <p className="text-ink-3 text-xs mt-1">Retak saling sambung membentuk pola poligon akibat kelelahan beban berulang.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle">
                <span className="font-semibold text-sky-400 block">3. Alur Roda (Rutting)</span>
                <p className="text-ink-3 text-xs mt-1">Depresi memanjang pada jalur jejak roda akibat deformasi plastis lapisan aspal/tanah.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle">
                <span className="font-semibold text-[#50A878] block">4. Retak Memanjang & Melintang</span>
                <p className="text-ink-3 text-xs mt-1">Retak garis lurus searah atau memotong sumbu jalan karena susut termal/sambungan.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle">
                <span className="font-semibold text-indigo-400 block">5. Amblas / Penurunan (Depression)</span>
                <p className="text-ink-3 text-xs mt-1">Penurunan lokal permukaan perkerasan akibat konsolidasi tanah dasar yang tidak merata.</p>
              </div>

              <div className="p-3 bg-card rounded-nested border border-line-subtle">
                <span className="font-semibold text-purple-400 block">6. Jembul / Keriting (Corrugation & Shoving)</span>
                <p className="text-ink-3 text-xs mt-1">Gelombang transversal akibat gaya gesek pengereman kendaraan berat di persimpangan.</p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-control bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup Katalog
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
