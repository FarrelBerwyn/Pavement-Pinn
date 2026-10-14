/**
 * Engineering assessment of one road segment: DATA → ENGINE → RESULT, with provenance,
 * uncertainty and validation status (spec §16, §28, §29, §31).
 *
 * Engine status, stated plainly: no trained PINN weights exist in this repository. The
 * engine used here is the deterministic formula in src/engines/pinn (Burmister-inspired
 * strain estimates, fourth-power load factor, moisture decay), reported as RULE_BASED.
 * Its "condition score" is a prototype indicator, not a validated PCI.
 */
import type { DamageReport, RoadSegment } from '../../types';
import { runPinnSimulation } from '../../engines/pinn/core/pinnEngine';
import type { ReportCase } from '../workflow/model';
import { Confidence, estimateTrafficLoad, NO_WIM_PROVIDER, pavementBaseline, Provenanced, TrafficLoadEstimate, WeatherObservation, weatherEvidence, WimProvider } from './evidence';

export type RiskLevel = 'HIGH' | 'WATCH' | 'MODERATE' | 'GOOD';

export const RULE_BASED_ENGINE_VERSION = 'pinnEngine-formula@1 (deterministic, no trained weights)';

/** Ranges the formula engine was written for; inputs outside are flagged (spec §29 OOD warning). */
export const ENGINE_INPUT_RANGES = {
  axleLoadTon: [10, 25],
  rainIntensityMmHr: [0, 100],
  subgradeCbrPercent: [3, 10],
  asphaltThicknessCm: [5, 25],
  asphaltModulusMpa: [1200, 3500]
} as const;

export interface AssessmentInputs {
  axleLoadTon: number;
  rainIntensityMmHr: number;
  floodDurationHours: number;
  surfaceTemperatureC: number;
  subgradeCbrPercent: number;
  asphaltThicknessCm: number;
  asphaltModulusMpa: number;
}

export interface EngineeringAssessment {
  id: string;
  segmentId: string;
  createdAt: string;
  engine: 'PINN' | 'RULE_BASED';
  modelVersion: string;
  inputs: AssessmentInputs;
  inputProvenance: Record<keyof AssessmentInputs, string>;
  outputs: {
    conditionScorePrototype: number;
    tensileStrainMicro: number;
    compressiveStrainMicro: number;
    surfaceDeflectionMicron: number;
  };
  risk: RiskLevel;
  riskReasons: string[];
  confidence: Confidence;
  uncertaintyReasons: string[];
  outOfRange: string[];
  /** Null: the rule-based engine has no physics residual; a trained PINN would report it. */
  physicsResidual: number | null;
  validationStatus: 'VALIDATION_REQUIRED';
  dataStatus: 'RULE_BASED';
  traffic: TrafficLoadEstimate;
  weather: Provenanced<WeatherObservation | null>;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function defaultInputs(segment: RoadSegment, now: string): { inputs: AssessmentInputs; provenance: Record<keyof AssessmentInputs, string>; weather: Provenanced<WeatherObservation | null> } {
  const baseline = pavementBaseline(segment);
  const weather = weatherEvidence(segment, now);
  const [cbrLo, cbrHi] = baseline.value.subgradeCbrRange;
  const [eLo, eHi] = baseline.value.asphaltModulusRangeMpa;
  return {
    inputs: {
      axleLoadTon: segment.defaultAxleLoadTon,
      rainIntensityMmHr: weather.value ? weather.value.rainfallMmPerHr : 0,
      floodDurationHours: weather.value?.wetSurface ? 2 : 0,
      surfaceTemperatureC: weather.value ? weather.value.temperatureC + 12 : 40,
      subgradeCbrPercent: Math.round(((cbrLo + cbrHi) / 2) * 10) / 10,
      asphaltThicknessCm: baseline.value.surfaceThicknessCm,
      asphaltModulusMpa: Math.round((eLo + eHi) / 2)
    },
    provenance: {
      axleLoadTon: 'SYNTHETIC segment attribute (no WIM)',
      rainIntensityMmHr: `${weather.dataStatus} weather`,
      floodDurationHours: `${weather.dataStatus} weather (wet surface → 2 h assumed)`,
      surfaceTemperatureC: `${weather.dataStatus} air temperature + 12 °C surface assumption`,
      subgradeCbrPercent: 'REFERENCE BASELINE midpoint (SYNTHETIC)',
      asphaltThicknessCm: 'REFERENCE BASELINE (SYNTHETIC)',
      asphaltModulusMpa: 'REFERENCE BASELINE midpoint (SYNTHETIC)'
    },
    weather
  };
}

function riskFromScore(score: number): RiskLevel {
  if (score < 40) return 'HIGH';
  if (score < 55) return 'WATCH';
  if (score < 70) return 'MODERATE';
  return 'GOOD';
}

const RISK_ORDER: RiskLevel[] = ['GOOD', 'MODERATE', 'WATCH', 'HIGH'];
const maxRisk = (a: RiskLevel, b: RiskLevel): RiskLevel => (RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b);

export function assessSegment(
  segment: RoadSegment,
  options: { now: string; inputs?: Partial<AssessmentInputs>; cases?: ReportCase[]; wim?: WimProvider } = { now: new Date().toISOString() }
): EngineeringAssessment {
  const base = defaultInputs(segment, options.now);
  const inputs: AssessmentInputs = { ...base.inputs, ...(options.inputs ?? {}) };
  const provenance = { ...base.provenance };
  for (const key of Object.keys(options.inputs ?? {}) as Array<keyof AssessmentInputs>) provenance[key] = 'USER SCENARIO INPUT (SIMULATED)';

  const outOfRange = (Object.keys(ENGINE_INPUT_RANGES) as Array<keyof typeof ENGINE_INPUT_RANGES>)
    .filter((k) => inputs[k] < ENGINE_INPUT_RANGES[k][0] || inputs[k] > ENGINE_INPUT_RANGES[k][1])
    .map((k) => `${k}=${inputs[k]} outside ${ENGINE_INPUT_RANGES[k][0]}–${ENGINE_INPUT_RANGES[k][1]}`);

  // The formula engine is only evaluated inside its range; outside, inputs are clamped and flagged.
  const result = runPinnSimulation(
    {
      segmentId: segment.id,
      axleLoadTon: clamp(inputs.axleLoadTon, 10, 25),
      rainIntensityMmHr: clamp(inputs.rainIntensityMmHr, 0, 100),
      floodDurationHours: clamp(inputs.floodDurationHours, 0, 48),
      surfaceTemperatureC: clamp(inputs.surfaceTemperatureC, 25, 60),
      subgradeCbrPercent: clamp(inputs.subgradeCbrPercent, 3, 10),
      asphaltThicknessCm: clamp(inputs.asphaltThicknessCm, 5, 25),
      asphaltModulusMpa: clamp(inputs.asphaltModulusMpa, 1200, 3500),
      targetDevice: 'CPU',
      precisionMode: 'FP32'
    },
    segment
  );

  const score = result.predictedPci;
  let risk = riskFromScore(score);
  const riskReasons = [`Prototype condition score ${score} (rule-based engine).`];

  // Observed evidence from the workflow can raise the risk; it never lowers it.
  const segmentCases = (options.cases ?? []).filter((c) => c.segmentId === segment.id && c.state !== 'CLOSED' && c.state !== 'RESOLVED');
  const confirmed = segmentCases.filter((c) => c.inspection?.verdict === 'CONFIRMED');
  if (confirmed.some((c) => c.inspection?.severity === 'CRITICAL')) {
    risk = maxRisk(risk, 'HIGH');
    riskReasons.push('Field inspection confirmed CRITICAL damage.');
  } else if (confirmed.some((c) => c.inspection?.severity === 'SEVERE')) {
    risk = maxRisk(risk, 'WATCH');
    riskReasons.push('Field inspection confirmed SEVERE damage.');
  }
  const openReports = segmentCases.length;
  if (openReports > 0) riskReasons.push(`${openReports} open citizen report(s) on this segment (not all verified).`);

  const traffic = estimateTrafficLoad(segment, options.wim ?? NO_WIM_PROVIDER);
  const uncertaintyReasons = [
    'Engine is RULE_BASED, not a trained PINN; outputs are not validated against field data.',
    'Pavement structure is a REFERENCE BASELINE (SYNTHETIC), not a survey of this segment.'
  ];
  if (traffic.wim.status === 'WIM_NOT_AVAILABLE') uncertaintyReasons.push('WIM data is unavailable, so traffic load is estimated.');
  if (base.weather.dataStatus !== 'PUBLIC') uncertaintyReasons.push(`Weather is ${base.weather.dataStatus}, not a live observation.`);
  if (outOfRange.length > 0) uncertaintyReasons.push('Outside validated range: inputs were clamped to the engine range.');

  return {
    id: `ASM-${segment.id}-${hash(JSON.stringify(inputs))}`,
    segmentId: segment.id,
    createdAt: options.now,
    engine: 'RULE_BASED',
    modelVersion: RULE_BASED_ENGINE_VERSION,
    inputs,
    inputProvenance: provenance,
    outputs: {
      conditionScorePrototype: score,
      tensileStrainMicro: result.tensors.tensileStrainEt,
      compressiveStrainMicro: result.tensors.compressiveStrainEv,
      surfaceDeflectionMicron: result.tensors.surfaceDeflectionMaxMicron
    },
    risk,
    riskReasons,
    // Never above LOW while every input is synthetic, demo or inferred.
    confidence: 'LOW',
    uncertaintyReasons,
    outOfRange,
    physicsResidual: null,
    validationStatus: 'VALIDATION_REQUIRED',
    dataStatus: 'RULE_BASED',
    traffic,
    weather: base.weather
  };
}

/** Compact snapshot stored with a maintenance recommendation (provenance travels with it). */
export interface AssessmentSnapshot {
  id: string;
  engine: EngineeringAssessment['engine'];
  modelVersion: string;
  risk: RiskLevel;
  conditionScorePrototype: number;
  confidence: Confidence;
  validationStatus: 'VALIDATION_REQUIRED';
  createdAt: string;
}

export function snapshotOf(a: EngineeringAssessment): AssessmentSnapshot {
  return {
    id: a.id,
    engine: a.engine,
    modelVersion: a.modelVersion,
    risk: a.risk,
    conditionScorePrototype: a.outputs.conditionScorePrototype,
    confidence: a.confidence,
    validationStatus: a.validationStatus,
    createdAt: a.createdAt
  };
}

/** Surface indicator from the citizen report / CV class. Engineering parameters need calibration. */
export interface SurfaceIndicator {
  distressClass: string;
  severity: DamageReport['severity'];
  evidenceSource: 'CITIZEN_REPORT' | 'CV_DEMO' | 'CV_MODEL' | 'FIELD_INSPECTION';
  confidence: number | null;
  translation: { rule: string; version: string; status: 'CALIBRATION_REQUIRED' };
  note: string;
}

/**
 * CV → engineering translation boundary (spec §8.2). It deliberately produces a surface
 * condition indicator only. No modulus, CBR or axle load is inferred from a photo: the
 * calibration that would justify such a mapping does not exist yet.
 */
export function translateSurfaceEvidence(report: DamageReport, inspection?: ReportCase['inspection']): SurfaceIndicator {
  if (inspection) {
    return {
      distressClass: inspection.cvReview.correctedClass ?? report.damageType,
      severity: inspection.severity,
      evidenceSource: 'FIELD_INSPECTION',
      confidence: null,
      translation: { rule: 'none (observed indicator)', version: 'n/a', status: 'CALIBRATION_REQUIRED' },
      note: 'Observed by the assigned engineer; still not converted into structural parameters without calibration.'
    };
  }
  return {
    distressClass: report.aiAnalysis?.class ?? report.damageType,
    severity: report.severity,
    evidenceSource: report.aiAnalysis ? 'CV_DEMO' : 'CITIZEN_REPORT',
    confidence: report.aiAnalysis ? report.aiAnalysis.confidence : null,
    translation: { rule: 'distress class + severity → surface condition indicator', version: 'translation-0 (uncalibrated)', status: 'CALIBRATION_REQUIRED' },
    note: 'CALIBRATION REQUIRED: photos do not reveal modulus, CBR, stress or strain (spec §8.1).'
  };
}
