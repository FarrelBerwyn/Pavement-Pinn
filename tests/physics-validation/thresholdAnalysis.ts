/**
 * Reachability analysis for the engine's tensile-strain thresholds.
 *
 * Question it answers: for which inputs can `tensileStrainEt` reach the values the code
 * treats as significant (180 "watch", 200 "exceeds limit" in the UI and PDF, 250 "critical")?
 *
 * It only RUNS the engine over input grids; it does not change or reinterpret any formula.
 */
import type { RoadSegment, SimulationParams } from '../../src/types';
import type { PinnRunner } from './pinnScenarios';
import { defaultParamsFor } from './pinnScenarios';

/** Thresholds as they appear in the source today (see PINN_REGRESSION_REPORT.md). */
export const TENSILE_THRESHOLDS = {
  /** pinnEngine.ts: "WASPADA" engineering note */
  engineWatch: 180,
  /** SimulationPanel.tsx and pdfGenerator.ts: "exceeds the permitted limit" */
  displayLimit: 200,
  /** pinnEngine.ts: "KRITIS" engineering note */
  engineCritical: 250
} as const;

export interface InputGrid {
  axleLoadTon: number[];
  asphaltThicknessCm: number[];
  asphaltModulusMpa: number[];
  surfaceTemperatureC: number[];
}

export const range = (from: number, to: number, step: number): number[] => {
  const values: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) values.push(Number(v.toFixed(6)));
  return values;
};

/**
 * What a user can actually set in the simulation panel: sliders for axle load (8 to 25 t)
 * and asphalt thickness (5 to 25 cm). Surface temperature (42 C) and asphalt modulus
 * (2400 MPa) are fixed in the panel and have no control.
 */
export const SIMULATOR_GRID: InputGrid = {
  axleLoadTon: range(8, 25, 0.5),
  asphaltThicknessCm: range(5, 25, 1),
  asphaltModulusMpa: [2400],
  surfaceTemperatureC: [42]
};

/** The ranges written as comments on SimulationParams (reachable through the API only). */
export const DOCUMENTED_GRID: InputGrid = {
  axleLoadTon: range(10, 25, 0.5),
  asphaltThicknessCm: range(5, 25, 1),
  asphaltModulusMpa: range(1200, 3500, 100),
  surfaceTemperatureC: range(25, 60, 5)
};

export interface ThresholdScan {
  points: number;
  max: { strain: number; params: Pick<SimulationParams, 'axleLoadTon' | 'asphaltThicknessCm' | 'asphaltModulusMpa' | 'surfaceTemperatureC'> };
  min: number;
  above: Record<keyof typeof TENSILE_THRESHOLDS, number>;
  /** Thickest asphalt (cm) at which each threshold is still exceeded anywhere in the grid; null if never. */
  thickestExceeding: Record<keyof typeof TENSILE_THRESHOLDS, number | null>;
}

export function scanTensileStrain(run: PinnRunner, segment: RoadSegment, grid: InputGrid): ThresholdScan {
  const base = defaultParamsFor(segment);
  const above = { engineWatch: 0, displayLimit: 0, engineCritical: 0 };
  const thickestExceeding: ThresholdScan['thickestExceeding'] = { engineWatch: null, displayLimit: null, engineCritical: null };
  let points = 0;
  let min = Number.POSITIVE_INFINITY;
  let max: ThresholdScan['max'] = { strain: Number.NEGATIVE_INFINITY, params: { axleLoadTon: 0, asphaltThicknessCm: 0, asphaltModulusMpa: 0, surfaceTemperatureC: 0 } };

  for (const axleLoadTon of grid.axleLoadTon) {
    for (const asphaltThicknessCm of grid.asphaltThicknessCm) {
      for (const asphaltModulusMpa of grid.asphaltModulusMpa) {
        for (const surfaceTemperatureC of grid.surfaceTemperatureC) {
          const strain = run({ ...base, axleLoadTon, asphaltThicknessCm, asphaltModulusMpa, surfaceTemperatureC }, segment).tensors.tensileStrainEt;
          points++;
          min = Math.min(min, strain);
          if (strain > max.strain) max = { strain, params: { axleLoadTon, asphaltThicknessCm, asphaltModulusMpa, surfaceTemperatureC } };
          for (const key of Object.keys(TENSILE_THRESHOLDS) as Array<keyof typeof TENSILE_THRESHOLDS>) {
            if (strain > TENSILE_THRESHOLDS[key]) {
              above[key]++;
              thickestExceeding[key] = Math.max(thickestExceeding[key] ?? 0, asphaltThicknessCm);
            }
          }
        }
      }
    }
  }
  return { points, max, min, above, thickestExceeding };
}
