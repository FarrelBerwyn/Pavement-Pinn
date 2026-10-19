// Port of pavement_core.py algorithms (knapsack, greedy, priority, ESAL, check_brief) + extra MLET cases.
import { onAxis } from '../../forensic-2026-10-14/evidence/mlet.mjs';
const out = {};
const q = 0.55;
function strains(Pt, h1, h2, E1, E2, E3) {
  const a = Math.sqrt((Pt * 9.80665) / 4 / 1000 / (Math.PI * q));
  const L = [{ E: E1, nu: 0.35, h: h1 / 1000 }, { E: E2, nu: 0.35, h: h2 / 1000 }, { E: E3, nu: 0.45 }];
  return { et: onAxis(L, q, a, h1 / 1000 - 1e-6, 0).epsR * 1e6, ev: -onAxis(L, q, a, (h1 + h2) / 1000 + 1e-6, 2).epsZ * 1e6 };
}
out.isolated_816t = strains(8.16, 100, 150, 2500, 200, 60);
const NdAI = (ev) => 1.365e-9 * (ev * 1e-6) ** -4.477;
const s3 = strains(8.16, 100, 150, 2500, 200, 30);
out.cbr6_to_3_isolated = { ev_cbr6: out.isolated_816t.ev, ev_cbr3: s3.ev, Nd_ratio: NdAI(out.isolated_816t.ev) / NdAI(s3.ev) };
out.doc_dual_816t_Nd = { AI: NdAI(876), AUS: (9300 / 876) ** 7, ratio: (9300 / 876) ** 7 / NdAI(876) };
// mulberry32 PRNG for random knapsack cases (cannot reproduce Python's random stream; independent cases)
const rng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function knapsack(items, budget, unit = 1e6) {
  const W = Math.floor(budget / unit); const costs = items.map(([, c]) => Math.max(1, Math.ceil(c / unit)));
  let best = new Float64Array(W + 1); const keep = items.map(() => new Uint8Array(W + 1));
  items.forEach(([, , b], i) => { const c = costs[i]; if (c > W) return; const nb = best.slice();
    for (let w = c; w <= W; w++) { const cand = best[w - c] + b; if (cand > best[w]) { keep[i][w] = 1; nb[w] = cand; } } best = nb; });
  const chosen = []; let w = W; for (let i = items.length - 1; i >= 0; i--) if (keep[i][w]) { chosen.push(items[i][0]); w -= costs[i]; }
  return [chosen.reverse(), best[W]];
}
function greedy(items, budget) { let spent = 0, total = 0; const ch = [];
  for (const [id, c, b] of [...items].sort((x, y) => y[2] / y[1] - x[2] / x[1])) if (spent + c <= budget) { ch.push(id); spent += c; total += b; } return [ch, total]; }
let ok = 0, strictlyBetter = 0, overBudget = 0, backtrackMismatch = 0;
for (let t = 0; t < 1000; t++) { const r = rng(t + 1); const its = Array.from({ length: 30 }, (_, i) => [`K${i}`, (5 + Math.floor(r() * 56)) * 1e6, 5 + r() * 75]);
  const B = (100 + Math.floor(r() * 301)) * 1e6; const [c1, v1] = knapsack(its, B); const [, v2] = greedy(its, B);
  const cost = its.filter(([i]) => c1.includes(i)).reduce((s, [, c]) => s + c, 0); const val = its.filter(([i]) => c1.includes(i)).reduce((s, [, , b]) => s + b, 0);
  if (v1 >= v2 - 1e-9) ok++; if (v1 > v2 + 1e-9) strictlyBetter++; if (cost > B) overBudget++; if (Math.abs(val - v1) > 1e-6) backtrackMismatch++; }
out.knapsack = { cases: 1000, dp_ge_greedy: ok, dp_strictly_better: strictlyBetter, over_budget: overBudget, backtrack_value_mismatch: backtrackMismatch };
// priority score example from PDF 4.6
const SEV = { 'pothole|High': 1.0 };
function priority(cls, sev, aadt, moto, unlit, L50, n, under, w = [0.5, 0.3, 0.1, 0.1]) {
  const base = SEV[`${cls}|${sev}`] ?? 0.15; const exp = 0.5 + 0.5 * Math.min(1, aadt) * (0.6 + 0.4 * moto);
  const H = Math.min(1, base * exp * (unlit ? 1.2 : 1)); const S = L50 == null ? 0.5 : Math.min(1, Math.max(0, 1 - L50 / 10));
  const C = 1 - Math.exp(-n / 2); const Q = under ? 1 : 0; const p = [w[0] * H, w[1] * S, w[2] * C, w[3] * Q].map((x) => Math.round(1000 * x) / 10);
  return { score: Math.round(1000 * (w[0] * H + w[1] * S + w[2] * C + w[3] * Q)) / 10, parts: p, H_unclipped: base * exp * (unlit ? 1.2 : 1) }; }
out.priority_example = priority('pothole', 'High', 0.8, 0.7, true, 1.5, 3, false);
out.esal_example = { normal: 600 * 0.9 + 250 * 2 + 80 * 4, actual: 600 * 1.6 + 250 * 5 + 80 * 9 };
// check_brief port (JS regex equivalent of the Python pattern)
const NUM = /(?<![\w.])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(?![\w])/gu;
const FORB = ['aman', 'dijamin', 'pasti', 'korupsi', 'lalai', 'nakal', 'melanggar hukum'];
function check(text, facts, tol = 0.01) { const allowed = Object.values(facts); const nums = [...text.matchAll(NUM)].map((m) => parseFloat(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : '')));
  const bad = nums.filter((n) => !allowed.some((a) => Math.abs(n - a) <= Math.max(tol * Math.abs(a), 0.051))); const words = FORB.filter((w) => new RegExp('\\b' + w + '\\b').test(text.toLowerCase())); return { ok: !bad.length && !words.length, bad, words }; }
const facts = { et: 227, ev: 876, L50: 0.4, L10: 0.2, L90: 0.7, esal_day: 1760 };
out.checker = { good: check('Regangan tekan tanah dasar 876 µε; Indeks Umur P50 0,4 tahun (rentang 0,2 sampai 0,7). ESAL harian 1.760.', facts),
  bad: check('Jalan ini aman, regangan 950 µε dan umur 5 tahun.', facts),
  criterion_with_year: check('Kriteria Austroads 2004; εt 227 µε.', facts),
  english_decimal: check('Life index P50 0.4 years.', facts),
  percent_unlisted: check('Ketidakpastian 30% dari nilai tengah.', facts) };
console.log(JSON.stringify(out, null, 1));
