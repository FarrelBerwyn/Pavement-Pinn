// Engine vs independent layered-elastic reference. Read-only use of the repository engine.
import { onAxis } from './mlet.mjs';
import { runPinnSimulation } from '../../../../src/engines/pinn/core/pinnEngine.ts';
import { INDONESIAN_ROAD_SEGMENTS } from '../../../../src/data/reference/indonesianRoads.ts';
import { writeFileSync } from 'node:fs';

const seg = { ...INDONESIAN_ROAD_SEGMENTS[0], currentPci: 80 };
const engine = (P, h, E1, cbr) =>
  runPinnSimulation({ segmentId: seg.id, axleLoadTon: P, rainIntensityMmHr: 0, floodDurationHours: 0, surfaceTemperatureC: 25, subgradeCbrPercent: cbr, asphaltThicknessCm: h, asphaltModulusMpa: E1, targetDevice: 'CPU', precisionMode: 'FP32' }, seg).tensors;

function reference(P, h, E1, cbr, opt) {
  const F = (P * 9.80665) / opt.wheels / 1000; // MN per tyre
  const a = Math.sqrt(F / (Math.PI * opt.q)); // m
  const hm = h / 100;
  const Es = 10 * cbr;
  const layers = opt.base
    ? [{ E: E1, nu: 0.35, h: hm }, { E: 200, nu: 0.35, h: 0.15 }, { E: Es, nu: 0.45 }]
    : [{ E: E1, nu: 0.35, h: hm }, { E: Es, nu: 0.45 }];
  const t = onAxis(layers, opt.q, a, hm - 1e-6, 0);
  const zs = opt.base ? hm + 0.15 : hm;
  const v = onAxis(layers, opt.q, a, zs + 1e-6, layers.length - 1);
  return { et: t.epsR * 1e6, ev: -v.epsZ * 1e6, a };
}

const rows = [];
const Ps = [10, 13, 18, 25], hs = [5, 10, 15, 25], Es = [1200, 2500, 3500], cbrs = [3, 6, 10];
for (const P of Ps) for (const h of hs) for (const E1 of Es) for (const cbr of cbrs) {
  const e = engine(P, h, E1, cbr);
  const r2 = reference(P, h, E1, cbr, { wheels: 4, q: 0.55, base: false });
  const r3 = reference(P, h, E1, cbr, { wheels: 4, q: 0.55, base: true });
  rows.push({ P, h, E1, cbr, eng_et: e.tensileStrainEt, eng_ev: e.compressiveStrainEv, ref2_et: r2.et, ref2_ev: r2.ev, ref3_et: r3.et, ref3_ev: r3.ev });
}
writeFileSync(new URL('./compare-grid.json', import.meta.url), JSON.stringify(rows, null, 1));
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const stat = (name, xs) => console.log(`${name.padEnd(46)} min ${q(xs, 0).toFixed(3)}  p25 ${q(xs, 0.25).toFixed(3)}  median ${q(xs, 0.5).toFixed(3)}  p75 ${q(xs, 0.75).toFixed(3)}  max ${q(xs, 1).toFixed(3)}`);
console.log(`Grid points: ${rows.length} (P 10-25 t, h 5-25 cm, E1 1200-3500 MPa, CBR 3-10, dry, 25 C)`);
console.log('Reference loading: dual-tyre single axle, 4 isolated tyres, 0.55 MPa, nu_AC 0.35, nu_SG 0.45, Es = 10 CBR');
stat('ratio engine/ref  eps_t  (2-layer AC/SG)', rows.filter(r => r.ref2_et > 0).map(r => r.eng_et / r.ref2_et));
stat('ratio engine/ref  eps_t  (3-layer +15cm base 200MPa)', rows.filter(r => r.ref3_et > 0).map(r => r.eng_et / r.ref3_et));
stat('ratio engine/ref  eps_v  (2-layer)', rows.map(r => r.eng_ev / r.ref2_ev));
stat('ratio engine/ref  eps_v  (3-layer)', rows.map(r => r.eng_ev / r.ref3_ev));
console.log('Points where reference eps_t (3-layer) is compressive (<=0):', rows.filter(r => r.ref3_et <= 0).length);
const cnt = (f) => rows.filter(f).length;
console.log(`eps_t > 200 ue: engine ${cnt(r => r.eng_et > 200)} | ref 2-layer ${cnt(r => r.ref2_et > 200)} | ref 3-layer ${cnt(r => r.ref3_et > 200)}  of ${rows.length}`);
console.log(`eps_v > 350 ue: engine ${cnt(r => r.eng_ev > 350)} | ref 2-layer ${cnt(r => r.ref2_ev > 350)} | ref 3-layer ${cnt(r => r.ref3_ev > 350)}  of ${rows.length}`);
console.log(`engine max eps_t ${Math.max(...rows.map(r => r.eng_et))}, max eps_v ${Math.max(...rows.map(r => r.eng_ev))}`);

// Blueprint default structure (Bab 8.2): AC 10 cm, E 2500 MPa, CBR 6, 22.5 t virtual WIM load; also 8.16 t standard axle.
console.log('\nBlueprint default segment (AC-WC 10 cm, E1 2500 MPa, CBR 6), dry 25 C:');
for (const P of [8.16, 10, 22.5]) for (const [wheels, qq] of [[4, 0.55], [4, 0.70], [2, 0.70]]) {
  const e = engine(P, 10, 2500, 6);
  const r2 = reference(P, 10, 2500, 6, { wheels, q: qq, base: false });
  const r3 = reference(P, 10, 2500, 6, { wheels, q: qq, base: true });
  console.log(`P=${P} t, ${wheels} tyres @ ${qq} MPa (a=${(r2.a * 100).toFixed(1)} cm): engine et=${e.tensileStrainEt} ev=${e.compressiveStrainEv} | ref2 et=${r2.et.toFixed(0)} ev=${r2.ev.toFixed(0)} | ref3 et=${r3.et.toFixed(0)} ev=${r3.ev.toFixed(0)}`);
}

// Local log-sensitivities at the blueprint point (central differences, 2-layer, 4 tyres @0.55 MPa)
const base = { P: 10, h: 10, E1: 2500, cbr: 6 };
const sens = (key) => {
  const up = { ...base, [key]: (base)[key] * 1.05 }, dn = { ...base, [key]: (base)[key] / 1.05 };
  const R = (o) => reference(o.P, o.h, o.E1, o.cbr, { wheels: 4, q: 0.55, base: false });
  const ru = R(up), rd = R(dn);
  const d = 2 * Math.log(1.05);
  return { et: Math.log(ru.et / rd.et) / d, ev: Math.log(ru.ev / rd.ev) / d };
};
console.log('\nLocal exponents d ln(eps)/d ln(x) at blueprint point, reference (2-layer) vs engine formula:');
for (const [k, engEt, engEv] of [['P', 1, 1], ['h', -1.75, -1.4 * 10 / 25], ['E1', -0.4, 0], ['cbr', 0, -0.75]]) {
  const s = sens(k);
  console.log(`  ${k.padEnd(4)} eps_t ref ${s.et.toFixed(2)} engine ${engEt} | eps_v ref ${s.ev.toFixed(2)} engine ${engEv.toFixed(2)}`);
}
