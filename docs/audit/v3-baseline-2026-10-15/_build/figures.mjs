// SVG figures for the v3 baseline report. Numeric figures read their values from
// evidence/evidence-run.log so the report cannot drift from the recorded evidence.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const C = { navy: '#0B2545', blue: '#13315C', cyan: '#0E7490', grey: '#5C677D', line: '#CBD5E1', light: '#EEF2F7', red: '#B42318', amber: '#B54708', green: '#067647', violet: '#6941C6' };
let arrowSeq = 0;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Segoe UI, Arial, sans-serif">${body}</svg>`;
const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size ?? 11}" fill="${o.fill ?? '#1F2937'}" font-weight="${o.weight ?? 400}" text-anchor="${o.anchor ?? 'start'}">${esc(s)}</text>`;
const box = (x, y, w, h, title, lines, o = {}) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${o.fill ?? '#fff'}" stroke="${o.stroke ?? C.blue}" stroke-width="${o.sw ?? 1.2}" ${o.dash ? 'stroke-dasharray="5 3"' : ''}/>`;
  s += text(x + 8, y + 16, title, { size: 11.5, weight: 700, fill: o.titleFill ?? C.navy });
  lines.forEach((l, i) => { s += text(x + 8, y + 32 + i * 13.5, l, { size: 9.6, fill: o.lineFill ?? '#344054' }); });
  return s;
};
const arrow = (x1, y1, x2, y2, label, o = {}) => {
  const id = 'a' + (++arrowSeq);
  let s = `<defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${o.color ?? C.grey}"/></marker></defs>`;
  s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.color ?? C.grey}" stroke-width="1.3" ${o.dash ? 'stroke-dasharray="4 3"' : ''} marker-end="url(#${id})"/>`;
  if (label) s += text((x1 + x2) / 2 + (o.dx ?? 6), (y1 + y2) / 2 + (o.dy ?? -4), label, { size: 9, fill: C.grey });
  return s;
};
const tag = (x, y, label, color) => `<rect x="${x}" y="${y}" width="${label.length * 6.3 + 12}" height="16" rx="2" fill="#fff" stroke="${color}"/>` + text(x + 6, y + 11.5, label, { size: 8.6, weight: 700, fill: color });

function evidence(root) {
  const log = readFileSync(path.join(root, 'evidence', 'evidence-run.log'), 'utf8');
  const blocks = log.split(/^## .*$/m).map((b) => b.trim()).filter((b) => b.startsWith('{'));
  return { a: JSON.parse(blocks[0]), b: JSON.parse(blocks[1]), log };
}

function asIs() {
  let s = '';
  s += tag(10, 6, 'AS-IS IMPLEMENTATION', C.navy);
  s += box(10, 34, 200, 108, 'Browser SPA (React 19 + Vite)', ['Citizen report form, maps (2D)', 'Operator / engineer / policy views', 'Legacy screens: random telemetry,', 'WIM modal, keyword "CV",', 'device detector claiming NPU'], { stroke: C.blue });
  s += box(250, 34, 210, 108, 'Express API (TypeScript)', ['Workflow state machine (11 states)', 'Server RBAC, separation of duties', 'Audit trail, optimistic concurrency', 'Photo check: magic bytes, 5 MB', 'Rate limits; /api/simulate (legacy)'], { stroke: C.green, sw: 1.8 });
  s += box(500, 34, 170, 108, 'Persistence', ['Atomic JSON file store', '(DATA_DIR)', 'Supabase migration written,', 'NOT applied'], { stroke: C.blue });
  s += box(250, 172, 210, 96, 'Domain kernel src/domain/', ['assessment.ts: RULE_BASED label', 'esal.ts: 8.16 t fourth power (keep)', 'evidence.ts: DEMO weather/traffic', 'whatIf.ts: persisted What-If'], { stroke: C.green, sw: 1.8 });
  s += box(10, 172, 200, 96, 'pinnEngine.ts (heuristic)', ['Closed-form power laws', 'Strains 15x / 47x too low', 'RUL days, pothole horizon, PCI', 'Math.random latency and losses'], { stroke: C.red, sw: 1.8, titleFill: C.red });
  s += box(500, 172, 170, 96, 'Cloud LLM', ['narrativeService.ts', 'gemini-3.7-flash + fallback', 'text (no number checker)'], { stroke: C.amber, sw: 1.6, titleFill: C.amber });
  s += arrow(210, 88, 250, 88);
  s += arrow(460, 88, 500, 88);
  s += arrow(355, 142, 355, 172);
  s += arrow(250, 220, 210, 220);
  s += arrow(460, 220, 500, 220);
  s += text(10, 292, 'Not present: Python service, PyMastic/MLET, trained model of any kind, OpenVINO runtime, NPU use, benchmarks,', { size: 9.6, fill: C.grey });
  s += text(10, 306, 'EXIF stripping, face/plate blur, tracking code, service worker. Green = keep; red = replace/remove; amber = replace (D-10).', { size: 9.6, fill: C.grey });
  return svg(680, 316, s);
}

function target() {
  let s = '';
  s += tag(10, 6, 'V3 SPECIFICATION', C.violet) + tag(140, 6, 'PROPOSED TARGET STATE', C.navy);
  s += box(10, 34, 660, 50, 'Layer 1 — Citizen PWA (online; reports queue offline)', ['Camera + GPS, on-phone blur/brightness check, compression <= 500 KB, tracking code, public hazard map without reporter data, confirmations'], { stroke: C.blue });
  s += box(10, 104, 300, 96, 'Express API — existing, kept', ['State machine + RBAC + audit (only writer of case state)', 'New states after approval: SCREENED, REJECTED_WITH_', 'REASON, MERGED, REFERRED; risk score + knapsack', '(TypeScript); calls inference via INFERENCE_URL'], { stroke: C.green, sw: 1.8 });
  s += box(350, 104, 320, 182, 'Python inference service (FastAPI, :8100) — NEW', ['/v1/screen  A Trust Gate · B EXIF strip + blur · C YOLO INT8', '/v1/assess  D1 PyMastic MLET (reference)', '            D2 PI-surrogate (OpenVINO) + guard:', '               out of domain or > 10 % cross-check -> MLET', '            D3 transfer function + Monte Carlo P10/P50/P90', '/v1/options repair-option comparison', '/v1/brief   G local SLM (NPU -> GPU -> CPU) + checker', '/v1/measurements  benchmark files (Evidence page)', 'Stateless w.r.t. cases; outputs carry provenance'], { stroke: C.violet, sw: 1.8, dash: true });
  s += box(10, 220, 300, 66, 'Layer 3 — decisions and governance', ['Operator triage, engineer assessment (offline field mode),', 'planner budget package, Dishub advisory (read-only)'], { stroke: C.blue });
  s += arrow(160, 84, 160, 104);
  s += arrow(310, 150, 350, 150);
  s += arrow(160, 200, 160, 220);
  s += text(10, 304, 'Blocked today: no permitted Python runtime on the development laptop (F-38); licence decision for YOLO (F-42).', { size: 9.6, fill: C.red });
  return svg(680, 314, s);
}

function strains(ev) {
  const ref = ev.a.reference;
  const rows = [['εt (asphalt bottom)', 20, ref.et], ['εv (subgrade top)', 17, ref.ev]];
  const x0 = 150, w = 400, max = 1000;
  let s = tag(10, 6, 'VERIFIED FINDING', C.green);
  rows.forEach(([name, eng, mlet], i) => {
    const y = 44 + i * 82;
    s += text(10, y + 22, name, { size: 11, weight: 700 });
    s += `<rect x="${x0}" y="${y}" width="${(eng / max) * w}" height="22" fill="${C.red}"/>` + text(x0 + (eng / max) * w + 6, y + 15, `Legacy engine ${eng} µε`, { size: 10, fill: C.red });
    s += `<rect x="${x0}" y="${y + 28}" width="${(mlet / max) * w}" height="22" fill="${C.cyan}"/>` + text(x0 + (mlet / max) * w + 6, y + 43, `MLET ${mlet.toFixed(1)} µε (ratio ${(mlet / eng).toFixed(1)}x)`, { size: 10, fill: C.cyan });
  });
  for (let t = 0; t <= 1000; t += 200) s += `<line x1="${x0 + (t / max) * w}" y1="200" x2="${x0 + (t / max) * w}" y2="205" stroke="${C.grey}"/>` + text(x0 + (t / max) * w, 218, `${t}`, { size: 9, anchor: 'middle', fill: C.grey });
  s += `<line x1="${x0}" y1="200" x2="${x0 + w}" y2="200" stroke="${C.grey}"/>` + text(x0 + w / 2, 234, 'microstrain (µε)', { size: 9.5, anchor: 'middle', fill: C.grey });
  return svg(680, 244, s);
}

function signs(ev) {
  const d = ev.a.direction_check;
  const items = [['εt vs ln(E1/E3)', d.et.E1, 'neg'], ['εt vs ln(E2/E3)', d.et.E2, 'neg'], ['εv vs ln(h1/a)', d.ev.h1, 'neg'], ['εv vs ln(h2/a)', d.ev.h2, 'neg'], ['εv vs ln(E1/E3)', d.ev.E1, 'neg'], ['εv vs ln(E2/E3)', d.ev.E2, 'neg']];
  const x0 = 170, w = 400;
  let s = tag(10, 6, 'VERIFIED FINDING', C.green) + text(150, 18, 'SIGNS entry = -1 (output must decrease); bar = share of structures that comply', { size: 9.5, fill: C.grey });
  items.forEach(([name, r, dir], i) => {
    const y = 36 + i * 30;
    const share = r[dir] / r.n;
    const ok = share === 1;
    s += text(10, y + 14, name, { size: 10.5 });
    s += `<rect x="${x0}" y="${y}" width="${w}" height="18" fill="${C.light}"/>`;
    s += `<rect x="${x0}" y="${y}" width="${share * w}" height="18" fill="${ok ? C.green : C.red}"/>`;
    s += text(x0 + w + 8, y + 13.5, `${r[dir]}/${r.n} ${ok ? 'consistent' : `- ${r.n - r[dir]} violations`}`, { size: 10, weight: 700, fill: ok ? C.green : C.red });
  });
  return svg(680, 222, s);
}

function roadmap() {
  const phases = [['P0', 'Truthful status', 'no Python; approvals only', C.green], ['P1', 'Python + MLET', '/v1/assess, 303/793 test', C.blue], ['P2', 'PI-surrogate + MC', 'fix F-32/F-33 first', C.blue], ['P3', 'Gate, privacy, YOLO', 'HD-03 licence', C.blue], ['P4', 'Local SLM + checker', 'NPU laptop', C.blue], ['P5', 'Benchmarks', 'interview laptop', C.blue], ['P6', 'Role decisions', 'score, budget, offline', C.blue], ['P7', 'Quality + deploy', 'Playwright, HD-06', C.blue]];
  let s = tag(10, 6, 'PROPOSED TARGET STATE', C.navy);
  phases.forEach(([id, name, note, col], i) => {
    const x = 10 + (i % 4) * 168, y = 36 + Math.floor(i / 4) * 92;
    s += box(x, y, 150, 62, `${id}  ${name}`, [note], { stroke: col, sw: 1.6 });
    if (i % 4 !== 3) s += arrow(x + 150, y + 31, x + 168, y + 31);
  });
  s += arrow(10 + 3 * 168 + 75, 98, 85, 128, '', { dash: true });
  s += `<rect x="176" y="208" width="490" height="26" rx="4" fill="#FEF3F2" stroke="${C.red}"/>` + text(186, 225, 'Blocker for P1-P5: HD-01 Python runtime on the interview laptop (F-38)', { size: 10.5, weight: 700, fill: C.red });
  s += text(10, 225, 'P0 can start now', { size: 10.5, weight: 700, fill: C.green });
  return svg(680, 244, s);
}

export function buildFigures(root) {
  const ev = evidence(root);
  const figs = {
    'fig-5-1-as-is.svg': asIs(),
    'fig-5-2-target.svg': target(),
    'fig-6-1-strains.svg': strains(ev),
    'fig-6-2-signs.svg': signs(ev),
    'fig-10-1-roadmap.svg': roadmap()
  };
  const dir = path.join(root, 'figures');
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(figs)) writeFileSync(path.join(dir, name), content);
  return { ...figs, __evidence: ev };
}
