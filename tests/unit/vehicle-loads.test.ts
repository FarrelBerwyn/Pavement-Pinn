/** Vehicle → axle → wheel loads (statics, SI units) and the request schema. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLoadFor, G, VEHICLE_PRESETS, vehicleLoads } from '../../src/domain/workspace/vehicles';
import { parseVehicle } from '../../src/domain/workspace/vehicleSchema';

test('axle loads add up to the total weight and wheel loads to the axle load', () => {
  for (const v of Object.values(VEHICLE_PRESETS)) {
    const l = vehicleLoads(v);
    assert.ok(Math.abs(l.balanceKn) < 1e-9, v.type);
    assert.ok(Math.abs(l.totalKn - ((v.emptyMassKg + v.payloadKg) * G) / 1000) < 1e-9);
    for (const a of l.axles) assert.ok(Math.abs(a.wheelKn * a.wheels - a.axleKn) < 1e-9);
    assert.deepEqual(l.warnings, []);
  }
});

test('unit conversions: 1500 kg car is 14.71 kN; axle tonnes round-trip; contact radius from p = F/(πa²)', () => {
  const car = { ...VEHICLE_PRESETS.car, emptyMassKg: 1300, payloadKg: 200 };
  const l = vehicleLoads(car);
  assert.equal(l.totalKn.toFixed(2), '14.71');
  const front = l.axles[0];
  assert.ok(Math.abs(front.axleTonne - 1500 * 0.55 / 1000) < 1e-9);
  const p = (front.wheelKn * 1000) / (Math.PI * front.contactRadiusMm ** 2);
  assert.ok(Math.abs(p - car.tyrePressureMPa) < 1e-9);
});

test('a single total weight is never applied to every wheel; the governing axle has the highest wheel load', () => {
  const l = vehicleLoads(VEHICLE_PRESETS.truck);
  assert.ok(l.axles.every((a) => a.wheelKn < l.totalKn / 2));
  assert.equal(l.governing.wheelKn, Math.max(...l.axles.map((a) => a.wheelKn)));
  const body = assessLoadFor(l.axles[1], VEHICLE_PRESETS.truck);
  assert.equal(body.tyres_per_axle, 4);
  assert.equal(body.dual_spacing_mm, 330);
  assert.equal(assessLoadFor(vehicleLoads(VEHICLE_PRESETS.motorcycle).axles[0], VEHICLE_PRESETS.motorcycle).dual_spacing_mm, null);
});

test('schema rejects shares that do not sum to 100 % and out-of-range pressure', () => {
  assert.equal(parseVehicle({ ...VEHICLE_PRESETS.car, axles: [{ share: 0.5, wheels: 2, positionM: 0 }] }).ok, false);
  assert.equal(parseVehicle({ ...VEHICLE_PRESETS.car, tyrePressureMPa: 3 }).ok, false);
  assert.equal(parseVehicle(VEHICLE_PRESETS.truck).ok, true);
});
