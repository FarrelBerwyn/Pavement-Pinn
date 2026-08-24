import React from 'react';
import { RoadSegment, SimulationResult } from '../types';
import { generateOfficialReportPdf } from '../utils/pdfGenerator';
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
  Ruler
} from 'lucide-react';

interface FieldEngineerDashboardProps {
  simulationResult: SimulationResult | null;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  onRunSimulation: () => void;
}

export const FieldEngineerDashboard: React.FC<FieldEngineerDashboardProps> = ({
  simulationResult
}) => {
  const result = simulationResult;

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

  // Strain comparison vs Bina Marga Standard
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                Lensa Akses: Insinyur Lapangan (BBPJN/PUPR)
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Akses Terbuka Hak RBAC Level 3
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-1">
              Dashboard Rekayasa Sipil & Struktural Perkerasan Jalan
            </h1>
            <p className="text-xs text-slate-400">
              Evaluasi Tegangan-Regangan Internal, Defleksi FWD, Modulus Elastisitas Burmister, dan Desain Overlay
            </p>
          </div>
        </div>

        {result && (
          <button
            onClick={() => generateOfficialReportPdf(result, 'FIELD_ENGINEER')}
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/25 border border-white/20 flex items-center space-x-2 transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Cetak PDF Desain Overlay</span>
          </button>
        )}
      </div>

      {/* RBAC Scope Explanation Bar */}
      <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-bold text-amber-300">Hak Akses Data Role Insinyur:</span>
          <span className="text-slate-300">
            Anda dapat melihat tensor regangan, basin lendutan FWD, dan kalkulator overlay. Data WIM live & proyeksi anggaran APBN dibatasi untuk role terkait.
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Deflection Basin Curve (6 cols) */}
        <div className="lg:col-span-6 bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Activity className="w-4 h-4 text-cyan-400 mr-2" />
              Kurva Mangkok Lendutan Surface Deflection Basin w(r)
            </h3>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              Profil Defleksi FWD
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deflectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis
                  dataKey="distanceMm"
                  stroke="#94a3b8"
                  fontSize={11}
                  unit=" mm"
                />
                <YAxis stroke="#94a3b8" fontSize={11} unit=" µm" reversed />
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
          <p className="text-[11px] text-slate-400 font-mono">
            *Lendutan maksimum di bawah pusat beban: {result ? result.tensors.surfaceDeflectionMaxMicron : 480} µm.
          </p>
        </div>

        {/* Chart 2: Tensile & Compressive Strain vs AASHTO Limit (6 cols) */}
        <div className="lg:col-span-6 bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Ruler className="w-4 h-4 text-amber-400 mr-2" />
              Tensor Regangan Kritis (Microstrain µε) vs Batas Ijin
            </h3>
            <span className="text-[11px] font-mono text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Kriteria Lelehan Lelah
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
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    backdropFilter: 'blur(12px)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="NilaiSimulasi" name="Hasil Simulasi PINN" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="BatasIjinAashto" name="Batas Ijin Bina Marga" fill="#475569" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            *Apabila nilai simulasi melebihi batas ijin, perkuatan overlay struktural wajib dilakukan.
          </p>
        </div>
      </div>

      {/* Structural Engineering Recommendation Cards */}
      {result && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center border-b border-white/10 pb-3">
            <Layers className="w-4 h-4 text-emerald-400 mr-2" />
            Spesifikasi & Cetak Biru Rekayasa Lapisan Tambah (Overlay Design Blueprint)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Box 1 */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Rekomendasi Tebal Overlay
              </span>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono">
                {result.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm} cm
              </p>
              <p className="text-slate-300 font-medium pt-1">
                {result.roleOutputs.fieldEngineer.recommendedOverlayType}
              </p>
            </div>

            {/* Box 2 */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Estimasi Pothole Horizon
              </span>
              <p className="text-2xl font-extrabold text-cyan-400 font-mono">
                {result.roleOutputs.fieldEngineer.potholeHorizonDays} Hari
              </p>
              <p className="text-slate-300 font-medium pt-1">
                Proyeksi waktu pembentukan retak lelah & lubang jalan jika tanpa penanganan.
              </p>
            </div>

            {/* Box 3 */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Prioritas Penanganan Teknik
              </span>
              <p className="text-2xl font-extrabold text-amber-400 font-mono">
                PERINGKAT #{result.roleOutputs.fieldEngineer.structuralPriorityRank}
              </p>
              <p className="text-slate-300 font-medium pt-1">
                Prioritas penanganan struktural di tingkat Balai Besar Pelaksanaan Jalan Nasional.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 text-xs text-slate-300 font-sans leading-relaxed">
            <span className="font-bold text-amber-400 block mb-1">Catatan Teknis Insinyur:</span>
            {result.roleOutputs.fieldEngineer.engineeringNotes}
          </div>
        </div>
      )}
    </div>
  );
};
