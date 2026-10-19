// Independent checks of v3 reference claims using the 2026-10-14 audit's MLET solver (on-axis, single tyre).
import { onAxis } from '../../forensic-2026-10-14/evidence/mlet.mjs';
const q = 0.55;
function strains(Pt, h1, h2, E1, E2, E3, tyres = 4) {
  const F = (Pt * 9.80665) / tyres / 1000; const a = Math.sqrt(F / (Math.PI * q)); // MN, m
  const L = [{ E: E1, nu: 0.35, h: h1 / 1000 }, { E: E2, nu: 0.35, h: h2 / 1000 }, { E: E3, nu: 0.45 }];
  const t = onAxis(L, q, a, h1 / 1000 - 1e-6, 0); const v = onAxis(L, q, a, (h1 + h2) / 1000 + 1e-6, 2);
  return { et: t.epsR * 1e6, ev: -v.epsZ * 1e6, a_mm: a * 1000 };
}
const out = {};
const r = strains(10, 100, 150, 2500, 200, 60); out.reference = r;
const r3 = strains(10, 100, 150, 7500, 600, 180); out.similitude_ratio = { et: r.et / r3.et, ev: r.ev / r3.ev };
// Asphalt Institute (Huang) and Austroads forms exactly as in pavement_core.allowable_reps
const AI = (et, ev, E1) => ({ Nf: 0.0796 * (et * 1e-6) ** -3.291 * (E1 * 145.0377) ** -0.854, Nd: 1.365e-9 * (ev * 1e-6) ** -4.477 });
const AUS = (et, ev, E1, Vb = 11) => ({ Nf: (6918 * (0.856 * Vb + 1.08) / (E1 ** 0.36 * et)) ** 5, Nd: (9300 / ev) ** 7 });
out.AI = AI(r.et, r.ev, 2500); out.AUS = AUS(r.et, r.ev, 2500);
out.Nd_ratio_AUS_over_AI = out.AUS.Nd / out.AI.Nd; out.Nf_ratio_AUS_over_AI = out.AUS.Nf / out.AI.Nf;
// Miner + geometric growth closed form vs explicit year-by-year sum
const life = (N, E, g) => Math.log(1 + N * g / E) / Math.log(1 + g);
{ const N = 5e6, E = 4e5, g = 0.04; let s = 0, y = 0; while (s + E * (1 + g) ** y <= N) { s += E * (1 + g) ** y; y++; } out.life_check = { closed: life(N, E, g), explicit_whole_years: y }; }
// Direction (monotonicity) check of normalised outputs y = eps*E3/q vs the 4 surrogate features, single tyre, on-axis.
const base = { h1: 100, h2: 150, E1: 2500, E2: 200, E3: 60 };
const cases = [];
for (const h1 of [50, 100, 200]) for (const E1 of [1000, 2500, 5000]) for (const E2 of [100, 300]) for (const E3 of [20, 60, 150]) cases.push({ h1, h2: 200, E1, E2, E3 });
const dirs = { et: { h1: [], h2: [], E1: [], E2: [] }, ev: { h1: [], h2: [], E1: [], E2: [] } };
for (const c of cases) {
  const b = strains(10, c.h1, c.h2, c.E1, c.E2, c.E3);
  const bump = { h1: { ...c, h1: c.h1 * 1.1 }, h2: { ...c, h2: c.h2 * 1.1 }, E1: { ...c, E1: c.E1 * 1.1 }, E2: { ...c, E2: c.E2 * 1.1 } };
  for (const [k, p] of Object.entries(bump)) { const s = strains(10, p.h1, p.h2, p.E1, p.E2, p.E3); dirs.et[k].push(Math.sign(s.et - b.et)); dirs.ev[k].push(Math.sign(s.ev - b.ev)); }
}
const summ = (a) => ({ pos: a.filter(x => x > 0).length, neg: a.filter(x => x < 0).length, n: a.length });
out.direction_check = { n_structures: cases.length, et: Object.fromEntries(Object.entries(dirs.et).map(([k, v]) => [k, summ(v)])), ev: Object.fromEntries(Object.entries(dirs.ev).map(([k, v]) => [k, summ(v)])) };
console.log(JSON.stringify(out, null, 1));
