/**
 * Helpers that keep workspace numbers honest: a missing value is null with a reason, and a
 * metric unit is never shown without a valid metric scale.
 */
import type { DamageObject, Measured, MeasurementKey, ScaleStatus, StageId } from './types';
import { MEASUREMENT_KEYS } from './types';

/** Units that need a metric scale (from a marker) to mean anything. */
export const METRIC_UNITS: ReadonlySet<string> = new Set(['mm', 'cm', 'm', 'L', 'm2', 'm²']);

export const REASON = {
  notMeasured: 'belum diukur',
  depthUnavailable: 'Depth unavailable',
  relativeGeometry: 'Relative geometry',
  noValidation: 'Validasi belum tersedia',
  modelNotRun: 'Model belum dijalankan'
} as const;

export function unavailable(unit: string, stage: StageId, reason: string, method = 'none'): Measured {
  return { value: null, unit, uncertainty: null, provenance: 'not_available', source: { stage, method }, reasonUnavailable: reason };
}

export function isMetricUnit(unit: string): boolean {
  return METRIC_UNITS.has(unit);
}

/**
 * Null every metric measurement when the scale is not valid (contract §3 rule 2). Applied on
 * the server before a workspace leaves the API and again in the UI before rendering.
 */
export function enforceScale(object: DamageObject): DamageObject {
  if (object.quality.scaleStatus === 'valid') return object;
  const measurements = { ...object.measurements };
  for (const key of MEASUREMENT_KEYS) {
    const m = measurements[key];
    if (isMetricUnit(m.unit) && m.value !== null) {
      measurements[key] = { ...m, value: null, uncertainty: null, provenance: 'not_available', reasonUnavailable: REASON.relativeGeometry };
    }
  }
  return { ...object, measurements };
}

/** What the UI may print for a measured value: the number or the reason, never a stand-in 0. */
export function displayState(m: Measured | null | undefined, scaleStatus: ScaleStatus = 'valid'):
  | { kind: 'value'; value: number; unit: string; uncertainty: number | null }
  | { kind: 'unavailable'; reason: string } {
  if (!m || m.value === null) return { kind: 'unavailable', reason: m?.reasonUnavailable || REASON.notMeasured };
  if (isMetricUnit(m.unit) && scaleStatus !== 'valid') return { kind: 'unavailable', reason: REASON.relativeGeometry };
  return { kind: 'value', value: m.value, unit: m.unit, uncertainty: m.uncertainty ?? null };
}

export function emptyMeasurements(stage: StageId = 'T5_quantify', reason: string = REASON.notMeasured): DamageObject['measurements'] {
  const unit: Record<MeasurementKey, string> = {
    lengthMm: 'mm',
    widthMeanMm: 'mm',
    widthMaxMm: 'mm',
    depthMaxMm: 'mm',
    depthMeanMm: 'mm',
    areaM2: 'm2',
    volumeL: 'L'
  };
  return Object.fromEntries(MEASUREMENT_KEYS.map((k) => [k, unavailable(unit[k], stage, reason)])) as DamageObject['measurements'];
}
