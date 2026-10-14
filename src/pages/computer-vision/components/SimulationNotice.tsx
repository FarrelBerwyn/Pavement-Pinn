import React from 'react';
import { StatusBadge } from '../../../components/ui/PageOverlay';

// Shared styling for the three computer-vision pages.
export const cardClass = 'bg-[#121622] border border-white/10 rounded-3xl p-5 space-y-3';
export const primaryLink = 'inline-block px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer';
export const secondaryLink = 'inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-slate-200 font-bold text-xs';

/** Shown on every Computer Vision page so the capability is never overstated. */
export const SimulationNotice: React.FC = () => (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start gap-3">
    <StatusBadge status="SIMULATED" />
    <p className="text-xs text-amber-100/90">
      Klasifikasi kerusakan saat ini adalah simulasi: kelas dipilih dari kata kunci pada nama berkas / URL foto (bawaan:
      pothole), dan nilai confidence serta kotak deteksi berasal dari tabel taksonomi. Tidak ada model visi yang dijalankan
      dan foto tidak dikirim ke server.
    </p>
  </div>
);
