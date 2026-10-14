/**
 * Mathematical audit of the pavement engine.
 *
 * WHAT THESE TESTS ARE: software-consistency and characterization checks. They prove
 * that the code computes exactly the documented formulas, and they pin structural
 * properties of those formulas (some expected of any linear-elastic model, some known
 * deviations from one).
 *
 * WHAT THEY ARE NOT: evidence of physical accuracy. No test here compares the engine
 * with a measurement or with an independent layered-elastic solver, because neither
 * exists in the repository. See docs/validation/PINN_VALIDATION_GAP.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runPinnSimulation } from '../../src/engines/pinn/core/pinnEngine';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';
import type { RoadSegment, SimulationParams } from '../../src/types';
import { defaultParamsFor } from './pinnScenarios';

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

/** A segment whose values make hand calculation easy. */
const SEGMENT: RoadSegment = { ...INDONESIAN_ROAD_SEGMENTS[0], currentPci: 80, lengthKm: 20 };
/** The normalisation point of the formulas: every ratio inside them equals 1. */
const UNIT: SimulationParams = {
  ...defaultParamsFor(SEGMENT),
  axleLoadTon: 10,
  rainIntensityMmHr: 0,
  floodDurationHours: 0,
  surfaceTemperatureC: 25,
  subgradeCbrPercent: 4,
  asphaltThicknessCm: 10,
  asphaltModulusMpa: 2000
};
const run = (override: Partial<SimulationParams> = {}, segment: RoadSegment = SEGMENT) =>
  runPinnSimulation({ ...UNIT, ...override }, segment);

/**
 * The equations exactly as written in PINN_REGRESSION_REPORT.md, re-implemented here
 * independently of the engine source so that the report and the code cannot drift apart.
 */
function documented(p: SimulationParams, segment: RoadSegment) {
  const waterDecay = Math.max(0.4, 1.0 - p.rainIntensityMmHr * 0.004 - p.floodDurationHours * 0.015);
  const subgradeModulus = 10 * (p.subgradeCbrPercent * waterDecay);
  const asphaltModulus = p.asphaltModulusMpa * Math.max(0.5, 1.0 - (p.surfaceTemperatureC - 25) * 0.012);
  const loadFactor = Math.pow(p.axleLoadTon / 10.0, 4.0);
  const tensile = Math.round((p.axleLoadTon * 120.0) / (Math.pow(p.asphaltThicknessCm, 1.75) * Math.pow(asphaltModulus / 2000, 0.4)));
  const compressive = Math.round((p.axleLoadTon * 210.0) / (Math.pow(p.asphaltThicknessCm + 15, 1.4) * Math.pow(subgradeModulus / 40, 0.75)));
  const deflection = Math.round((p.axleLoadTon * 45.0) / (Math.pow(subgradeModulus / 40, 0.6) * Math.pow(p.asphaltThicknessCm / 10, 0.5)));
  const annualDrop = Math.min(35, Number((2.5 * loadFactor * (1.0 / waterDecay)).toFixed(1)));
  const predictedPci = Math.max(10, Math.round(segment.currentPci - annualDrop * 0.8));
  return {
    tensile,
    compressive,
    deflection,
    stressTop: Number((0.65 * (p.axleLoadTon / 10.0)).toFixed(2)),
    stressBottom: Number((0.12 * (p.axleLoadTon / 10.0)).toFixed(2)),
    basin: [0, 200, 400, 600, 900, 1200, 1500].map((r) => Math.round(deflection * Math.exp(-0.0018 * r))),
    predictedPci,
    life: Math.max(0.3, Number((predictedPci / (annualDrop * 1.2)).toFixed(1))),
    pothole: Math.max(3, Math.round(1800 / (loadFactor * (1 / waterDecay)))),
    overlay: predictedPci < 70 ? Number(Math.max(4.0, (75 - predictedPci) * 0.22).toFixed(1)) : 0,
    tonnage: Number(Math.max(10.0, 18.0 - p.rainIntensityMmHr * 0.08 - p.floodDurationHours * 0.2).toFixed(1)),
    zeroOdol: Math.min(95, Math.round((1 - 1 / loadFactor) * 100))
  };
}

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------
// 1. Code computes the documented formulas
// ---------------------------------------------------------------------------------------

test('worked example at the normalisation point (hand calculation)', () => {
  // P = 10 t, h = 10 cm, E1 = 2000 MPa at 25 C, CBR 4 (Es = 40 MPa), dry, PCI 80.
  // Every ratio in the formulas is 1, so: strain = 120 x 10 / 10^1.75 = 21.34, and so on.
  const r = run();
  assert.equal(r.tensors.tensileStrainEt, 21); // 1200 / 56.234
  assert.equal(r.tensors.compressiveStrainEv, 23); // 2100 / 25^1.4 = 2100 / 90.60
  assert.equal(r.tensors.surfaceDeflectionMaxMicron, 450); // 45 x 10
  assert.equal(r.tensors.stressTopMpa, 0.65);
  assert.equal(r.tensors.stressBottomMpa, 0.12);
  assert.deepEqual(
    r.roleOutputs.fieldEngineer.deflectionBasin.map((p) => p.deflectionMicron),
    [450, 314, 219, 153, 89, 52, 30] // 450 x exp(-0.0018 r)
  );
  assert.equal(r.predictedPci, 78); // 80 - 0.8 x 2.5
  assert.equal(r.pciDropPoints, 2);
  assert.equal(r.pavementLifeRemainingYears, 26); // 78 / (1.2 x 2.5)
  assert.equal(r.roleOutputs.fieldEngineer.potholeHorizonDays, 1800);
  assert.equal(r.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm, 0); // PCI is 70 or more
  assert.equal(r.roleOutputs.operationsManager.alertStatus, 'GREEN');
  assert.equal(r.roleOutputs.operationsManager.maxAllowedDynamicTonnageTon, 18);
  assert.equal(r.roleOutputs.policyMaker.zeroOdolTargetImpactPercent, 0);
});

test('documented equations reproduce the engine for 400 random in-range inputs (consistency, not accuracy)', () => {
  const next = seeded(20261014);
  const between = (lo: number, hi: number, step: number) => Number((lo + Math.round((next() * (hi - lo)) / step) * step).toFixed(4));
  for (let i = 0; i < 400; i++) {
    const segment = INDONESIAN_ROAD_SEGMENTS[i % INDONESIAN_ROAD_SEGMENTS.length];
    const params: SimulationParams = {
      ...defaultParamsFor(segment),
      axleLoadTon: between(10, 25, 0.5),
      rainIntensityMmHr: between(0, 100, 5),
      floodDurationHours: between(0, 48, 1),
      surfaceTemperatureC: between(25, 60, 1),
      subgradeCbrPercent: between(3, 10, 0.5),
      asphaltThicknessCm: between(5, 25, 1),
      asphaltModulusMpa: between(1200, 3500, 100)
    };
    const actual = runPinnSimulation(params, segment);
    const expected = documented(params, segment);
    assert.deepEqual(
      {
        tensile: actual.tensors.tensileStrainEt,
        compressive: actual.tensors.compressiveStrainEv,
        deflection: actual.tensors.surfaceDeflectionMaxMicron,
        stressTop: actual.tensors.stressTopMpa,
        stressBottom: actual.tensors.stressBottomMpa,
        basin: actual.roleOutputs.fieldEngineer.deflectionBasin.map((p) => p.deflectionMicron),
        predictedPci: actual.predictedPci,
        life: actual.pavementLifeRemainingYears,
        pothole: actual.roleOutputs.fieldEngineer.potholeHorizonDays,
        overlay: actual.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm,
        tonnage: actual.roleOutputs.operationsManager.maxAllowedDynamicTonnageTon,
        zeroOdol: actual.roleOutputs.policyMaker.zeroOdolTargetImpactPercent
      },
      expected,
      `sample ${i}: ${JSON.stringify(params)}`
    );
  }
});

test('output contract: integer microstrain and micron, bounded PCI, one-decimal engineering values', () => {
  const r = run({ axleLoadTon: 17.5, asphaltThicknessCm: 9, rainIntensityMmHr: 35, floodDurationHours: 7 });
  for (const value of [r.tensors.tensileStrainEt, r.tensors.compressiveStrainEv, r.tensors.surfaceDeflectionMaxMicron, r.predictedPci, r.pciDropPoints, r.roleOutputs.fieldEngineer.potholeHorizonDays]) {
    assert.ok(Number.isInteger(value), `${value} should be an integer`);
  }
  const oneDecimal = (v: number) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
  assert.ok(oneDecimal(r.pavementLifeRemainingYears));
  assert.ok(oneDecimal(r.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm));
  assert.ok(oneDecimal(r.roleOutputs.operationsManager.maxAllowedDynamicTonnageTon));
  assert.ok(['GREEN', 'YELLOW', 'RED'].includes(r.roleOutputs.operationsManager.alertStatus));
});

test('a missing input makes only the outputs that depend on it NaN; nothing throws', () => {
  const { asphaltThicknessCm: _omitted, ...withoutThickness } = UNIT;
  const r = runPinnSimulation(withoutThickness as SimulationParams, SEGMENT);
  assert.ok(Number.isNaN(r.tensors.tensileStrainEt));
  assert.ok(Number.isNaN(r.tensors.compressiveStrainEv));
  assert.ok(Number.isNaN(r.tensors.surfaceDeflectionMaxMicron));
  // PCI, remaining life and alerts never use the thickness, so they stay well-defined.
  assert.equal(r.predictedPci, 78);
  assert.equal(r.roleOutputs.operationsManager.alertStatus, 'GREEN');
});

// ---------------------------------------------------------------------------------------
// 2. Properties any linear-elastic pavement model has, which the formulas also have
// ---------------------------------------------------------------------------------------

test('response is linear in load: doubling the axle load doubles strains, deflection and stress', () => {
  const a = run({ axleLoadTon: 10, asphaltThicknessCm: 6 });
  const b = run({ axleLoadTon: 20, asphaltThicknessCm: 6 });
  const doubles = (x: number, y: number, tolerance: number) => assert.ok(Math.abs(y - 2 * x) <= tolerance, `${y} vs 2 x ${x}`);
  doubles(a.tensors.tensileStrainEt, b.tensors.tensileStrainEt, 1); // integer rounding
  doubles(a.tensors.compressiveStrainEv, b.tensors.compressiveStrainEv, 1);
  doubles(a.tensors.surfaceDeflectionMaxMicron, b.tensors.surfaceDeflectionMaxMicron, 1);
  assert.equal(b.tensors.stressTopMpa, 1.3);
  assert.equal(b.tensors.stressBottomMpa, 0.24);
});

test('monotonic where the formulas guarantee it: thicker or stiffer layers never increase the response', () => {
  let previous = Infinity;
  for (const h of [5, 8, 12, 18, 25]) {
    const strain = run({ axleLoadTon: 25, asphaltThicknessCm: h }).tensors.tensileStrainEt;
    assert.ok(strain <= previous);
    previous = strain;
  }
  assert.ok(run({ asphaltModulusMpa: 3500, axleLoadTon: 25, asphaltThicknessCm: 5 }).tensors.tensileStrainEt < run({ asphaltModulusMpa: 1200, axleLoadTon: 25, asphaltThicknessCm: 5 }).tensors.tensileStrainEt);
  assert.ok(run({ subgradeCbrPercent: 10 }).tensors.compressiveStrainEv < run({ subgradeCbrPercent: 3 }).tensors.compressiveStrainEv);
  assert.ok(run({ subgradeCbrPercent: 10 }).tensors.surfaceDeflectionMaxMicron < run({ subgradeCbrPercent: 3 }).tensors.surfaceDeflectionMaxMicron);
  // hotter asphalt and wetter subgrade are softer
  assert.ok(run({ surfaceTemperatureC: 60, axleLoadTon: 25, asphaltThicknessCm: 5 }).tensors.tensileStrainEt > run({ surfaceTemperatureC: 25, axleLoadTon: 25, asphaltThicknessCm: 5 }).tensors.tensileStrainEt);
  assert.ok(run({ rainIntensityMmHr: 100 }).tensors.surfaceDeflectionMaxMicron > run({ rainIntensityMmHr: 0 }).tensors.surfaceDeflectionMaxMicron);
});

// ---------------------------------------------------------------------------------------
// 3. Known deviations from layered-elastic (Burmister) theory — pinned, not endorsed
// ---------------------------------------------------------------------------------------

test('NOT a layered-elastic solution: scaling every modulus by 2 does not halve the response', () => {
  // In linear elasticity, multiplying all layer moduli by k (same load and geometry)
  // multiplies every strain and deflection by exactly 1/k. The formulas give
  // k^-0.4, k^-0.75 and k^-0.6 instead, because each one uses a single modulus.
  const heavy = { axleLoadTon: 25, asphaltThicknessCm: 5, subgradeCbrPercent: 3 };
  const base = run(heavy);
  const stiff = run({ ...heavy, asphaltModulusMpa: UNIT.asphaltModulusMpa * 2, subgradeCbrPercent: 6 });
  const ratio = (key: 'tensileStrainEt' | 'compressiveStrainEv' | 'surfaceDeflectionMaxMicron') => stiff.tensors[key] / base.tensors[key];
  assert.ok(Math.abs(ratio('tensileStrainEt') - Math.pow(2, -0.4)) < 0.01, `tensile ratio ${ratio('tensileStrainEt')}`);
  assert.ok(Math.abs(ratio('compressiveStrainEv') - Math.pow(2, -0.75)) < 0.01, `compressive ratio ${ratio('compressiveStrainEv')}`);
  assert.ok(Math.abs(ratio('surfaceDeflectionMaxMicron') - Math.pow(2, -0.6)) < 0.01, `deflection ratio ${ratio('surfaceDeflectionMaxMicron')}`);
  for (const key of ['tensileStrainEt', 'compressiveStrainEv', 'surfaceDeflectionMaxMicron'] as const) {
    assert.ok(Math.abs(ratio(key) - 0.5) > 0.05, `${key} would be 0.5 for a layered-elastic model`);
  }
});

test('layers are not coupled: each response uses one layer only', () => {
  const base = run({ axleLoadTon: 20, asphaltThicknessCm: 8 });
  // tensile strain ignores the subgrade and water
  for (const o of [{ subgradeCbrPercent: 10 }, { rainIntensityMmHr: 100 }, { floodDurationHours: 48 }]) {
    assert.equal(run({ axleLoadTon: 20, asphaltThicknessCm: 8, ...o }).tensors.tensileStrainEt, base.tensors.tensileStrainEt);
  }
  // compressive strain and deflection ignore asphalt stiffness and temperature
  for (const o of [{ asphaltModulusMpa: 3500 }, { surfaceTemperatureC: 60 }]) {
    const r = run({ axleLoadTon: 20, asphaltThicknessCm: 8, ...o });
    assert.equal(r.tensors.compressiveStrainEv, base.tensors.compressiveStrainEv);
    assert.equal(r.tensors.surfaceDeflectionMaxMicron, base.tensors.surfaceDeflectionMaxMicron);
  }
});

test('deflection basin has one fixed shape: w(r) / w0 does not depend on the pavement', () => {
  const soft = run({ axleLoadTon: 25, asphaltThicknessCm: 5, subgradeCbrPercent: 3, rainIntensityMmHr: 100 });
  const stiff = run({ axleLoadTon: 25, asphaltThicknessCm: 25, subgradeCbrPercent: 10, asphaltModulusMpa: 3500 });
  for (const result of [soft, stiff]) {
    const basin = result.roleOutputs.fieldEngineer.deflectionBasin;
    for (const point of basin) {
      const shape = point.deflectionMicron / basin[0].deflectionMicron;
      assert.ok(Math.abs(shape - Math.exp(-0.0018 * point.distanceMm)) < 0.005, `r=${point.distanceMm}: ${shape}`);
    }
  }
  // Consequence: the basin carries no information about layer stiffness, so it cannot be
  // used for back-calculation the way a measured FWD basin is.
});

test('PCI, remaining life and pothole horizon ignore every structural input', () => {
  const reference = run({ axleLoadTon: 16, rainIntensityMmHr: 30, floodDurationHours: 6 });
  const variants: Array<Partial<SimulationParams>> = [
    { asphaltThicknessCm: 5 },
    { asphaltThicknessCm: 25 },
    { asphaltModulusMpa: 1200 },
    { asphaltModulusMpa: 3500 },
    { surfaceTemperatureC: 60 },
    { subgradeCbrPercent: 3 },
    { subgradeCbrPercent: 10 }
  ];
  for (const variant of variants) {
    const r = run({ axleLoadTon: 16, rainIntensityMmHr: 30, floodDurationHours: 6, ...variant });
    assert.equal(r.predictedPci, reference.predictedPci, JSON.stringify(variant));
    assert.equal(r.pavementLifeRemainingYears, reference.pavementLifeRemainingYears, JSON.stringify(variant));
    assert.equal(r.roleOutputs.fieldEngineer.potholeHorizonDays, reference.roleOutputs.fieldEngineer.potholeHorizonDays, JSON.stringify(variant));
  }
  // i.e. the computed strains do not feed the deterioration prediction at all.
});

// ---------------------------------------------------------------------------------------
// 4. Clamps and saturation inside the documented ranges
// ---------------------------------------------------------------------------------------

test('annual PCI drop saturates at 35 from about 19.3 t (dry): heavier loads change nothing', () => {
  assert.equal(run({ axleLoadTon: 19 }).predictedPci, 54); // drop 32.6, below the cap
  assert.equal(run({ axleLoadTon: 19.5 }).predictedPci, 52); // drop 36.1, capped at 35
  assert.equal(run({ axleLoadTon: 25 }).predictedPci, 52); // same prediction as 19.5 t
  assert.equal(run({ axleLoadTon: 25 }).pciDropPoints, 28); // 0.8 x 35
});

test('water-decay floor of 0.4 is reached inside the documented ranges; temperature floor is not', () => {
  // 1 - 0.004 x 100 - 0.015 x 14 = 0.39, already below the floor
  assert.equal(run({ rainIntensityMmHr: 100, floodDurationHours: 14 }).tensors.compressiveStrainEv, run({ rainIntensityMmHr: 100, floodDurationHours: 48 }).tensors.compressiveStrainEv);
  // temperature factor reaches its floor of 0.5 only at 66.7 C, above the documented 60 C
  const hot = (t: number) => run({ surfaceTemperatureC: t, axleLoadTon: 25, asphaltThicknessCm: 5 }).tensors.tensileStrainEt;
  assert.ok(hot(60) < hot(70));
  assert.equal(hot(70), hot(100));
});

// ---------------------------------------------------------------------------------------
// 5. Thresholds and baseline integrity
// ---------------------------------------------------------------------------------------

test('inventory of strain limits in the source: four different numbers, defined in five places', () => {
  const engine = read('src/engines/pinn/core/pinnEngine.ts');
  assert.match(engine, /tensileStrainEt > 250/);
  assert.match(engine, /tensileStrainEt > 180/);
  assert.match(engine, /batas ijin Bina Marga \(200 µε\)/); // the critical note cites 200 while it triggers at 250
  assert.match(read('src/components/simulation-viewer/SimulationPanel.tsx'), /tensileStrainEt > 200/);
  assert.match(read('src/services/reporting/pdfGenerator.ts'), /tensileStrainEt > 200/);
  for (const chart of ['src/features/fwd/FieldEngineerDashboard.tsx', 'src/features/fwd/FieldEngineerTools.tsx']) {
    const source = read(chart);
    assert.match(source, /BatasIjinAashto: 200/); // tensile limit drawn in the chart
    assert.match(source, /BatasIjinAashto: 350/); // compressive limit drawn in the chart
  }
  // If the limits are unified, update this inventory and PINN_VALIDATION_GAP.md together.
});

test('golden baseline is intact: 76 scenarios, pinned content hash, and tests never rewrite it', () => {
  const fixture = read('tests/physics-validation/fixtures/pinn-golden.json');
  const golden = JSON.parse(fixture);
  assert.equal(golden.scenarioCount, 76);
  assert.equal(golden.scenarios.length, 76);
  const groups: Record<string, number> = {};
  for (const scenario of golden.scenarios) groups[scenario.group] = (groups[scenario.group] ?? 0) + 1;
  assert.deepEqual(groups, { 'segment-defaults': 15, sweep: 31, 'runtime-matrix': 15, 'invalid-extreme': 15 });
  // Hash of the file as captured from the pre-restructure engine (line endings normalised).
  // Regenerating the baseline must be a deliberate act that also changes this constant.
  assert.equal(
    createHash('sha256').update(fixture.replace(/\r\n/g, '\n')).digest('hex'),
    '96584b693b4d956c762fdb0ff5c2fd633facbdd56a18d35e0821d1efade7f6b7'
  );
  // The other physics test modules never write files (this file only reads); only
  // scripts/capture-pinn-baseline.ts can produce the fixture.
  for (const file of ['pinn-regression.test.ts', 'pinn-threshold-characterization.test.ts', 'pinnScenarios.ts', 'thresholdAnalysis.ts']) {
    assert.doesNotMatch(read(`tests/physics-validation/${file}`), /writeFile|appendFile|createWriteStream/, file);
  }
});
