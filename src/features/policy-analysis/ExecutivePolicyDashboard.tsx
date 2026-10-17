import React from 'react';
import { RoadSegment, SimulationResult } from '../../types';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
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
  Bar
} from 'recharts';
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  PieChart,
  FileDown,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface ExecutivePolicyDashboardProps {
  simulationResult: SimulationResult | null;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  onRunSimulation: () => void;
}

export const ExecutivePolicyDashboard: React.FC<ExecutivePolicyDashboardProps> = ({
  simulationResult
}) => {
  const result = simulationResult;

  // 5-Year PCI Projection Data
  const pciProjectionData = result
    ? result.roleOutputs.policyMaker.pci5YearProjection
    : [
        { year: 2026, pciNoAction: 48, pciPreventiveAction: 75 },
        { year: 2027, pciNoAction: 38, pciPreventiveAction: 82 },
        { year: 2028, pciNoAction: 28, pciPreventiveAction: 86 },
        { year: 2029, pciNoAction: 18, pciPreventiveAction: 88 },
        { year: 2030, pciNoAction: 10, pciPreventiveAction: 90 }
      ];

  // Regional Disparity Data (From Proposal Document Table 2.1)
  const regionalDisparityData = [
    { wilayah: 'Papua Pegunungan', PersenKerusakan: 29.3, PanjangKm: 245.0 },
    { wilayah: 'Kalimantan Tengah', PersenKerusakan: 18.2, PanjangKm: 287.6 },
    { wilayah: 'Sumatera Selatan', PersenKerusakan: 14.5, PanjangKm: 198.2 },
    { wilayah: 'Jawa Barat (Pantura)', PersenKerusakan: 9.8, PanjangKm: 124.5 },
    { wilayah: 'Bali', PersenKerusakan: 4.2, PanjangKm: 32.0 }
  ];

  const savingsBillion = result
    ? result.roleOutputs.policyMaker.preventiveCostSavingsRupiahBillions
    : 38.5;

  const economicLossBillion = result
    ? result.roleOutputs.policyMaker.estimatedEconomicLossRupiahBillions
    : 45.2;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-1 rounded-full border border-indigo-500/30">
                Lensa Akses: Executive Policy Maker (Bappenas/PU)
              </span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-1 rounded-full border border-emerald-500/30">
                Akses Terbuka Hak RBAC Level 1
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-1">
              Dashboard Eksekutif & Pengambil Kebijakan Preservasi Jalan
            </h1>
            <p className="text-xs text-slate-400">
              Proyeksi Anggaran APBN 5-Tahun, Analisis Kerugian Ekonomi ODOL, dan Target Zero ODOL 2027
            </p>
          </div>
        </div>

        {result && (
          <button
            onClick={() => generateOfficialReportPdf(result, 'POLICY_MAKER')}
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg border border-white/20 flex items-center space-x-2 transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Cetak Ringkasan Eksekutif PDF</span>
          </button>
        )}
      </div>

      {/* RBAC Scope Explanation Bar */}
      <div className="bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-2xl text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="font-bold text-indigo-300">Hak Akses Data Role Kebijakan:</span>
          <span className="text-slate-300">
            Anda dapat melihat proyeksi APBN 5 tahun, disparitas antar-provinsi, laporan GenAI, dan export PDF eksekutif. Sensor WIM individual & parameter mikro FWD dibatasi.
          </span>
        </div>
      </div>

      {/* Top 3 Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Preventive Savings */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-bold">Dampak Biaya</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-semibold text-emerald-400 font-mono">
            Belum dihitung
          </p>
          <p className="text-xs text-slate-400">
            Dampak biaya belum dihitung (model ekonomi belum ada).
          </p>
        </div>

        {/* Card 2: ODOL Economic Damage Context */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-bold">Kerugian Ekonomi Akibat ODOL</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-semibold text-rose-400 font-mono">
            Rp {economicLossBillion} Miliar
          </p>
          <p className="text-xs text-slate-400">
            Nasional: Truk ODOL menyebabkan kerugian jalan Rp 43.4T - 47.43T per tahun.
          </p>
        </div>

        {/* Card 3: Zero ODOL Target Impact */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-bold">Target Zero ODOL 2027</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-semibold text-cyan-400 font-mono">
            {result ? result.roleOutputs.policyMaker.zeroOdolTargetImpactPercent : 78}% Reduksi
          </p>
          <p className="text-xs text-slate-400">
            Dampak biaya belum dihitung.
          </p>
        </div>
      </div>

      {/* Grid Layout Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: 5-Year PCI Projection (7 cols) */}
        <div className="lg:col-span-7 bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <TrendingUp className="w-4 h-4 text-indigo-400 mr-2" />
              Proyeksi Indeks Kerusakan Jalan (PCI 1-5 Tahun): Tanpa Aksi vs Preservasi Preventif
            </h3>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30">
              Skenario Kebijakan
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pciProjectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} unit=" PCI" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    backdropFilter: 'blur(12px)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="pciNoAction"
                  name="Tanpa Aksi (Pemeliharaan Reaktif)"
                  stroke="#d9655d"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="pciPreventiveAction"
                  name="Preservasi Preventif & Zero ODOL"
                  stroke="#57ae78"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            *Pemeliharaan preventif berbasis PINN mencegah kerusakan struktural fatal sebelum retak kasatmata terbentuk.
          </p>
        </div>

        {/* Chart 2: Regional Disparity BarChart (5 cols) */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <PieChart className="w-4 h-4 text-rose-400 mr-2" />
              Disparitas Jalan Rusak Antarwilayah (%)
            </h3>
            <span className="text-xs font-mono text-rose-300 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30">
              Data PUPR 2025
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalDisparityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} unit="%" />
                <YAxis dataKey="wilayah" type="category" stroke="#94a3b8" fontSize={10} width={110} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    backdropFilter: 'blur(12px)'
                  }}
                />
                <Bar dataKey="PersenKerusakan" name="% Jalan Rusak" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            *Papua Pegunungan mencatat persentase jalan rusak tertinggi (29.31%).
          </p>
        </div>
      </div>

      {/* AI GenAI Policy Executive Brief */}
      {result && (
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-2">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">
              Ringkasan Kebijakan Eksekutif (GenAI Policy Brief)
            </h3>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 text-xs text-slate-200 leading-relaxed font-sans">
            {result.roleOutputs.policyMaker.executiveBrief}
          </div>
        </div>
      )}
    </div>
  );
};
