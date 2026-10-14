/**
 * Road segment insight with progressive disclosure (spec §21.7–21.8, §27–§31):
 * 1 risk → 2 main factors → 3 "why" + confidence → 4 technical details → 5 provenance.
 * Plus Road Story (OBSERVED / PREDICTED / SIMULATED / DECISION, never merged) and
 * What-If (baseline vs scenario, always labelled SIMULATION).
 */
import React, { useState } from 'react';
import type { AssessmentInputs, EngineeringAssessment, RiskLevel } from '../../domain/intelligence/assessment';
import type { StructuredExplanation } from '../../domain/intelligence/explain';
import type { StoryEntry, StoryKind } from '../../domain/intelligence/roadStory';
import type { WhatIfResult } from '../../domain/intelligence/whatIf';

const RISK: Record<RiskLevel, { label: string; className: string; sentence: string }> = {
  HIGH: { label: 'Risiko tinggi', className: 'bg-[#E5484D]/15 text-[#ffb1b3] border-[#E5484D]/50', sentence: 'Ruas ini mungkin perlu perhatian.' },
  WATCH: { label: 'Perlu diawasi', className: 'bg-[#F5A524]/15 text-[#ffd08a] border-[#F5A524]/50', sentence: 'Tanda kerusakan berkembang.' },
  MODERATE: { label: 'Sedang', className: 'bg-[#F2C94C]/15 text-[#f5dc8a] border-[#F2C94C]/50', sentence: 'Pantau secara rutin.' },
  GOOD: { label: 'Baik', className: 'bg-[#2FB344]/15 text-[#8be597] border-[#2FB344]/50', sentence: 'Indikator saat ini relatif baik.' }
};

const KIND: Record<StoryKind, { label: string; className: string }> = {
  OBSERVED: { label: 'OBSERVED', className: 'border-emerald-500/50 text-emerald-200 bg-emerald-500/10' },
  PREDICTED: { label: 'PREDICTED', className: 'border-sky-500/50 text-sky-200 bg-sky-500/10' },
  SIMULATED: { label: 'SIMULATED', className: 'border-[#8B5CF6]/60 text-violet-200 bg-[#8B5CF6]/10' },
  DECISION: { label: 'DECISION', className: 'border-slate-500/50 text-slate-200 bg-slate-600/20' }
};

const LEVEL_CLASS: Record<string, string> = {
  HIGH: 'text-[#ffb1b3]',
  MEDIUM: 'text-[#ffd08a]',
  LOW: 'text-[#8be597]',
  UNCERTAIN: 'text-slate-400'
};

const card = 'rounded-2xl border border-white/10 bg-[#121622] p-4 space-y-3';
const tag = 'inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide';

export const RiskBadge: React.FC<{ risk: RiskLevel }> = ({ risk }) => (
  <span className={`${tag} ${RISK[risk].className}`}>{RISK[risk].label}</span>
);

export const SegmentRiskCard: React.FC<{ assessment: EngineeringAssessment; explanation: StructuredExplanation }> = ({ assessment: a, explanation: e }) => (
  <section className={card} aria-label="Risiko ruas">
    <div className="flex flex-wrap items-center gap-2">
      <RiskBadge risk={a.risk} />
      <span className="text-sm font-bold text-white">{RISK[a.risk].sentence}</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      <span className={`${tag} border-amber-500/40 text-amber-200`}>{a.engine}</span>
      <span className={`${tag} border-slate-500/40 text-slate-300`}>{a.validationStatus}</span>
      {a.traffic.wim.status === 'WIM_NOT_AVAILABLE' && <span className={`${tag} border-slate-500/40 text-slate-300`}>WIM DATA NOT AVAILABLE</span>}
      <span className={`${tag} border-slate-500/40 text-slate-300`}>Cuaca: {a.weather.dataStatus}</span>
      <span className={`${tag} border-slate-500/40 text-slate-300`}>Struktur: REFERENCE BASELINE</span>
    </div>

    <div>
      <h3 className="text-[11px] font-semibold text-slate-300">Mengapa?</h3>
      <ul className="mt-1 grid gap-1 sm:grid-cols-2">
        {e.why.map((f) => (
          <li key={f.factor} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px]">
            <span className="text-slate-200">{f.factor}</span>
            <span className={`ml-1.5 font-bold ${LEVEL_CLASS[f.level]}`}>{f.level}</span>
            <p className="text-[10px] text-slate-400">{f.basis}</p>
          </li>
        ))}
      </ul>
    </div>

    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-[11px]">
      <p className="font-semibold text-slate-200">
        Kepercayaan: <span className="text-amber-200">{e.confidence.level === 'LOW' ? 'Rendah' : e.confidence.level === 'MODERATE' ? 'Sedang' : 'Tinggi'}</span>
      </p>
      <ul className="mt-1 list-disc pl-4 text-slate-400 space-y-0.5">
        {e.confidence.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>

    <div className="text-[11px]">
      <h3 className="font-semibold text-slate-300">Langkah yang dapat dipertimbangkan petugas</h3>
      <ul className="mt-1 list-disc pl-4 text-slate-300 space-y-0.5">
        {e.next.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-slate-500">Penjelasan disusun dari hasil mesin dan bukti tercatat (aturan deterministik). AI tidak memutuskan tindakan.</p>
    </div>

    <details className="text-[11px]">
      <summary className="cursor-pointer font-semibold text-slate-300 hover:text-white">Detail teknis</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <dl className="space-y-1 rounded-lg bg-white/[0.03] p-2.5">
          <dt className="font-semibold text-slate-200">Keluaran mesin (estimasi rumus)</dt>
          <dd className="text-slate-400">Skor kondisi prototipe: {a.outputs.conditionScorePrototype} (bukan PCI tervalidasi)</dd>
          <dd className="text-slate-400">Regangan tarik εt ≈ {Math.round(a.outputs.tensileStrainMicro)} µε</dd>
          <dd className="text-slate-400">Regangan tekan εv ≈ {Math.round(a.outputs.compressiveStrainMicro)} µε</dd>
          <dd className="text-slate-400">Lendutan permukaan ≈ {Math.round(a.outputs.surfaceDeflectionMicron)} µm</dd>
          <dd className="text-slate-400">Residu fisika: tidak tersedia (mesin RULE_BASED, bukan PINN terlatih)</dd>
          <dd className="text-slate-400">ESAL harian (estimasi): {Math.round(a.traffic.dailyEsal.central)} (rentang {Math.round(a.traffic.dailyEsal.low)}–{Math.round(a.traffic.dailyEsal.high)})</dd>
          <dd className="text-slate-500">{a.modelVersion}</dd>
        </dl>
        <dl className="space-y-1 rounded-lg bg-white/[0.03] p-2.5">
          <dt className="font-semibold text-slate-200">Input & asal data</dt>
          {(Object.keys(a.inputs) as Array<keyof AssessmentInputs>).map((k) => (
            <dd key={k} className="text-slate-400">
              {k}: <span className="text-slate-200">{a.inputs[k]}</span> — {a.inputProvenance[k]}
            </dd>
          ))}
          {a.outOfRange.length > 0 && <dd className="text-amber-200">Di luar rentang tervalidasi: {a.outOfRange.join('; ')}</dd>}
        </dl>
      </div>
    </details>
  </section>
);

export const RoadStoryTimeline: React.FC<{ story: StoryEntry[]; note: string }> = ({ story, note }) => (
  <section className={card} aria-label="Road Story">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-white">Road Story</h3>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(KIND) as StoryKind[]).map((k) => (
          <span key={k} className={`${tag} ${KIND[k].className}`}>
            {KIND[k].label}
          </span>
        ))}
      </div>
    </div>
    <p className="text-[10px] text-slate-500">{note}</p>
    {story.length === 0 ? (
      <p className="text-[11px] text-slate-400">Belum ada catatan untuk ruas ini.</p>
    ) : (
      <ol className="space-y-2 border-l border-white/10 pl-3">
        {story.map((s, i) => (
          <li key={`${s.at}-${i}`} className="text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`${tag} ${KIND[s.kind].className}`}>{KIND[s.kind].label}</span>
              <span className="font-mono text-slate-500">{new Date(s.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            <p className="mt-0.5 font-semibold text-slate-100">{s.title}</p>
            {s.detail && <p className="text-slate-400">{s.detail}</p>}
          </li>
        ))}
      </ol>
    )}
  </section>
);

interface SliderDef {
  key: keyof AssessmentInputs;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'asphaltThicknessCm', label: 'Tebal lapis aspal', unit: 'cm', min: 5, max: 25, step: 1 },
  { key: 'subgradeCbrPercent', label: 'CBR tanah dasar', unit: '%', min: 3, max: 10, step: 0.5 },
  { key: 'axleLoadTon', label: 'Beban sumbu', unit: 't', min: 10, max: 25, step: 0.5 },
  { key: 'rainIntensityMmHr', label: 'Intensitas hujan', unit: 'mm/jam', min: 0, max: 100, step: 5 }
];

export const WhatIfPanel: React.FC<{
  baseline: AssessmentInputs;
  onRun: (scenario: Partial<AssessmentInputs>) => Promise<WhatIfResult>;
}> = ({ baseline, onRun }) => {
  const [values, setValues] = useState<AssessmentInputs>(baseline);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WhatIfResult | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const scenario: Partial<AssessmentInputs> = {};
      for (const s of SLIDERS) if (values[s.key] !== baseline[s.key]) scenario[s.key] = values[s.key];
      setResult(await onRun(scenario));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const row = (label: string, b: number, s: number, unit = '') => {
    const d = s - b;
    return (
      <tr key={label} className="border-t border-white/5">
        <th scope="row" className="py-1 pr-2 text-left font-medium text-slate-300">{label}</th>
        <td className="py-1 pr-2 text-slate-200">{Math.round(b)}{unit}</td>
        <td className="py-1 pr-2 text-slate-200">{Math.round(s)}{unit}</td>
        <td className={`py-1 font-semibold ${d === 0 ? 'text-slate-400' : 'text-violet-200'}`}>{d > 0 ? '+' : ''}{Math.round(d)}{unit}</td>
      </tr>
    );
  };

  return (
    <section className={card} aria-label="What-If">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">Coba skenario (What-If)</h3>
        <span className={`${tag} border-[#8B5CF6]/60 text-violet-200 bg-[#8B5CF6]/10`}>SIMULATION</span>
      </div>
      <p className="text-[11px] text-slate-400">Mengubah parameter tidak mengubah data lapangan. Hasil dihitung mesin RULE_BASED dan bukan fakta lapangan.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <label htmlFor={`wi-${s.key}`} className="flex justify-between text-[11px] text-slate-300">
              <span>{s.label}</span>
              <span className="font-mono text-slate-100">
                {values[s.key]} {s.unit}
                {values[s.key] !== baseline[s.key] && <span className="ml-1 text-violet-200">(awal {baseline[s.key]})</span>}
              </span>
            </label>
            <input
              id={`wi-${s.key}`}
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={values[s.key]}
              onChange={(e) => setValues({ ...values, [s.key]: Number(e.target.value) })}
              className="w-full accent-violet-400"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          aria-busy={busy}
          className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white hover:bg-violet-400 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 transition-colors"
        >
          {busy ? 'Menghitung…' : 'Jalankan simulasi'}
        </button>
        <button type="button" onClick={() => { setValues(baseline); setResult(null); }} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 transition-colors">
          Kembalikan ke kondisi awal
        </button>
      </div>
      {error && <p role="alert" className="text-[11px] text-rose-200">Simulasi gagal: {error}</p>}
      {result && (
        <div className="space-y-2" role="status">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-300">Risiko:</span>
            <RiskBadge risk={result.riskChange.from} />
            <span aria-hidden="true">→</span>
            <RiskBadge risk={result.riskChange.to} />
            <span className="text-violet-200">(SIMULATION)</span>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-slate-400">
                <th scope="col" className="text-left font-medium">Indikator</th>
                <th scope="col" className="text-left font-medium">Saat ini</th>
                <th scope="col" className="text-left font-medium">Skenario</th>
                <th scope="col" className="text-left font-medium">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {row('Skor kondisi prototipe', result.baseline.outputs.conditionScorePrototype, result.scenario.outputs.conditionScorePrototype)}
              {row('Regangan tarik εt', result.baseline.outputs.tensileStrainMicro, result.scenario.outputs.tensileStrainMicro, ' µε')}
              {row('Regangan tekan εv', result.baseline.outputs.compressiveStrainMicro, result.scenario.outputs.compressiveStrainMicro, ' µε')}
              {row('Lendutan', result.baseline.outputs.surfaceDeflectionMicron, result.scenario.outputs.surfaceDeflectionMicron, ' µm')}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-300">{result.explanation}</p>
          {result.sanity.checks.map((c) => (
            <p key={c.rule} className={`text-[10px] ${c.ok ? 'text-emerald-200' : 'text-amber-200'}`}>
              {c.ok ? 'Arah fisik sesuai' : 'Arah fisik tidak sesuai — model ditandai untuk ditinjau'}: {c.rule}
            </p>
          ))}
        </div>
      )}
    </section>
  );
};
