// Layered (non-homogeneous) checks of the reference solver.
import { onAxis, buildLayers } from './mlet.mjs';
let fail = 0;
// (a) Kernel consistency in a strongly layered system, both sides of each interface:
//     strain from displacement kernels must equal strain from stress kernels (Hooke).
const sys = [{ E: 3000, nu: 0.35, h: 0.1 }, { E: 250, nu: 0.35, h: 0.2 }, { E: 50, nu: 0.45 }];
for (const [z, li] of [[0.05, 0], [0.0999, 0], [0.1001, 1], [0.2999, 1], [0.3001, 2], [0.5, 2]]) {
  const r = onAxis(sys, 0.55, 0.15, z, li);
  const d = Math.abs(r.epsZdirect - r.epsZ) / Math.abs(r.epsZ);
  console.log(`z=${z} layer ${li}: epsZ(stress)=${r.epsZ.toExponential(5)} epsZ(disp)=${r.epsZdirect.toExponential(5)} rel=${d.toExponential(2)} sigmaZ=${r.sigmaZ.toFixed(5)} w=${(r.w*1e6).toFixed(1)}um`);
  if (d > 1e-6) fail++;
}
// (b) Continuity across the interfaces: sigmaZ and w equal on both sides.
for (const zi of [0.1, 0.3]) {
  const li = zi === 0.1 ? 0 : 1;
  const up = onAxis(sys, 0.55, 0.15, zi, li), dn = onAxis(sys, 0.55, 0.15, zi, li + 1);
  console.log(`interface ${zi}: sigmaZ ${up.sigmaZ.toFixed(6)} | ${dn.sigmaZ.toFixed(6)}; w ${up.w.toExponential(6)} | ${dn.w.toExponential(6)}; epsR ${up.epsR.toExponential(4)} | ${dn.epsR.toExponential(4)} (epsR need not be continuous? it must: u_r continuous)`);
  if (Math.abs(up.sigmaZ - dn.sigmaZ) > 1e-9 || Math.abs(up.w - dn.w) > 1e-12 || Math.abs(up.epsR - dn.epsR) / Math.abs(up.epsR) > 1e-6) fail++;
}
// (c) Burmister two-layer interface vertical stress (nu = 0.5 both layers, h1/a = 1).
//     Huang (2004) Fig. 2.11 chart readings: E1/E2 = 1 -> 0.646 (exact Boussinesq), 10 -> ~0.29, 100 -> ~0.08.
for (const ratio of [1, 10, 100]) {
  const r = onAxis([{ E: ratio, nu: 0.4999, h: 1 }, { E: 1, nu: 0.4999 }], 1, 1, 1, 1);
  console.log(`Burmister 2-layer h1/a=1 E1/E2=${ratio}: sigmaZ/p at interface = ${(-r.sigmaZ).toFixed(3)}`);
}
// (d) Burmister two-layer surface deflection factor F2 = w0 E2 / (1.5 p a) (nu=0.5).
for (const [ratio, h] of [[1, 1], [10, 1], [100, 1], [10, 2]]) {
  const r = onAxis([{ E: ratio, nu: 0.4999, h }, { E: 1, nu: 0.4999 }], 1, 1, 0, 0, { mMax: 1500 });
  console.log(`F2(h1/a=${h}, E1/E2=${ratio}) = ${(r.w / 1.5).toFixed(3)}`);
}
console.log(fail === 0 ? 'LAYERED CONSISTENCY CHECKS PASS' : `${fail} FAILED`);
process.exit(fail ? 1 : 0);
