import React, { useState } from 'react';
import {
  RoadSegment,
  SimulationResult,
  DamageReport
} from '../../types';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import {
  HardHat,
  Activity,
  Layers,
  FileDown,
  Ruler,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building2,
  FileText,
  DollarSign,
  Plus,
  X,
  Sparkles,
  Cpu
} from 'lucide-react';
import { UserAccount } from '../authentication/demoAccounts';

export interface WorkOrderSPK {
  id: string;
  reportId?: string;
  segmentName: string;
  contractorName: string;
  contractorCode: string;
  issueType: string;
  recommendedAction: string;
  overlayThicknessCm: number;
  estimatedVolumeTons: number;
  budgetRupiah: number;
  issuedDate: string;
  targetCompletionDate: string;
  status: 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED';
  engineerSignOff: string;
}

interface FieldEngineerToolsProps {
  currentAccount: UserAccount;
  simulationResult: SimulationResult | null;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  communityReports: DamageReport[];
  onUpdateReportStatus?: (reportId: string, status: DamageReport['status'], engineerNote?: string) => void;
}

export const FieldEngineerTools: React.FC<FieldEngineerToolsProps> = ({
  currentAccount,
  simulationResult,
  roadSegments,
  selectedSegment,
  onSelectSegment,
  communityReports,
  onUpdateReportStatus
}) => {
  const result = simulationResult;

  // Active sub-tab inside Engineering View: 'CHARTS' | 'OVERLAY_CALC' | 'SPK_ORDERS' | 'PINN_DIAGNOSTICS'
  const [activeEngineeringTab, setActiveEngineeringTab] = useState<'CHARTS' | 'OVERLAY_CALC' | 'SPK_ORDERS' | 'PINN_DIAGNOSTICS'>('CHARTS');

  // Custom Overlay Calculator State
  const [calcSegmentLengthM, setCalcSegmentLengthM] = useState<number>(500);
  const [calcRoadWidthM, setCalcRoadWidthM] = useState<number>(7.0);
  const [calcAcWcThicknessCm, setCalcAcWcThicknessCm] = useState<number>(result?.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm || 6.0);
  const [calcAcBcThicknessCm, setCalcAcBcThicknessCm] = useState<number>(4.0);
  const [calcAsphaltDensity, setCalcAsphaltDensity] = useState<number>(2.3); // Ton/m3

  // Calculated Overlay Quantities
  const calculatedVolumeM3 = (calcSegmentLengthM * calcRoadWidthM * ((calcAcWcThicknessCm + calcAcBcThicknessCm) / 100));
  const calculatedTonnage = calculatedVolumeM3 * calcAsphaltDensity;
  const calculatedTackCoatLiter = (calcSegmentLengthM * calcRoadWidthM) * 0.35; // 0.35 L/m2
  const estimatedCostMillion = (calculatedTonnage * 1450000) / 1000000; // Rp 1.45jt per ton

  // SPK / Work Order State
  const [workOrders, setWorkOrders] = useState<WorkOrderSPK[]>([
    {
      id: 'SPK-2026-KRW-001',
      reportId: 'REP-101',
      segmentName: 'Jl. Interchange Tol Karawang Barat',
      contractorName: 'PT Wijaya Karya (Persero) Tbk',
      contractorCode: 'WIKA-DIV3',
      issueType: 'Alligator Cracking & Rutting 8.5 cm',
      recommendedAction: 'Cold Milling 5cm & Overlay AC-WC 6.5cm',
      overlayThicknessCm: 6.5,
      estimatedVolumeTons: 184.2,
      budgetRupiah: 267000000,
      issuedDate: '2026-08-20',
      targetCompletionDate: '2026-08-28',
      status: 'IN_PROGRESS',
      engineerSignOff: 'Ir. Ahmad Subagyo, M.T. (NIP: 19820415 200801 1 003)'
    },
    {
      id: 'SPK-2026-KRW-002',
      reportId: 'REP-102',
      segmentName: 'Jl. Raya Kosambi - Telagasari',
      contractorName: 'PT Brantas Abipraya (Persero)',
      contractorCode: 'BRANTAS-INFRA',
      issueType: 'Pothole Dalam 14 cm & Subsidence Pondasi',
      recommendedAction: 'Rekonstruksi Pondasi Agregat Kelas A + AC-BC 6cm + AC-WC 4cm',
      overlayThicknessCm: 10.0,
      estimatedVolumeTons: 312.0,
      budgetRupiah: 452400000,
      issuedDate: '2026-08-19',
      targetCompletionDate: '2026-08-25',
      status: 'DISPATCHED',
      engineerSignOff: 'Ir. Ahmad Subagyo, M.T. (NIP: 19820415 200801 1 003)'
    },
    {
      id: 'SPK-2026-KRW-003',
      reportId: 'REP-103',
      segmentName: 'Jl. Raya Klari - Cikampek KM 62',
      contractorName: 'PT Jaya Konstruksi Manggala Pratama',
      contractorCode: 'JAKON-JBR',
      issueType: 'Corrugation & Alur Ambles Roda Ganda',
      recommendedAction: 'Patching Aspal Panas & Overlay Modifikasi Polimer',
      overlayThicknessCm: 5.0,
      estimatedVolumeTons: 96.5,
      budgetRupiah: 139925000,
      issuedDate: '2026-08-17',
      targetCompletionDate: '2026-08-22',
      status: 'COMPLETED',
      engineerSignOff: 'Ir. Ahmad Subagyo, M.T. (NIP: 19820415 200801 1 003)'
    }
  ]);

  // Create New SPK Modal State
  const [isCreateSpkModalOpen, setIsCreateSpkModalOpen] = useState<boolean>(false);
  const [newSpkSegment, setNewSpkSegment] = useState<string>(roadSegments[0]?.name || '');
  const [newSpkContractor, setNewSpkContractor] = useState<string>('PT Wijaya Karya (Persero) Tbk');
  const [newSpkAction, setNewSpkAction] = useState<string>('Overlay AC-WC 6cm + Tack Coat Emulsi');
  const [newSpkThickness, setNewSpkThickness] = useState<number>(6.0);
  const [newSpkVolume, setNewSpkVolume] = useState<number>(140);
  const [newSpkBudget, setNewSpkBudget] = useState<number>(203000000);
  const [newSpkTargetDate, setNewSpkTargetDate] = useState<string>('2026-09-05');

  const handleCreateSpk = (e: React.FormEvent) => {
    e.preventDefault();
    const newSpk: WorkOrderSPK = {
      id: `SPK-2026-KRW-00${workOrders.length + 1}`,
      segmentName: newSpkSegment,
      contractorName: newSpkContractor,
      contractorCode: newSpkContractor.includes('Wijaya') ? 'WIKA-DIV3' : newSpkContractor.includes('Brantas') ? 'BRANTAS-INFRA' : 'JAKON-JBR',
      issueType: 'Kerusakan Struktural Terverifikasi PINN Insinyur',
      recommendedAction: newSpkAction,
      overlayThicknessCm: newSpkThickness,
      estimatedVolumeTons: newSpkVolume,
      budgetRupiah: newSpkBudget,
      issuedDate: new Date().toISOString().split('T')[0],
      targetCompletionDate: newSpkTargetDate,
      status: 'DISPATCHED',
      engineerSignOff: `${currentAccount.name} (${currentAccount.nip})`
    };

    setWorkOrders([newSpk, ...workOrders]);
    setIsCreateSpkModalOpen(false);
  };

  // Deflection Basin Data
  const deflectionData = result
    ? result.roleOutputs.fieldEngineer.deflectionBasin
    : [
        { distanceMm: 0, deflectionMicron: 480 },
        { distanceMm: 200, deflectionMicron: 335 },
        { distanceMm: 400, deflectionMicron: 230 },
        { distanceMm: 600, deflectionMicron: 160 },
        { distanceMm: 900, deflectionMicron: 95 },
        { distanceMm: 1200, deflectionMicron: 55 },
        { distanceMm: 1500, deflectionMicron: 30 }
      ];

  // Strain comparison vs AASHTO Standard
  const strainComparisonData = result
    ? [
        {
          name: 'Regangan Tarik Aspal (εt)',
          NilaiSimulasi: result.tensors.tensileStrainEt,
          BatasIjinAashto: 200
        },
        {
          name: 'Regangan Tekan Subgrade (εv)',
          NilaiSimulasi: result.tensors.compressiveStrainEv,
          BatasIjinAashto: 350
        }
      ]
    : [
        { name: 'Regangan Tarik Aspal (εt)', NilaiSimulasi: 245, BatasIjinAashto: 200 },
        { name: 'Regangan Tekan Subgrade (εv)', NilaiSimulasi: 380, BatasIjinAashto: 350 }
      ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Profile Strip */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-800 text-amber-400 border border-slate-700 rounded-xl font-bold shrink-0">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs bg-slate-800 text-slate-300 font-mono font-medium px-3 py-1 rounded-md border border-slate-700">
                PUPR BBPJN DKI-JABAR &bull; LAPANGAN
              </span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 font-mono font-medium px-2 py-1 rounded-md border border-emerald-500/20">
                Otorisasi SPK & Verifikasi Level 3
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-1">
              Modul Rekayasa Sipil & Verifikasi Insinyur Lapangan
            </h2>
            <p className="text-xs text-slate-400">
              Analisis Defleksi FWD, Tensor Regangan Batas AASHTO, Desain Overlay, dan Disposisi Surat Perintah Kerja (SPK)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {result && (
            <button
              onClick={() => generateOfficialReportPdf(result, 'FIELD_ENGINEER')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-slate-300" />
              <span>Cetak PDF Rekayasa</span>
            </button>
          )}
          <button
            onClick={() => setIsCreateSpkModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan SPK Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-tab Navigation Switcher */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          onClick={() => setActiveEngineeringTab('CHARTS')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center space-x-2 cursor-pointer ${
            activeEngineeringTab === 'CHARTS'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Profil Basin FWD & Tensor Regangan</span>
        </button>

        <button
          onClick={() => setActiveEngineeringTab('OVERLAY_CALC')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center space-x-2 cursor-pointer ${
            activeEngineeringTab === 'OVERLAY_CALC'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-400" />
          <span>Kalkulator Desain Lapisan Tambah (Overlay)</span>
        </button>

        <button
          onClick={() => setActiveEngineeringTab('SPK_ORDERS')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center space-x-2 cursor-pointer ${
            activeEngineeringTab === 'SPK_ORDERS'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Surat Perintah Kerja (SPK & Kontraktor)</span>
          <span className="px-2 py-0.2 rounded-md bg-slate-700 text-slate-200 font-mono text-xs">
            {workOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveEngineeringTab('PINN_DIAGNOSTICS')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center space-x-2 cursor-pointer ${
            activeEngineeringTab === 'PINN_DIAGNOSTICS'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>Diagnostik Loss Solver PINN</span>
        </button>
      </div>

      {/* 3. Sub-tab Contents */}

      {/* TAB 1: DEFLECTION BASIN & STRAIN TENSORS */}
      {activeEngineeringTab === 'CHARTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Deflection Basin Curve (6 cols) */}
          <div className="lg:col-span-6 bg-surface border border-white/10 p-5 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center">
                <Activity className="w-4 h-4 text-cyan-400 mr-2" />
                Kurva Mangkok Lendutan Surface Deflection Basin w(r)
              </h3>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-500/20 px-2 py-1 rounded-full border border-cyan-500/30">
                FWD 50 kN Pulse
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={deflectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="distanceMm" stroke="#94a3b8" fontSize={11} unit=" mm" />
                  <YAxis stroke="#94a3b8" fontSize={11} unit=" µm" reversed />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="deflectionMicron"
                    name="Lendutan (µm)"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0284c7' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono bg-white/5 p-3 rounded-xl">
              <span>Lendutan Maksimum di Bawah Beban (D0):</span>
              <span className="font-bold text-cyan-300">{result ? result.tensors.surfaceDeflectionMaxMicron : 480} µm</span>
            </div>
          </div>

          {/* Chart 2: Tensile & Compressive Strain vs AASHTO Limit (6 cols) */}
          <div className="lg:col-span-6 bg-surface border border-white/10 p-5 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center">
                <Ruler className="w-4 h-4 text-amber-400 mr-2" />
                Tensor Regangan Kritis (Microstrain µε) vs Batas Ijin
              </h3>
              <span className="text-xs font-mono text-amber-300 bg-amber-500/20 px-2 py-1 rounded-full border border-amber-500/30">
                AASHTO Fatigue Criteria
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strainComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit=" µε" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="NilaiSimulasi" name="Nilai Simulasi PINN" fill="#e8b23a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="BatasIjinAashto" name="Batas Ijin AASHTO" fill="#64748b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono bg-white/5 p-3 rounded-xl">
              <span>Status Kelelahan Aspal:</span>
              <span className="font-bold text-rose-400">MELEBIHI AMBANG BATAS (+22.5%)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OVERLAY CALCULATOR */}
      {activeEngineeringTab === 'OVERLAY_CALC' && (
        <div className="bg-surface border border-white/10 p-6 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-400/20 text-amber-300 rounded-2xl">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Kalkulator Desain Lapisan Tambah (Overlay AC-WC & AC-BC)</h3>
                <p className="text-xs text-slate-400">Perhitungan volumetrik hotmix aspal, tack coat emulsi, dan estimasi biaya perbaikan Bina Marga</p>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30 font-bold">
              Metode Desain: Bina Marga Pd T-05-2005-B
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-2">
              <label className="font-bold text-slate-300">Panjang Ruas Target (m):</label>
              <input
                type="number"
                value={calcSegmentLengthM}
                onChange={(e) => setCalcSegmentLengthM(Number(e.target.value))}
                className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-300">Lebar Perkerasan (m):</label>
              <input
                type="number"
                step="0.5"
                value={calcRoadWidthM}
                onChange={(e) => setCalcRoadWidthM(Number(e.target.value))}
                className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-300">Tebal Lapisan AC-WC (cm):</label>
              <input
                type="number"
                step="0.5"
                value={calcAcWcThicknessCm}
                onChange={(e) => setCalcAcWcThicknessCm(Number(e.target.value))}
                className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-300">Tebal Lapisan Pengikat AC-BC (cm):</label>
              <input
                type="number"
                step="0.5"
                value={calcAcBcThicknessCm}
                onChange={(e) => setCalcAcBcThicknessCm(Number(e.target.value))}
                className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1">
              <p className="text-xs text-slate-400">Total Tebal Overlay</p>
              <p className="text-xl font-semibold text-amber-400">{(calcAcWcThicknessCm + calcAcBcThicknessCm).toFixed(1)} cm</p>
              <p className="text-xs text-slate-400">AC-WC + AC-BC Terpadu</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1">
              <p className="text-xs text-slate-400">Kebutuhan Tonase Aspal</p>
              <p className="text-xl font-semibold text-cyan-300">{calculatedTonnage.toFixed(1)} Ton</p>
              <p className="text-xs text-slate-400">Volume: {calculatedVolumeM3.toFixed(1)} m³</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1">
              <p className="text-xs text-slate-400">Kebutuhan Tack Coat</p>
              <p className="text-xl font-semibold text-emerald-400">{calculatedTackCoatLiter.toFixed(0)} Liter</p>
              <p className="text-xs text-slate-400">Lapis Perekat Emulsi Aspal</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1">
              <p className="text-xs text-slate-400">Estimasi Anggaran (HPS)</p>
              <p className="text-xl font-semibold text-rose-400">Rp {estimatedCostMillion.toFixed(1)} Juta</p>
              <p className="text-xs text-slate-400">Standar Harga Satuan PUPR</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPK & WORK ORDERS */}
      {activeEngineeringTab === 'SPK_ORDERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Daftar Surat Perintah Kerja (SPK) Aktif BBPJN Karawang</span>
            </h3>
            <button
              onClick={() => setIsCreateSpkModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat SPK Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workOrders.map((spk) => (
              <div
                key={spk.id}
                className="bg-surface border border-white/10 p-5 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md border border-amber-400/30">
                      {spk.id}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-1 rounded-full border ${
                        spk.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : spk.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}
                    >
                      {spk.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">{spk.segmentName}</h4>
                  <p className="text-xs text-slate-300 font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {spk.contractorName}
                  </p>

                  <div className="bg-elevated p-3 rounded-xl space-y-1 text-xs text-slate-300">
                    <p><span className="text-slate-400 font-medium">Tindakan:</span> {spk.recommendedAction}</p>
                    <p><span className="text-slate-400 font-medium">Tebal Overlay:</span> <strong className="text-amber-400 font-mono">{spk.overlayThicknessCm} cm</strong> ({spk.estimatedVolumeTons} Ton)</p>
                    <p><span className="text-slate-400 font-medium">Pagu Anggaran:</span> <strong className="text-emerald-400 font-mono">Rp {(spk.budgetRupiah / 1000000).toFixed(1)} Juta</strong></p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Target: {spk.targetCompletionDate}</span>
                  <span className="text-cyan-400 font-bold">Otorisasi Level 3 &check;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PINN DIAGNOSTICS */}
      {activeEngineeringTab === 'PINN_DIAGNOSTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-white/10 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-white">Loss Fungsi Objektif Total</h4>
            <p className="text-2xl font-semibold text-emerald-400 font-mono">
              belum diukur
            </p>
            <p className="text-xs text-slate-400">Mesin saat ini RULE_BASED (rumus), bukan jaringan terlatih; tidak ada loss pelatihan.</p>
          </div>

          <div className="bg-surface border border-white/10 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-white">Loss Fisika (PI-surrogate, rencana)</h4>
            <p className="text-2xl font-semibold text-cyan-300 font-mono">
              belum diukur
            </p>
            <p className="text-xs text-slate-400">Tersedia setelah PI-surrogate dilatih dan diukur (Fase 2).</p>
          </div>

          <div className="bg-surface border border-white/10 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-white">Loss Data Observasi Sensor</h4>
            <p className="text-2xl font-semibold text-amber-400 font-mono">
              belum diukur
            </p>
            <p className="text-xs text-slate-400">Tidak ada data sensor WIM/FWD yang terhubung.</p>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SPK */}
      {isCreateSpkModalOpen && (
        <div className="fixed inset-0 z-[1600] bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-white/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 font-semibold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Terbitkan Surat Perintah Kerja (SPK)</h3>
                  <p className="text-xs text-slate-400">Disposisi Resmi Penanganan Ruas Jalan BBPJN DKI-Jabar</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateSpkModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSpk} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Ruas Jalan Sasaran:</label>
                <select
                  value={newSpkSegment}
                  onChange={(e) => setNewSpkSegment(e.target.value)}
                  className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-amber-400 font-semibold"
                >
                  {roadSegments.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.corridor})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Kontraktor Pelaksana:</label>
                <select
                  value={newSpkContractor}
                  onChange={(e) => setNewSpkContractor(e.target.value)}
                  className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-amber-400 font-semibold"
                >
                  <option value="PT Wijaya Karya (Persero) Tbk">PT Wijaya Karya (Persero) Tbk</option>
                  <option value="PT Brantas Abipraya (Persero)">PT Brantas Abipraya (Persero)</option>
                  <option value="PT Jaya Konstruksi Manggala Pratama">PT Jaya Konstruksi Manggala Pratama</option>
                  <option value="PT Hutama Karya (Persero)">PT Hutama Karya (Persero)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Tebal Overlay (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newSpkThickness}
                    onChange={(e) => setNewSpkThickness(Number(e.target.value))}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Estimasi Tonase (Ton):</label>
                  <input
                    type="number"
                    value={newSpkVolume}
                    onChange={(e) => setNewSpkVolume(Number(e.target.value))}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Pagu Anggaran (Rp):</label>
                  <input
                    type="number"
                    value={newSpkBudget}
                    onChange={(e) => setNewSpkBudget(Number(e.target.value))}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Target Selesai:</label>
                  <input
                    type="date"
                    value={newSpkTargetDate}
                    onChange={(e) => setNewSpkTargetDate(e.target.value)}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Rekomendasi Spesifikasi Teknis:</label>
                <textarea
                  rows={2}
                  value={newSpkAction}
                  onChange={(e) => setNewSpkAction(e.target.value)}
                  className="w-full bg-elevated border border-white/15 text-white rounded-xl p-3 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateSpkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold flex items-center space-x-2 shadow-lg cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Terbitkan & Otorisasi SPK</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
