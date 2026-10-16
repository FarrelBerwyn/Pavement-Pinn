/**
 * CHARACTERIZATION tests — they pin what the engine does today so that the finding in
 * docs/validation/PINN_REGRESSION_REPORT.md ("strain thresholds are almost unreachable")
 * stays reproducible. They are not statements about what the physics should be.
 *
 * If the model is recalibrated on purpose, these numbers are expected to change and the
 * tests must be updated together with the report.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runPinnSimulation } from '../../src/engines/pinn/core/pinnEngine';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';
import { defaultParamsFor } from './pinnScenarios';
import { DOCUMENTED_GRID, SIMULATOR_GRID, scanTensileStrain, TENSILE_THRESHOLDS } from './thresholdAnalysis';

const segment = INDONESIAN_ROAD_SEGMENTS[0];

test('thresholds in the source: engine notes at 180 and 250, display limit at 200', () => {
  assert.deepEqual(TENSILE_THRESHOLDS, { engineWatch: 180, displayLimit: 200, engineCritical: 250 });
  const note = (strainTarget: { axleLoadTon: number; asphaltThicknessCm: number; asphaltModulusMpa: number; surfaceTemperatureC: number }) =>
    runPinnSimulation({ ...defaultParamsFor(segment), ...strainTarget }, segment);
  // 274 microstrain: the single most severe corner of the documented ranges
  const critical = note({ axleLoadTon: 25, asphaltThicknessCm: 5, asphaltModulusMpa: 1200, surfaceTemperatureC: 60 });
  assert.equal(critical.tensors.tensileStrainEt, 274);
  assert.match(critical.roleOutputs.fieldEngineer.engineeringNotes, /RULE_BASED\) termasuk tinggi/); // was "KRITIS ... melebihi batas ijin" (F-06)
  // 183 microstrain: the most severe input the simulation panel can produce
  const watch = note({ axleLoadTon: 25, asphaltThicknessCm: 5, asphaltModulusMpa: 2400, surfaceTemperatureC: 42 });
  assert.equal(watch.tensors.tensileStrainEt, 183);
  assert.match(watch.roleOutputs.fieldEngineer.engineeringNotes, /RULE_BASED\) menengah/); // was "WASPADA" (F-06)
});

test('tensile strain depends only on axle load, thickness, modulus and temperature', () => {
  const base = runPinnSimulation(defaultParamsFor(segment), segment).tensors.tensileStrainEt;
  for (const override of [{ rainIntensityMmHr: 0 }, { rainIntensityMmHr: 100 }, { floodDurationHours: 48 }, { subgradeCbrPercent: 3 }, { subgradeCbrPercent: 10 }]) {
    assert.equal(runPinnSimulation({ ...defaultParamsFor(segment), ...override }, segment).tensors.tensileStrainEt, base);
  }
});

test('simulation panel inputs: the watch note is reachable at exactly one setting, the 200 and 250 levels never', () => {
  const scan = scanTensileStrain(runPinnSimulation, segment, SIMULATOR_GRID);
  assert.equal(scan.points, 735);
  assert.equal(scan.max.strain, 183);
  assert.deepEqual(scan.max.params, { axleLoadTon: 25, asphaltThicknessCm: 5, asphaltModulusMpa: 2400, surfaceTemperatureC: 42 });
  assert.deepEqual(scan.above, { engineWatch: 1, displayLimit: 0, engineCritical: 0 });
});

test('documented API ranges: thresholds are reachable only for asphalt of 6 cm or thinner', () => {
  const scan = scanTensileStrain(runPinnSimulation, segment, DOCUMENTED_GRID);
  assert.equal(scan.points, 124992);
  assert.equal(scan.max.strain, 274);
  assert.deepEqual(scan.above, { engineWatch: 819, displayLimit: 364, engineCritical: 15 });
  assert.deepEqual(scan.thickestExceeding, { engineWatch: 6, displayLimit: 5, engineCritical: 5 });
});

test('reference road segments (8 to 18 cm asphalt) produce 10 to 59 microstrain at their defaults', () => {
  const strains = INDONESIAN_ROAD_SEGMENTS.map((s) => runPinnSimulation(defaultParamsFor(s), s).tensors.tensileStrainEt);
  assert.equal(Math.min(...strains), 10);
  assert.equal(Math.max(...strains), 59);
  assert.ok(strains.every((strain) => strain < TENSILE_THRESHOLDS.engineWatch));
});
