/**
 * Prints the tensile-strain reachability analysis used in
 * docs/validation/PINN_REGRESSION_REPORT.md.
 *
 *   npx tsx scripts/analyze-pinn-thresholds.ts
 *
 * Read-only: runs the engine over input grids, changes nothing.
 */
import { INDONESIAN_ROAD_SEGMENTS } from '../src/data/reference/indonesianRoads';
import { runPinnSimulation } from '../src/engines/pinn/core/pinnEngine';
import { defaultParamsFor } from '../tests/physics-validation/pinnScenarios';
import { DOCUMENTED_GRID, SIMULATOR_GRID, scanTensileStrain, TENSILE_THRESHOLDS } from '../tests/physics-validation/thresholdAnalysis';

const segment = INDONESIAN_ROAD_SEGMENTS[0];
const datasetDefaults = INDONESIAN_ROAD_SEGMENTS.map((s) => ({
  id: s.id,
  thicknessCm: s.defaultAsphaltThicknessCm,
  axleTon: s.defaultAxleLoadTon,
  tensileStrain: runPinnSimulation(defaultParamsFor(s), s).tensors.tensileStrainEt
}));

console.log(
  JSON.stringify(
    {
      thresholds: TENSILE_THRESHOLDS,
      simulatorReachable: scanTensileStrain(runPinnSimulation, segment, SIMULATOR_GRID),
      documentedRanges: scanTensileStrain(runPinnSimulation, segment, DOCUMENTED_GRID),
      datasetDefaults: {
        min: Math.min(...datasetDefaults.map((d) => d.tensileStrain)),
        max: Math.max(...datasetDefaults.map((d) => d.tensileStrain)),
        thicknessRangeCm: [Math.min(...datasetDefaults.map((d) => d.thicknessCm)), Math.max(...datasetDefaults.map((d) => d.thicknessCm))]
      },
      legalAxle10tAtSimulatorDefaults: [5, 8, 10, 12, 15, 18, 25].map((h) => ({
        thicknessCm: h,
        tensileStrain: runPinnSimulation({ ...defaultParamsFor(segment), axleLoadTon: 10, asphaltThicknessCm: h }, segment).tensors.tensileStrainEt
      }))
    },
    null,
    1
  )
);
