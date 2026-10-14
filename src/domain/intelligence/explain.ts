/**
 * Deterministic explanation layer (spec §18, §27; execution brief §Q):
 * DATA → ENGINE → RESULT → RULES/EVIDENCE → EXPLANATION.
 *
 * It only restates computed results and recorded evidence. It uses qualitative factor
 * levels (HIGH/MEDIUM/LOW/UNCERTAIN), never invented percentage contributions, and it
 * recommends human actions ("consider", "request"), never automatic interventions.
 * An LLM may later rephrase this structure; it must not add conclusions.
 */
import type { ReportCase } from '../workflow/model';
import type { EngineeringAssessment, RiskLevel } from './assessment';

export type FactorLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';

export interface ExplanationFactor {
  factor: string;
  level: FactorLevel;
  basis: string;
}

export interface StructuredExplanation {
  what: string;
  why: ExplanationFactor[];
  evidence: string[];
  confidence: { level: EngineeringAssessment['confidence']; reasons: string[] };
  next: string[];
  source: 'DETERMINISTIC_RULES';
}

const RISK_TEXT: Record<RiskLevel, string> = {
  HIGH: 'Risiko tinggi — ruas ini mungkin perlu perhatian segera.',
  WATCH: 'Perlu diawasi — tanda kerusakan berkembang.',
  MODERATE: 'Risiko sedang.',
  GOOD: 'Kondisi relatif baik menurut indikator yang tersedia.'
};

export function explainAssessment(a: EngineeringAssessment, cases: ReportCase[] = []): StructuredExplanation {
  const segmentCases = cases.filter((c) => c.segmentId === a.segmentId);
  const open = segmentCases.filter((c) => c.state !== 'CLOSED' && c.state !== 'RESOLVED');
  const confirmed = open.filter((c) => c.inspection?.verdict === 'CONFIRMED');

  const heavyShare = a.traffic.heavyVehicleShare.value;
  const traffic: FactorLevel = heavyShare >= 0.3 ? 'HIGH' : heavyShare >= 0.15 ? 'MEDIUM' : 'LOW';
  const damage: FactorLevel = confirmed.length > 0 ? 'HIGH' : open.length > 0 ? 'MEDIUM' : 'LOW';
  const rain = a.weather.value ? (a.weather.value.rainfallMmPerHr >= 30 ? 'HIGH' : a.weather.value.rainfallMmPerHr >= 15 ? 'MEDIUM' : 'LOW') : 'UNCERTAIN';
  const subgrade: FactorLevel = a.inputs.subgradeCbrPercent <= 4 ? 'HIGH' : a.inputs.subgradeCbrPercent <= 6 ? 'MEDIUM' : 'LOW';

  const why: ExplanationFactor[] = [
    { factor: 'Lalu lintas berat (estimasi)', level: traffic, basis: `${Math.round(heavyShare * 100)}% kendaraan berat — ${a.traffic.wim.status === 'WIM_NOT_AVAILABLE' ? 'INFERRED, tanpa WIM' : 'dengan WIM'}` },
    { factor: 'Kerusakan yang ada', level: damage, basis: `${open.length} laporan terbuka, ${confirmed.length} terkonfirmasi inspeksi` },
    { factor: 'Paparan hujan', level: rain as FactorLevel, basis: a.weather.value ? `${a.weather.value.rainfallMmPerHr} mm/jam (${a.weather.dataStatus})` : 'sumber cuaca tidak tersedia' },
    { factor: 'Daya dukung tanah dasar', level: subgrade, basis: `CBR ${a.inputs.subgradeCbrPercent}% (REFERENCE BASELINE, SYNTHETIC)` },
    { factor: 'Riwayat deteriorasi', level: 'UNCERTAIN', basis: 'Data kondisi historis belum tersedia (DATA REQUIRED)' }
  ];

  const evidence = [
    `Mesin: ${a.engine} — ${a.modelVersion}; status validasi ${a.validationStatus}.`,
    `Skor kondisi prototipe ${a.outputs.conditionScorePrototype}; regangan tarik εt ≈ ${Math.round(a.outputs.tensileStrainMicro)} µε (estimasi rumus).`,
    `ESAL harian (estimasi) ≈ ${Math.round(a.traffic.dailyEsal.central)} (rentang ${Math.round(a.traffic.dailyEsal.low)}–${Math.round(a.traffic.dailyEsal.high)}).`,
    ...a.riskReasons
  ];
  if (a.outOfRange.length > 0) evidence.push(`Di luar rentang tervalidasi: ${a.outOfRange.join('; ')}.`);

  const next: string[] = [];
  const awaitingReview = open.filter((c) => c.state === 'NEEDS_REVIEW').length;
  if (awaitingReview > 0) next.push(`Tinjau ${awaitingReview} laporan yang menunggu peninjauan.`);
  if (a.risk === 'HIGH' || a.risk === 'WATCH') next.push('Pertimbangkan meminta inspeksi lapangan untuk mengonfirmasi kondisi.');
  if (confirmed.length > 0 && !confirmed.some((c) => c.recommendation)) next.push('Susun rekomendasi penanganan berdasarkan hasil inspeksi.');
  if (next.length === 0) next.push('Lanjutkan pemantauan rutin; tidak ada tindakan mendesak dari indikator saat ini.');

  return {
    what: `${a.segmentId}: ${RISK_TEXT[a.risk]}`,
    why,
    evidence,
    confidence: { level: a.confidence, reasons: a.uncertaintyReasons },
    next,
    source: 'DETERMINISTIC_RULES'
  };
}
