// Verification of the reference solver against closed forms. Prints a table; exit 1 on failure.
import { onAxis, boussinesq, J } from './mlet.mjs';

let fail = 0;
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-30, Math.abs(b));
const row = (...c) => console.log(c.map((x) => (typeof x === 'number' ? x.toPrecision(6) : x).toString().padEnd(14)).join(''));

// 1. Bessel functions: continuity between trapezoid and asymptotic branches, known values.
const known = [[0, 1, 0.7651976866], [1, 1, 0.4400505857], [0, 10, -0.2459357645], [1, 10, 0.04347274617], [0, 2.404825557695773, 0]];
for (const [n, x, v] of known) {
  const e = Math.abs(J(n, x) - v);
  if (e > 1e-8) { fail++; console.log('Bessel FAIL', n, x, J(n, x), v); }
}
console.log('Bessel J0/J1 known values: max abs err <= 1e-8', fail === 0 ? 'PASS' : 'FAIL');

// 2. Homogeneous three-layer system must equal the Boussinesq half-space (validates surface BC,
//    interface continuity rows and integration).
const E = 100, nu = 0.4, p = 0.55, a = 0.15;
const homo = [{ E, nu, h: 0.1 }, { E, nu, h: 0.2 }, { E, nu }];
console.log('\nHomogeneous 3-layer vs Boussinesq (E=100 MPa, nu=0.4, p=0.55 MPa, a=0.15 m)');
row('z [m]', 'quantity', 'solver', 'closed form', 'rel err');
for (const [z, li] of [[0.05, 0], [0.0999, 0], [0.1001, 1], [0.3, 1], [0.3001, 2], [0.6, 2]]) {
  const s = onAxis(homo, p, a, z, li);
  const b = boussinesq(E, nu, p, a, z);
  for (const q of ['sigmaZ', 'sigmaR', 'epsZ', 'epsR', 'w']) {
    const r = rel(s[q], b[q]);
    if (r > 2e-3 && Math.abs(s[q] - b[q]) > 1e-6 * Math.abs(p)) { fail++; }
    row(z, q, s[q], b[q], r);
  }
  const rd = rel(s.epsZdirect, b.epsZ);
  if (rd > 2e-3) fail++;
}
// Surface deflection: closed form 2(1-nu^2) p a / E.
const s0 = onAxis(homo, p, a, 0, 0, { mMax: 1500, dm: 0.05 });
const w0 = (2 * (1 - nu * nu) * p * a) / E;
console.log('surface w0 solver', s0.w.toPrecision(6), 'closed', w0.toPrecision(6), 'rel', rel(s0.w, w0).toPrecision(3));
if (rel(s0.w, w0) > 5e-3) fail++;
console.log('surface sigmaZ (expect -p):', s0.sigmaZ.toPrecision(5));

// 3. Elastic similarity: scaling every modulus by k scales strains by 1/k exactly.
const two = [{ E: 2500, nu: 0.35, h: 0.1 }, { E: 60, nu: 0.45 }];
const two3 = two.map((L) => ({ ...L, E: L.E * 3 }));
const x1 = onAxis(two, p, a, 0.1, 0), x3 = onAxis(two3, p, a, 0.1, 0);
console.log('\nSimilarity: epsR(k=1)/epsR(k=3) =', (x1.epsR / x3.epsR).toPrecision(8), '(expect 3)');
if (Math.abs(x1.epsR / x3.epsR - 3) > 1e-6) fail++;

console.log(fail === 0 ? '\nALL REFERENCE-SOLVER CHECKS PASS' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
