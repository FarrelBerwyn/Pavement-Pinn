import React, { useState } from 'react';
import { RoadSegment, SimulationResult } from '../types';
import { generateOfficialReportPdf } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';
import {
  Truck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileDown,
  Compass
} from 'lucide-react';

interface OperationsManagerDashboardProps {
  simulationResult: SimulationResult | null;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  onRunSimulation: () => void;
}

interface WIMRecord {
  id: string;
  plate: string;
  axleLoadTon: number;
  speedKmh: number;
  status: 'SAFE' | 'WARNING' | 'ODOL_VIOLATION';
  timestamp: string;
  actionTaken: string;
}

export const OperationsManagerDashboard: React.FC<OperationsManagerDashboardProps> = ({
  simulationResult,
  selectedSegment
}) => {
  const result = simulationResult;

  // WIM Live Sensor Feed
  const [wimFeed] = useState<WIMRecord[]>([
    {
      id: 'WIM-101',
      plate: 'B 9482 UT',
      axleLoadTon: 23.8,
      speedKmh: 42,
      status: 'ODOL_VIOLATION',
      timestamp: 'Just now',
      actionTaken: 'TRANSFER_CARGO_ORDER'
    },
    {
      id: 'WIM-102',
      plate: 'E 8831 AA',
      axleLoadTon: 16.5,
      speedKmh: 58,
      status: 'WARNING',
      timestamp: '2 min ago',
      actionTaken: 'INSPECT_AND_WEIGH'
    },
    {
      id: 'WIM-103',
      plate: 'DK 9012 B',
      axleLoadTon: 9.8,
      speedKmh: 65,
      status: 'SAFE',
      timestamp: '5 min ago',
      actionTaken: 'PASSED'
    },
    {
      id: 'WIM-104',
      plate: 'KH 8102 FA',
      axleLoadTon: 24.5,
      speedKmh: 38,
      status: 'ODOL_VIOLATION',
      timestamp: '12 min ago',
      actionTaken: 'REROUTE_MANDATORY'
    }
  ]);

  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);

  // Trigger Action
  const handleIssueEnforcementAction = (actionName: string) => {
    setLastActionStatus(actionName);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => setLastActionStatus(null), 4000);
  };

  const alertStatus = result ? result.roleOutputs.operationsManager.alertStatus : 'RED';
  const dynamicLimit = result ? result.roleOutputs.operationsManager.maxAllowedDynamicTonnageTon : 12.0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-500/20 text-rose-300 rounded-2xl border border-rose-500/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] bg-rose-500/20 text-rose-300 font-mono font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                Lensa Akses: Operations Manager WIM (Kemenhub/BPTD)
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Akses Terbuka Hak RBAC Level 2
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-1">
              Dashboard Operasional WIM & Penindakan ODOL
            </h1>
            <p className="text-xs text-slate-400">
              Sinyal Keputusan Real-Time Dalam Hitungan Detik di Pos Jembatan Timbang & Sensor Weigh-In-Motion
            </p>
          </div>
        </div>

        {result && (
          <button
            onClick={() => generateOfficialReportPdf(result, 'OPERATIONS_MANAGER')}
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/25 border border-white/20 flex items-center space-x-2 transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Cetak Sinyal WIM PDF</span>
          </button>
        )}
      </div>

      {/* RBAC Scope Explanation Bar */}
      <div className="bg-rose-950/20 border border-rose-500/30 p-3.5 rounded-2xl text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          <span className="font-bold text-rose-300">Hak Akses Data Role Operasional:</span>
          <span className="text-slate-300">
            Anda dapat mengakses sensor WIM live streaming, sistem tilang ANPR, dan eksekusi pengalihan rute truk. Parameter elastisitas & anggaran APBN dibatasi.
          </span>
        </div>
      </div>

      {/* Traffic Light Status Alert Card */}
      <div
        className={`p-6 rounded-3xl border transition-all backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 ${
          alertStatus === 'RED'
            ? 'bg-rose-950/40 border-rose-500/30'
            : alertStatus === 'YELLOW'
            ? 'bg-amber-950/40 border-amber-500/30'
            : 'bg-emerald-950/40 border-emerald-500/30'
        }`}
      >
        <div className="flex items-center space-x-4">
          {/* Traffic Light Signal Circle */}
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center font-extrabold text-2xl text-white shadow-xl ring-4 ${
              alertStatus === 'RED'
                ? 'bg-rose-500 ring-rose-400/50 animate-pulse'
                : alertStatus === 'YELLOW'
                ? 'bg-amber-500 ring-amber-300/50'
                : 'bg-emerald-500 ring-emerald-300/50'
            }`}
          >
            {alertStatus === 'RED' ? '🔴' : alertStatus === 'YELLOW' ? '🟡' : '🟢'}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-300">
                Sinyal Keamanan WIM:
              </span>
              <span
                className={`text-xs font-extrabold px-3 py-0.5 rounded-full ${
                  alertStatus === 'RED'
                    ? 'bg-rose-500 text-white'
                    : alertStatus === 'YELLOW'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                STATUS {alertStatus}
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-white mt-1">
              {result ? result.roleOutputs.operationsManager.operationalAlertSummary : 'Status Pemantauan WIM Aktif'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Ruas: <strong className="text-white">{selectedSegment.name}</strong> | Batas Tonase Dinamis Cuaca:{' '}
              <strong className="text-cyan-300 font-mono">{dynamicLimit} Ton</strong>
            </p>
          </div>
        </div>

        {/* Action Enforcement Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleIssueEnforcementAction('Instruksi Transfer Muatan Dikirim ke Pos BPTD')}
            className="bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-rose-500/25 border border-white/20 transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Transfer Muatan (ODOL)</span>
          </button>

          <button
            onClick={() => handleIssueEnforcementAction('Surat Pengalihan Rute Kendaraan Berat Terbit')}
            className="bg-white/10 hover:bg-white/15 text-slate-100 border border-white/10 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all flex items-center space-x-1.5 backdrop-blur-md"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Pengalihan Rute</span>
          </button>
        </div>
      </div>

      {/* Confirmation Notification Toast */}
      {lastActionStatus && (
        <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl backdrop-blur-xl">
          <span className="flex items-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" />
            Aksi Penindakan Berhasil: {lastActionStatus}
          </span>
          <span className="font-mono text-[10px] text-emerald-400">TERCATAT DI AUDIT TRAIL</span>
        </div>
      )}

      {/* Live WIM Sensor Telemetry Stream */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center">
            <Clock className="w-4 h-4 text-rose-400 mr-2" />
            Live Sensor Stream Weigh-In-Motion (WIM Balonggandu / Betung)
          </h3>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/30 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" />
            Sensor Real-Time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[11px] font-mono text-slate-400 uppercase bg-slate-950/60 border-b border-white/10">
              <tr>
                <th className="p-3">Ref ID</th>
                <th className="p-3">Plat Kendaraan</th>
                <th className="p-3">Beban Sumbu (Ton)</th>
                <th className="p-3">Kecepatan</th>
                <th className="p-3">Status Violasi</th>
                <th className="p-3">Waktu</th>
                <th className="p-3">Aksi Terjadwal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {wimFeed.map((rec) => (
                <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-400">{rec.id}</td>
                  <td className="p-3 font-mono font-bold text-white">{rec.plate}</td>
                  <td className="p-3 font-mono">
                    <span
                      className={`font-bold ${
                        rec.axleLoadTon > 18 ? 'text-rose-400' : rec.axleLoadTon > 12 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {rec.axleLoadTon} Ton
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-300">{rec.speedKmh} km/jam</td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        rec.status === 'ODOL_VIOLATION'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : rec.status === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">{rec.timestamp}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleIssueEnforcementAction(`Penindakan pada ${rec.plate} (${rec.actionTaken})`)}
                      className="bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] px-3 py-1 rounded-xl border border-white/10 font-medium transition-all"
                    >
                      Tindak Langsung
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
