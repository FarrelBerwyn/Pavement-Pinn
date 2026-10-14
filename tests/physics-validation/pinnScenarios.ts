/**
 * Deterministic scenario harness for the PINN engine regression suite.
 *
 * The engine has exactly two sources of non-determinism:
 *   1. `Math.random()`  — simulated OpenVINO telemetry jitter (latency + loss values)
 *   2. wall clock       — `id` (`SIM-${Date.now()}`) and `timestamp`
 *
 * (1) is neutralised by seeding `Math.random` per scenario, (2) by excluding the two
 * wall-clock fields from the snapshot. Everything else is a pure function of
 * (params, roadSegment) and is compared exactly.
 */
import type { RoadSegment, SimulationParams, SimulationResult, HardwareDevice, PrecisionMode } from '../../src/types';

export type PinnRunner = (params: SimulationParams, roadSegment: RoadSegment) => SimulationResult;

export interface PinnScenario {
  name: string;
  group: 'segment-defaults' | 'sweep' | 'runtime-matrix' | 'invalid-extreme';
  segmentId: string;
  params: SimulationParams;
}

/** Snapshot = SimulationResult minus wall-clock fields and minus the echoed inputs. */
export type PinnSnapshot = Omit<SimulationResult, 'id' | 'timestamp' | 'params' | 'roadSegment'>;

/** Parameters App.tsx used for the initial on-load simulation (baseline commit fffa344). */
export function defaultParamsFor(segment: RoadSegment): SimulationParams {
  return {
    segmentId: segment.id,
    axleLoadTon: segment.defaultAxleLoadTon,
    rainIntensityMmHr: 45,
    floodDurationHours: 6,
    surfaceTemperatureC: 42,
    subgradeCbrPercent: segment.defaultCbrPercent,
    asphaltThicknessCm: segment.defaultAsphaltThicknessCm,
    asphaltModulusMpa: 2400,
    targetDevice: 'NPU',
    precisionMode: 'INT8_NNCF'
  };
}

const DEVICES: HardwareDevice[] = ['CPU', 'iGPU', 'NPU', 'AUTO', 'MULTI'];
const PRECISIONS: PrecisionMode[] = ['FP32', 'FP16', 'INT8_NNCF'];

export function buildScenarios(segments: RoadSegment[]): PinnScenario[] {
  const scenarios: PinnScenario[] = [];
  const base = segments[0];
  const baseParams = defaultParamsFor(base);

  // 1. Every reference segment with the application's default parameters.
  for (const segment of segments) {
    scenarios.push({
      name: `defaults/${segment.id}`,
      group: 'segment-defaults',
      segmentId: segment.id,
      params: defaultParamsFor(segment)
    });
  }

  // 2. One-at-a-time sweeps across the documented input ranges, including the
  //    rule-engine thresholds (axle 14 / 18 / 20 t, rain 25 / 50 mm/h).
  const sweeps: Array<[keyof SimulationParams, number[]]> = [
    ['axleLoadTon', [10, 12.5, 14, 14.1, 18, 18.1, 20, 20.1, 25]],
    ['rainIntensityMmHr', [0, 25, 26, 50, 51, 100]],
    ['floodDurationHours', [0, 24, 48]],
    ['surfaceTemperatureC', [25, 42, 60, 70]],
    ['subgradeCbrPercent', [3, 6, 10]],
    ['asphaltThicknessCm', [5, 12, 25]],
    ['asphaltModulusMpa', [1200, 2400, 3500]]
  ];
  for (const [key, values] of sweeps) {
    for (const value of values) {
      scenarios.push({
        name: `sweep/${key}=${value}`,
        group: 'sweep',
        segmentId: base.id,
        params: { ...baseParams, [key]: value }
      });
    }
  }

  // 3. Simulated runtime matrix (device x precision) — telemetry branch coverage.
  for (const targetDevice of DEVICES) {
    for (const precisionMode of PRECISIONS) {
      scenarios.push({
        name: `runtime/${targetDevice}/${precisionMode}`,
        group: 'runtime-matrix',
        segmentId: base.id,
        params: { ...baseParams, targetDevice, precisionMode }
      });
    }
  }

  // 4. Invalid and extreme inputs. The engine performs NO input validation; these
  //    scenarios pin its current (non-throwing, possibly non-finite) behaviour.
  const invalid: Array<[string, Partial<SimulationParams>]> = [
    ['axle=0', { axleLoadTon: 0 }],
    ['axle=-5', { axleLoadTon: -5 }],
    ['axle=1000', { axleLoadTon: 1000 }],
    ['axle=NaN', { axleLoadTon: Number.NaN }],
    ['axle=Infinity', { axleLoadTon: Number.POSITIVE_INFINITY }],
    ['thickness=0', { asphaltThicknessCm: 0 }],
    ['thickness=-15', { asphaltThicknessCm: -15 }],
    ['cbr=0', { subgradeCbrPercent: 0 }],
    ['cbr=-3', { subgradeCbrPercent: -3 }],
    ['modulus=0', { asphaltModulusMpa: 0 }],
    ['rain=1000', { rainIntensityMmHr: 1000 }],
    ['rain=-10', { rainIntensityMmHr: -10 }],
    ['flood=1000', { floodDurationHours: 1000 }],
    ['temp=-50', { surfaceTemperatureC: -50 }],
    ['temp=500', { surfaceTemperatureC: 500 }]
  ];
  for (const [label, override] of invalid) {
    scenarios.push({
      name: `invalid/${label}`,
      group: 'invalid-extreme',
      segmentId: base.id,
      params: { ...baseParams, ...override }
    });
  }

  return scenarios;
}

/** mulberry32 — small deterministic PRNG, seeded per scenario index. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runScenario(
  run: PinnRunner,
  scenario: PinnScenario,
  index: number,
  segments: RoadSegment[]
): { result: SimulationResult; snapshot: PinnSnapshot; segment: RoadSegment } {
  const segment = segments.find((s) => s.id === scenario.segmentId);
  if (!segment) throw new Error(`Unknown segment in scenario: ${scenario.segmentId}`);

  const originalRandom = Math.random;
  Math.random = seededRandom(1000 + index);
  try {
    const result = run(scenario.params, segment);
    const { id: _id, timestamp: _timestamp, params: _params, roadSegment: _roadSegment, ...snapshot } = result;
    return { result, snapshot, segment };
  } finally {
    Math.random = originalRandom;
  }
}

/**
 * JSON cannot represent NaN / ±Infinity / -0. Encode them as tagged strings so
 * non-finite engine outputs are pinned rather than silently collapsing to `null`.
 */
export function encodeSnapshot(value: unknown): unknown {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '#NaN';
    if (value === Number.POSITIVE_INFINITY) return '#Infinity';
    if (value === Number.NEGATIVE_INFINITY) return '#-Infinity';
    if (Object.is(value, -0)) return '#-0';
    return value;
  }
  if (Array.isArray(value)) return value.map(encodeSnapshot);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, encodeSnapshot(v)])
    );
  }
  return value;
}

/** Collect every numeric leaf with its path — used for finiteness assertions. */
export function numericLeaves(value: unknown, path = ''): Array<[string, number]> {
  if (typeof value === 'number') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => numericLeaves(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      numericLeaves(v, path ? `${path}.${k}` : k)
    );
  }
  return [];
}
