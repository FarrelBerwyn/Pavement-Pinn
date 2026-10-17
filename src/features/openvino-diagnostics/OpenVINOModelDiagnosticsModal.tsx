import React from 'react';
import { IntelTelemetry } from '../../types';
import { Cpu, X } from 'lucide-react';

interface OpenVINOModelDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry?: IntelTelemetry;
}

/**
 * OpenVINO runtime status. The former version ran a simulated benchmark and showed
 * invented latency, throughput and accuracy figures (F-02, F-12, F-14). This version
 * only states what is true: no OpenVINO runtime, IR model or benchmark exists yet.
 * Measured figures will come exclusively from measurements/*.json (AGENTS.md rule 2).
 */
export const OpenVINOModelDiagnosticsModal: React.FC<OpenVINOModelDiagnosticsModalProps> = ({ isOpen, onClose, telemetry }) => {
  if (!isOpen) return null;

  const rows: [string, string][] = [
    ['Mesin yang aktif', 'RULE_BASED (rumus heuristik), bukan jaringan saraf terlatih'],
    ['Model OpenVINO IR', 'belum ada'],
    ['Perangkat (CPU/GPU/NPU)', 'tidak diketahui — hanya dapat dibaca oleh layanan inferensi Python'],
    ['Perangkat yang diminta', telemetry ? `${telemetry.deviceUsed} (${telemetry.precisionUsed}) — permintaan, bukan hasil ukur` : '—'],
    ['Latensi / throughput', 'belum diukur'],
    ['Daya / utilisasi NPU', 'belum diukur'],
    ['Deviasi INT8 vs FP32', 'belum diukur']
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="openvino-status-title">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1320] p-6 text-slate-200 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="openvino-status-title" className="flex items-center gap-2 text-sm font-bold text-white">
            <Cpu className="h-4 w-4 text-slate-400" /> Status OpenVINO
          </h2>
          <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="space-y-2 text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-slate-400">{label}</dt>
              <dd className="text-right font-mono">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          Angka performa hanya ditampilkan setelah skrip benchmark dijalankan pada perangkat uji dan hasilnya tersimpan di
          measurements/*.json. Status: DEMO.
        </p>
      </div>
    </div>
  );
};
