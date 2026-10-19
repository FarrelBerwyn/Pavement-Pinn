import { runPinnSimulation } from '../../../../src/engines/pinn/core/pinnEngine.ts';
import { INDONESIAN_ROAD_SEGMENTS } from '../../../../src/data/reference/indonesianRoads.ts';
import { assessSegment } from '../../../../src/domain/intelligence/assessment.ts';
import { KARAWANG_PILOT_SEGMENTS } from '../../../../src/data/reference/karawangPilot.ts';
import { screenReport, DEMO_CV_PROVIDER } from '../../../../src/domain/workflow/screening.ts';
const seg= { ...INDONESIAN_ROAD_SEGMENTS[0], currentPci: 80 };
const B= { segmentId: seg.id, axleLoadTon: 10, rainIntensityMmHr: 0, floodDurationHours: 0, surfaceTemperatureC: 25, subgradeCbrPercent: 6, asphaltThicknessCm: 10, asphaltModulusMpa: 2500, targetDevice: 'CPU', precisionMode: 'FP32' };
const pick = (r) => ({ et: r.tensors.tensileStrainEt, ev: r.tensors.compressiveStrainEv, w0: r.tensors.surfaceDeflectionMaxMicron, pci: r.predictedPci, years: r.pavementLifeRemainingYears, pothole: r.roleOutputs.fieldEngineer.potholeHorizonDays, zeroOdol: r.roleOutputs.policyMaker.zeroOdolTargetImpactPercent, alert: r.roleOutputs.operationsManager.alertStatus, overlay: r.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm, pciProj0: r.roleOutputs.policyMaker.pci5YearProjection[0] });
const cases = [
  ['baseline 10 t', {}], ['zero load', { axleLoadTon: 0 }], ['negative load', { axleLoadTon: -5 }], ['8 t (below 10 t ref)', { axleLoadTon: 8 }],
  ['100 t load', { axleLoadTon: 100 }], ['zero thickness', { asphaltThicknessCm: 0 }], ['zero CBR', { subgradeCbrPercent: 0 }], ['negative CBR', { subgradeCbrPercent: -2 }],
  ['zero modulus', { asphaltModulusMpa: 0 }], ['rain 1000 mm/h', { rainIntensityMmHr: 1000 }], ['temp -40 C', { surfaceTemperatureC: -40 }], ['temp 200 C', { surfaceTemperatureC: 200 }],
  ['NaN load', { axleLoadTon: NaN }], ['missing thickness', { asphaltThicknessCm: undefined }], ['string load "12"', { axleLoadTon: '12' }],
];
for (const [name, o] of cases) {
  try { const r = runPinnSimulation({ ...B, ...o }, seg); console.log(name.padEnd(22), JSON.stringify(pick(r))); }
  catch (e) { console.log(name.padEnd(22), 'THROWS', e.message); }
}
// Non-determinism: identical inputs, different telemetry
const a = runPinnSimulation(B, seg).telemetry, b = runPinnSimulation(B, seg).telemetry;
console.log('\nsame input twice -> latency', a.inferenceLatencyMs, b.inferenceLatencyMs, '| physicsLoss', a.physicsLossValue, b.physicsLossValue, '| dataLoss', a.dataLossValue, b.dataLossValue);
// JSON serialisation of non-finite outputs (what /api/simulate returns)
console.log('JSON of zero-load result fields:', JSON.stringify({ pothole: runPinnSimulation({ ...B, axleLoadTon: 0 }, seg).roleOutputs.fieldEngineer.potholeHorizonDays, years: runPinnSimulation({ ...B, axleLoadTon: 0 }, seg).pavementLifeRemainingYears }));
// Saturation behaviour of PCI/RUL: thickness/modulus/CBR do not influence PCI, RUL, pothole horizon
const v = (o) => { const r = runPinnSimulation({ ...B, axleLoadTon: 18, ...o }, seg); return [r.predictedPci, r.pavementLifeRemainingYears, r.roleOutputs.fieldEngineer.potholeHorizonDays].join('/'); };
console.log('\nPCI/RUL/pothole at 18 t: h=5', v({ asphaltThicknessCm: 5 }), 'h=25', v({ asphaltThicknessCm: 25 }), '| CBR 3', v({ subgradeCbrPercent: 3 }), 'CBR 10', v({ subgradeCbrPercent: 10 }), '| E 1200', v({ asphaltModulusMpa: 1200 }), 'E 3500', v({ asphaltModulusMpa: 3500 }), '| temp 60', v({ surfaceTemperatureC: 60 }));
// PCI time-unit consistency: 5-year no-action trajectory vs RUL
const r18 = runPinnSimulation({ ...B, axleLoadTon: 18 }, seg);
console.log('18 t: annual drop implied', (80 - r18.predictedPci) / 0.8, 'RUL years', r18.pavementLifeRemainingYears, 'pothole days', r18.roleOutputs.fieldEngineer.potholeHorizonDays, 'proj', JSON.stringify(r18.roleOutputs.policyMaker.pci5YearProjection));
// Overlay vs strain: overlay recommendation independent of structure
console.log('overlay at PCI-driven: segment PCI 40, h=5 vs h=25:', runPinnSimulation({ ...B, asphaltThicknessCm: 5 }, { ...seg, currentPci: 40 }).roleOutputs.fieldEngineer.recommendedOverlayThicknessCm, runPinnSimulation({ ...B, asphaltThicknessCm: 25 }, { ...seg, currentPci: 40 }).roleOutputs.fieldEngineer.recommendedOverlayThicknessCm);
// Pilot bounds vs blueprint corridor (Jl. Raya Narogong, approx. -6.38, 107.00; coordinate is an audit approximation)
const rep= { id: 'X', damageType: 'POTHOLE', coordinates: [-6.38, 107.0], severity: 'MODERATE' };
console.log('\nNarogong-area report screening reasons:', screenReport(rep, '2026-10-14T00:00:00Z', [], DEMO_CV_PROVIDER).reasons);
// assessSegment clamping behaviour
const k = KARAWANG_PILOT_SEGMENTS[0];
const asm = assessSegment(k, { now: '2026-10-14T00:00:00Z', inputs: { axleLoadTon: 0, asphaltThicknessCm: 0 } });
console.log('assessSegment(axle 0, h 0):', JSON.stringify(asm.outputs), asm.outOfRange, asm.confidence);
