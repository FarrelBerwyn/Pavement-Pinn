/**
 * E3 request building: segment values are labelled with their source, assumed defaults are
 * labelled ASSUMED, and inputs are clamped into the surrogate's training ranges.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, initialInputs } from '../../src/features/road-intelligence/StructuralAssessmentPanel';

const baseline = { axleLoadTon: 12, rainIntensityMmHr: 0, floodDurationHours: 0, surfaceTemperatureC: 35, subgradeCbrPercent: 6, asphaltThicknessCm: 10, asphaltModulusMpa: 2500 };

test('initial inputs come from the segment and are clamped to the trained range', () => {
  const v = initialInputs({ ...baseline, asphaltThicknessCm: 40, subgradeCbrPercent: 0.5 });
  assert.equal(v.h1, 250);
  assert.equal(v.cbr, 1);
  assert.equal(v.axle, 8.16);
});

test('request labels every layer source and asks for 2,000 Monte Carlo samples', () => {
  const r = buildRequest('KRW-001', initialInputs(baseline), 'AI');
  assert.equal(r.layers[0].source, 'SEGMENT_RECORD (SYNTHETIC)');
  assert.equal(r.layers[1].source, 'ASSUMED');
  assert.equal(r.n_mc, 2000);
  assert.deepEqual(r.load, { axle_t: 8.16, q_mpa: 0.55, dual_spacing_mm: 330 });
  assert.ok(r.traffic!.esal_day_p10 <= r.traffic!.esal_day_p50 && r.traffic!.esal_day_p50 <= r.traffic!.esal_day_p90);
});
