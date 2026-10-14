import React from 'react';

/**
 * Plain notice above a legacy screen whose figures are illustrative or simulated, so no
 * demo number is read as a measurement or a validated model output (spec §28, §38).
 */
export const DataNotice: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <aside role="note" className="mx-3 sm:mx-4 my-2 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
    <span className="shrink-0 rounded border border-amber-400/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">{label}</span>
    <span>{children}</span>
  </aside>
);
