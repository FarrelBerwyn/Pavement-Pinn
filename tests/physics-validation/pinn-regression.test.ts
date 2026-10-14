/**
 * PINN engine numerical regression suite.
 *
 * The golden file was captured from the pre-restructure engine
 * (src/utils/pinnEngine.ts @ fffa344) BEFORE any file was moved. The restructure is a
 * pure relocation, so the tolerance is exact equality (0): any numeric drift is a bug.
 *
 * Passing this suite proves the refactor preserved behaviour. It does NOT prove the
 * model is scientifically accurate — there is no ground-truth dataset in the repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runPinnSimulation } from '../../src/engines/pinn/core/pinnEngine';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';
import type { SimulationParams } from '../../src/types';
import { buildScenarios, runScenario, encodeSnapshot, numericLeaves, defaultParamsFor } from './pinnScenarios';

interface GoldenFile {
  scenarioCount: number;
  scenarios: Array<{ name: string; group: string; segmentId: string; params: unknown; snapshot: unknown }>;
}

const golden: GoldenFile = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests', 'physics-validation', 'fixtures', 'pinn-golden.json'), 'utf8')
);
const scenarios = buildScenarios(INDONESIAN_ROAD_SEGMENTS);
const baseSegment = INDONESIAN_ROAD_SEGMENTS[0];
const run = (override: Partial<SimulationParams>) =>
  runPinnSimulation({ ...defaultParamsFor(baseSegment), ...override }, baseSegment);

test('scenario set matches the golden file one-to-one', () => {
  assert.equal(scenarios.length, golden.scenarioCount);
  assert.deepEqual(
    scenarios.map((s) => s.name),
    golden.scenarios.map((s) => s.name)
  );
});

test('every scenario reproduces the pre-restructure output exactly (tolerance = 0)', () => {
  const mismatches: string[] = [];
  scenarios.forEach((scenario, index) => {
    const { snapshot } = runScenario(runPinnSimulation, scenario, index, INDONESIAN_ROAD_SEGMENTS);
    const expected = golden.scenarios[index];
    try {
      assert.deepEqual(encodeSnapshot(scenario.params), expected.params);
      assert.deepEqual(encodeSnapshot(snapshot), expected.snapshot);
    } catch {
      mismatches.push(scenario.name);
    }
  });
  assert.deepEqual(mismatches, [], `scenarios drifted from golden: ${mismatches.join(', ')}`);
});

test('result echoes its inputs by reference and carries wall-clock id/timestamp', () => {
  const scenario = scenarios[0];
  const { result, segment } = runScenario(runPinnSimulation, scenario, 0, INDONESIAN_ROAD_SEGMENTS);
  assert.equal(result.params, scenario.params);
  assert.equal(result.roadSegment, segment);
  assert.match(result.id, /^SIM-\d+$/);
  assert.equal(typeof result.timestamp, 'string');
});

test('engine does not mutate its inputs', () => {
  const freeze = <T>(value: T): T => {
    if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const segment = freeze(structuredClone(baseSegment));
  const params = freeze(defaultParamsFor(segment));
  assert.doesNotThrow(() => runPinnSimulation(params, segment));
});

test('all outputs are finite across the documented input ranges', () => {
  scenarios.forEach((scenario, index) => {
    if (scenario.group === 'invalid-extreme') return;
    const { snapshot } = runScenario(runPinnSimulation, scenario, index, INDONESIAN_ROAD_SEGMENTS);
    const bad = numericLeaves(snapshot).filter(([, v]) => !Number.isFinite(v));
    assert.deepEqual(bad, [], `${scenario.name} produced non-finite values`);
  });
});

test('invalid inputs never throw (engine has no validation — behaviour pinned by golden)', () => {
  scenarios.forEach((scenario, index) => {
    if (scenario.group !== 'invalid-extreme') return;
    assert.doesNotThrow(() => runScenario(runPinnSimulation, scenario, index, INDONESIAN_ROAD_SEGMENTS), scenario.name);
  });
});

test('Fourth Power Law: load factor (axle / 10 t)^4 drives the Zero-ODOL impact', () => {
  // impact = min(95, round((1 - 1/factor) * 100))
  assert.equal(run({ axleLoadTon: 10 }).roleOutputs.policyMaker.zeroOdolTargetImpactPercent, 0); // factor 1
  assert.equal(run({ axleLoadTon: 20 }).roleOutputs.policyMaker.zeroOdolTargetImpactPercent, 94); // factor 16
  assert.equal(run({ axleLoadTon: 25 }).roleOutputs.policyMaker.zeroOdolTargetImpactPercent, 95); // capped
});

test('stress scales linearly with axle load (0.65 / 0.12 MPa per 10 t)', () => {
  const r = run({ axleLoadTon: 20 });
  assert.equal(r.tensors.stressTopMpa, 1.3);
  assert.equal(r.tensors.stressBottomMpa, 0.24);
});

test('deflection basin: 7 offsets, max at the load centre, monotonically decaying', () => {
  const r = run({});
  const basin = r.roleOutputs.fieldEngineer.deflectionBasin;
  assert.deepEqual(basin.map((p) => p.distanceMm), [0, 200, 400, 600, 900, 1200, 1500]);
  assert.equal(basin[0].deflectionMicron, r.tensors.surfaceDeflectionMaxMicron);
  for (let i = 1; i < basin.length; i++) {
    assert.ok(basin[i].deflectionMicron <= basin[i - 1].deflectionMicron, `basin not decaying at ${i}`);
  }
});

test('monotonicity: heavier axle => larger strains and deflection; thicker asphalt => smaller tensile strain', () => {
  const light = run({ axleLoadTon: 10 });
  const heavy = run({ axleLoadTon: 25 });
  assert.ok(heavy.tensors.tensileStrainEt > light.tensors.tensileStrainEt);
  assert.ok(heavy.tensors.compressiveStrainEv > light.tensors.compressiveStrainEv);
  assert.ok(heavy.tensors.surfaceDeflectionMaxMicron > light.tensors.surfaceDeflectionMaxMicron);
  assert.ok(run({ asphaltThicknessCm: 25 }).tensors.tensileStrainEt < run({ asphaltThicknessCm: 5 }).tensors.tensileStrainEt);
});

test('rule-engine thresholds: alert status, WIM action and speed restriction', () => {
  const ops = (o: Partial<SimulationParams>) => {
    // A healthy segment isolates the load / rain rules from the PCI rule.
    const healthy = { ...baseSegment, currentPci: 95 };
    return runPinnSimulation({ ...defaultParamsFor(healthy), rainIntensityMmHr: 0, floodDurationHours: 0, ...o }, healthy)
      .roleOutputs.operationsManager;
  };
  assert.equal(ops({ axleLoadTon: 10 }).alertStatus, 'GREEN');
  assert.equal(ops({ axleLoadTon: 10 }).wimActionRequired, 'ALLOW');
  assert.equal(ops({ axleLoadTon: 10 }).speedRestrictionKmh, 70);
  assert.equal(ops({ axleLoadTon: 14 }).alertStatus, 'GREEN'); // boundary is strict (> 14)
  assert.equal(ops({ axleLoadTon: 14.1 }).alertStatus, 'YELLOW');
  assert.equal(ops({ axleLoadTon: 14.1 }).wimActionRequired, 'INSPECT_AND_WEIGH');
  assert.equal(ops({ axleLoadTon: 14.1 }).speedRestrictionKmh, 50);
  assert.equal(ops({ axleLoadTon: 10, rainIntensityMmHr: 26 }).alertStatus, 'YELLOW');
  assert.equal(ops({ axleLoadTon: 10, rainIntensityMmHr: 51 }).alertStatus, 'RED');
  assert.equal(ops({ axleLoadTon: 10, rainIntensityMmHr: 51 }).wimActionRequired, 'REROUTE_MANDATORY');
  assert.equal(ops({ axleLoadTon: 10, rainIntensityMmHr: 51 }).speedRestrictionKmh, 30);
});

test('dynamic tonnage limit is clamped to the 10 t legal minimum', () => {
  assert.equal(run({ rainIntensityMmHr: 0, floodDurationHours: 0 }).roleOutputs.operationsManager.maxAllowedDynamicTonnageTon, 18);
  assert.equal(run({ rainIntensityMmHr: 100, floodDurationHours: 48 }).roleOutputs.operationsManager.maxAllowedDynamicTonnageTon, 10);
});

test('PCI outputs: bounded prediction and a 6-point projection starting in 2026', () => {
  for (const segment of INDONESIAN_ROAD_SEGMENTS) {
    const r = runPinnSimulation(defaultParamsFor(segment), segment);
    assert.ok(r.predictedPci >= 10 && r.predictedPci <= 100, `${segment.id} PCI out of range`);
    assert.equal(r.pciDropPoints, Math.round(segment.currentPci - r.predictedPci));
    const projection = r.roleOutputs.policyMaker.pci5YearProjection;
    assert.deepEqual(projection.map((p) => p.year), [2026, 2027, 2028, 2029, 2030, 2031]);
    projection.forEach((p) => {
      assert.ok(p.pciNoAction >= 10);
      assert.ok(p.pciPreventiveAction <= 95);
    });
  }
});

test('telemetry is a simulated lookup: echoes the requested device/precision, latency stays in its jitter band', () => {
  const r = run({ targetDevice: 'CPU', precisionMode: 'FP32' });
  assert.equal(r.telemetry.deviceUsed, 'CPU');
  assert.equal(r.telemetry.precisionUsed, 'FP32');
  // 24.5 ms base * 1.4 precision multiplier, +/- 0.4 ms uniform jitter
  assert.ok(Math.abs(r.telemetry.inferenceLatencyMs - 34.3) <= 0.45);
  assert.equal(r.telemetry.throughputSps, Math.round(1000 / r.telemetry.inferenceLatencyMs));
});
