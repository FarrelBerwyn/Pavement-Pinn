/**
 * Evidence providers for one road segment: traffic → load (with WIM when available),
 * weather, and pavement baseline. Every value carries its data status, source and
 * confidence (spec §9–§13, §28, §30 fallback matrix).
 *
 * Provider interfaces are the seam for real adapters (public traffic data, official WIM,
 * a weather API, digitised baseline surveys). The implementations here are the
 * documented fallbacks and never present inferred or demo values as observations.
 */
import type { RoadSegment } from '../../types';
import type { DataStatus } from '../workflow/model';
import { computeEsal, EsalResult } from './esal';

export type Confidence = 'HIGH' | 'MODERATE' | 'LOW';

export interface Provenanced<T> {
  value: T;
  dataStatus: DataStatus | 'WIM_NOT_AVAILABLE';
  source: string;
  confidence: Confidence;
  note: string;
}

// ------------------------------------------------------------------ WIM
export interface WimObservation {
  stationId: string;
  observedAt: string;
  axleLoadsTon: number[];
  source: string;
}

export interface WimProvider {
  readonly status: 'OBSERVED' | 'NOT_AVAILABLE';
  observationsFor(segmentId: string): WimObservation[];
}

/** No official WIM feed exists for the pilot corridor (spec §6.3: DATA REQUIRED). */
export const NO_WIM_PROVIDER: WimProvider = {
  status: 'NOT_AVAILABLE',
  observationsFor: () => []
};

// ------------------------------------------------------------------ traffic → load
export interface TrafficLoadEstimate {
  dailyVehicles: Provenanced<number>;
  heavyVehicleShare: Provenanced<number>;
  /** Heavy vehicles per day: central estimate and range. */
  heavyVehiclesPerDay: { central: number; low: number; high: number; dataStatus: DataStatus };
  /** Assumed axle-load spectrum when no WIM is available (illustrative). */
  axleSpectrum: Array<{ axleLoadTon: number; share: number }>;
  dailyEsal: { central: number; low: number; high: number; detail: EsalResult };
  wim: { status: 'OBSERVED' | 'WIM_NOT_AVAILABLE'; observations: number; message: string };
  explanation: string;
}

/**
 * Illustrative single-axle spectrum for heavy vehicles on a logistics corridor, used
 * only when no WIM data exists. Shares sum to 1. Not calibrated for Karawang.
 */
export const ILLUSTRATIVE_AXLE_SPECTRUM: Array<{ axleLoadTon: number; share: number }> = [
  { axleLoadTon: 6, share: 0.35 },
  { axleLoadTon: 8.16, share: 0.3 },
  { axleLoadTon: 10, share: 0.2 },
  { axleLoadTon: 13, share: 0.1 },
  { axleLoadTon: 18, share: 0.05 }
];

/** Heavy vehicles are assumed to have 3 axles on average for the ESAL estimate (illustrative). */
const AXLES_PER_HEAVY_VEHICLE = 3;

export function estimateTrafficLoad(segment: RoadSegment, wim: WimProvider = NO_WIM_PROVIDER): TrafficLoadEstimate {
  const attributeStatus: DataStatus = segment.attributeStatus === 'OBSERVED' ? 'OBSERVED' : 'SYNTHETIC';
  const daily = Math.max(0, segment.dailyTrafficVolumeLhr || 0);
  const share = Math.min(1, Math.max(0, (segment.heavyVehiclePercent || 0) / 100));
  const central = daily * share;
  // Without counts or WIM the volume estimate is wide: ±35 %.
  const observations = wim.observationsFor(segment.id);
  const spread = observations.length > 0 ? 0.15 : 0.35;

  let spectrum = ILLUSTRATIVE_AXLE_SPECTRUM;
  if (observations.length > 0) {
    const loads = observations.flatMap((o) => o.axleLoadsTon).filter((x) => Number.isFinite(x) && x >= 0);
    const bins = [6, 8.16, 10, 13, 18];
    const counts = bins.map((b, i) => loads.filter((l) => l <= b && (i === 0 || l > bins[i - 1])).length);
    const over = loads.filter((l) => l > 18).length;
    counts[counts.length - 1] += over;
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    spectrum = bins.map((b, i) => ({ axleLoadTon: b, share: counts[i] / total }));
  }

  const esalFor = (vehicles: number) =>
    computeEsal(spectrum.map((s) => ({ axleLoadTon: s.axleLoadTon, passes: vehicles * AXLES_PER_HEAVY_VEHICLE * s.share })));
  const detail = esalFor(central);

  return {
    dailyVehicles: { value: daily, dataStatus: attributeStatus, source: 'Segment attribute (demo dataset)', confidence: 'LOW', note: 'No public traffic count connected.' },
    heavyVehicleShare: { value: share, dataStatus: attributeStatus, source: 'Segment attribute (demo dataset)', confidence: 'LOW', note: 'Congestion is not treated as truck weight (spec §9.1).' },
    heavyVehiclesPerDay: { central, low: central * (1 - spread), high: central * (1 + spread), dataStatus: 'INFERRED' },
    axleSpectrum: spectrum,
    dailyEsal: { central: detail.esal, low: esalFor(central * (1 - spread)).esal, high: esalFor(central * (1 + spread)).esal, detail },
    wim:
      observations.length > 0
        ? { status: 'OBSERVED', observations: observations.length, message: `${observations.length} WIM observations used for the axle spectrum.` }
        : { status: 'WIM_NOT_AVAILABLE', observations: 0, message: 'WIM data not available for this segment; axle loads are estimated from an illustrative spectrum.' },
    explanation:
      observations.length > 0
        ? 'Heavy-vehicle volume from segment traffic; axle spectrum from observed WIM.'
        : 'Heavy-vehicle volume inferred from segment traffic and heavy-vehicle share; axle loads use an illustrative spectrum because no WIM data exists. Load values are estimates, not measurements.'
  };
}

// ------------------------------------------------------------------ weather
export interface WeatherObservation {
  observedAt: string;
  rainfallMmPerHr: number;
  rainfallAccumulation24hMm: number;
  temperatureC: number;
  wetSurface: boolean;
}

export interface WeatherProvider {
  readonly status: 'LIVE' | 'DEMO' | 'UNAVAILABLE';
  readonly source: string;
  latestFor(segment: RoadSegment, now: string): WeatherObservation | null;
}

/** Deterministic demo weather (no API key configured); labelled DEMO everywhere it appears. */
export const DEMO_WEATHER_PROVIDER: WeatherProvider = {
  status: 'DEMO',
  source: 'Deterministic demo values (no weather API configured)',
  latestFor(segment, now) {
    // Small deterministic variation per segment id so segments differ, without randomness.
    const h = [...segment.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
    return {
      observedAt: now,
      rainfallMmPerHr: 10 + (h % 40),
      rainfallAccumulation24hMm: 30 + (h % 90),
      temperatureC: 29 + (h % 6),
      wetSurface: h % 3 !== 0
    };
  }
};

export function weatherEvidence(segment: RoadSegment, now: string, provider: WeatherProvider = DEMO_WEATHER_PROVIDER): Provenanced<WeatherObservation | null> {
  const obs = provider.status === 'UNAVAILABLE' ? null : provider.latestFor(segment, now);
  return {
    value: obs,
    dataStatus: provider.status === 'LIVE' ? 'PUBLIC' : provider.status === 'DEMO' ? 'DEMO' : 'MODEL_UNAVAILABLE',
    source: provider.source,
    confidence: provider.status === 'LIVE' ? 'MODERATE' : 'LOW',
    note: obs ? 'Weather is context, not a direct cause of structural damage (spec §12).' : 'Weather source unavailable.'
  };
}

// ------------------------------------------------------------------ pavement baseline
export interface PavementBaseline {
  surface: string;
  surfaceThicknessCm: number;
  baseThicknessCm: number | null;
  subbaseThicknessCm: number | null;
  subgradeCbrRange: [number, number];
  asphaltModulusRangeMpa: [number, number];
}

export function pavementBaseline(segment: RoadSegment): Provenanced<PavementBaseline> {
  const cbr = segment.defaultCbrPercent || 5;
  return {
    value: {
      surface: 'AC-WC (assumed)',
      surfaceThicknessCm: segment.defaultAsphaltThicknessCm,
      baseThicknessCm: 20,
      subbaseThicknessCm: 25,
      subgradeCbrRange: [Math.max(1, cbr - 1.5), cbr + 1.5],
      asphaltModulusRangeMpa: [1800, 3200]
    },
    dataStatus: 'SYNTHETIC',
    source: 'REFERENCE BASELINE — typical national-road structure (spec §13.1 example), not a Karawang survey',
    confidence: 'LOW',
    note: 'No field measurement (FWD, cores, DCP) is connected for this segment.'
  };
}
