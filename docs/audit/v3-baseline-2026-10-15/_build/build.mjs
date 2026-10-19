// Builds the v3 consolidated baseline from the Markdown sources in this folder:
//   PAVEMENT_PINN_v3_Consolidated_Audit_Baseline.md   (assembled master source, generated)
//   PAVEMENT_PINN_v3_Consolidated_Audit_Baseline.pdf  (A4, Chrome headless, 2-pass TOC)
//   figures/*.svg, _build/qa-result.json
// Usage (from the repository root): node docs/audit/v3-baseline-2026-10-15/_build/build.mjs
// Requires Google Chrome (run headless with a temporary profile) and pdftotext. Writes only
// inside this folder and the OS temp directory. Adapted from forensic-2026-10-14/_build/build.mjs.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { render, inline } from './md.mjs';
import { buildFigures } from './figures.mjs';
import { overflowCheck } from './overflow-check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const NAME = 'PAVEMENT_PINN_v3_Consolidated_Audit_Baseline';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const read = (f) => readFileSync(path.join(root, f), 'utf8');

const META = {
  id: 'PAVEMENT-PINN-V3-BASELINE-001', version: '1.0', date: '2026-10-15', commit: '4a9b4fc49ec6e1d583648b2eaaa26293577add2e',
  branch: 'feature/m1-report-ownership', status: 'Issued for team review — project status against v3: NOT v3-COMPLIANT (19 open P0 items)'
};

// ------------------------------------------------------------------ 1. assemble master Markdown
const REGISTERS = ['PAVEMENT_PINN_v3_Traceability_Matrix.md', 'PAVEMENT_PINN_v3_Reference_Code_Assessment.md', 'PAVEMENT_PINN_v3_Previous_Audit_Crosswalk.md', 'PAVEMENT_PINN_v3_Mathematical_Verification.md', 'PAVEMENT_PINN_v3_Findings_Register.md', 'PAVEMENT_PINN_v3_Development_Roadmap.md', 'PAVEMENT_PINN_v3_Decision_Log_Proposal.md'];
const appendices = REGISTERS.map(read);
const body = read('_build/report-body.md').replace('<!-- include: appendices -->', appendices.join('\n\n<!-- pagebreak -->\n\n'));
const titleBlock = `<!-- GENERATED FILE: assembled by _build/build.mjs from _build/report-body.md and the seven registers (Appendices A-G). Edit the sources, not this file. -->

**PAVEMENT-PINN v3**

**Consolidated Forensic Audit, Reference-Code Comparison & Development Baseline**

Document ID ${META.id} · Version ${META.version} · ${META.date} · Commit \`${META.commit.slice(0, 7)}\` · Branch \`${META.branch}\` · Status: ${META.status}

Inputs: PAVEMENT-PINN v3 Dokumen Induk (65 pp.), AGENTS.md, pavement_pinn_v3_code.zip, PAVEMENT-PINN-AUDIT-001. Internal engineering document; not approved by Intel or any government agency.
`;
const masterMd = titleBlock + '\n' + body;
writeFileSync(path.join(root, `${NAME}.md`), masterMd);

// ------------------------------------------------------------------ 2. figures
const figs = buildFigures(root);
const figureLoader = (src) => {
  const name = path.basename(src);
  if (!figs[name]) throw new Error(`missing figure ${name}`);
  return figs[name];
};

// ------------------------------------------------------------------ 3. HTML
const CSS = `
@page { size: A4; margin: 21mm 17mm 19mm 17mm;
  @top-left { content: "PAVEMENT-PINN v3 — Consolidated Audit Baseline"; font: 600 8pt "Segoe UI", Arial, sans-serif; color: #0B2545; border-bottom: 0.6pt solid #67E8F9; vertical-align: bottom; padding-bottom: 2mm; }
  @top-right { content: "Internal engineering document"; font: 8pt "Segoe UI", Arial, sans-serif; color: #5C677D; border-bottom: 0.6pt solid #67E8F9; vertical-align: bottom; padding-bottom: 2mm; }
  @bottom-left { content: "${META.id} · Version ${META.version} · ${META.date}"; font: 8pt "Segoe UI", Arial, sans-serif; color: #5C677D; vertical-align: top; padding-top: 2mm; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt "Segoe UI", Arial, sans-serif; color: #5C677D; vertical-align: top; padding-top: 2mm; }
}
@page wide { size: A4 landscape; margin: 17mm 15mm 16mm 15mm; }
@page cover { margin: 0; @top-left { content: none; border: 0 } @top-right { content: none; border: 0 } @bottom-left { content: none } @bottom-right { content: none } }
:root { --navy: #0B2545; --blue: #13315C; --cyan: #0E7490; --grey: #5C677D; --light: #EEF2F7; --line: #CBD5E1; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: Cambria, "Times New Roman", serif; font-size: 10.3pt; line-height: 1.42; color: #1F2937; margin: 0; background: #fff; }
math { font-family: "Cambria Math", "STIX Two Math", serif; font-size: 1.04em; }
h1, h2, h3, h4, .cover, th, .badge, .table-caption, figcaption, .eq-caption, .eq-label, .toc { font-family: "Segoe UI", Arial, sans-serif; }
h1 { break-before: page; font-size: 19pt; color: var(--navy); margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2pt solid var(--cyan); break-after: avoid; }
h2 { font-size: 13.5pt; color: var(--navy); margin: 6mm 0 2.5mm; break-after: avoid; }
h3 { font-size: 11.3pt; color: var(--blue); margin: 5mm 0 2mm; break-after: avoid; }
p { margin: 0 0 2.4mm; orphans: 3; widows: 3; text-align: justify; hyphens: auto; }
ul, ol { margin: 0 0 2.6mm; padding-left: 6mm; } li { margin-bottom: 1mm; }
code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 8.6pt; background: #F1F5F9; padding: 0 1.2px; border-radius: 2px; overflow-wrap: anywhere; }
pre { font-family: Consolas, monospace; font-size: 8.4pt; background: #F8FAFC; border: 0.6pt solid var(--line); padding: 2.5mm; white-space: pre-wrap; break-inside: avoid; }
a { color: var(--cyan); text-decoration: none; }
table { width: 100%; border-collapse: collapse; margin: 0 0 4mm; font-size: 8.6pt; line-height: 1.3; page-break-inside: auto; }
table.wide { font-size: 8pt; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: var(--navy); color: #fff; text-align: left; font-weight: 600; padding: 1.6mm 1.8mm; border: 0.5pt solid var(--navy); font-size: 8.2pt; }
td.id { white-space: nowrap; overflow-wrap: normal; }
td { padding: 1.3mm 1.8mm; border: 0.5pt solid var(--line); vertical-align: top; overflow-wrap: anywhere; }
tbody tr:nth-child(even) td { background: #F6F8FB; }
.table-caption { font-size: 8.8pt; font-weight: 600; color: var(--blue); margin: 3mm 0 1.4mm; break-after: avoid; }
figure { margin: 3mm 0 5mm; break-inside: avoid; text-align: center; }
figure svg { max-width: 100%; height: auto; }
figcaption { font-size: 8.8pt; color: var(--grey); margin-top: 1.5mm; text-align: left; }
.equation { display: grid; grid-template-columns: 1fr auto; align-items: center; margin: 2.5mm 0 3.5mm; padding: 2mm 3mm; background: #F8FAFC; border-left: 2pt solid var(--cyan); break-inside: avoid; }
.eq-body { overflow: visible; } .eq-label { font-size: 9pt; color: var(--blue); font-weight: 600; padding-left: 4mm; }
.eq-caption { grid-column: 1 / span 2; font-size: 8.3pt; color: var(--grey); margin-top: 1mm; }
.callout { border: 0.8pt solid #F79009; background: #FFFAEB; padding: 2mm 3mm; margin: 2mm 0 4mm; break-inside: avoid; }
.callout p { margin: 0; }
.badge { display: inline-block; font-size: 6.9pt; font-weight: 700; letter-spacing: 0.02em; padding: 0.2mm 1.2mm; border-radius: 2px; border: 0.6pt solid; white-space: nowrap; vertical-align: 0.5px; }
.b-verified, .b-pass, .b-confirmed, .b-verified-finding, .b-terbukti, .b-reproduced, .b-keep, .b-resolved-verified { color: #067647; border-color: #067647; background: #ECFDF3; }
.b-partially-verified, .b-plausible, .b-partially-resolved, .b-adapt, .b-consistent, .b-target, .b-investigate { color: #B54708; border-color: #B54708; background: #FFFAEB; }
.b-not-implemented, .b-failed, .b-fail, .b-confirmed-open, .b-dilarang, .b-remove, .b-replace, .b-regressed { color: #B42318; border-color: #B42318; background: #FEF3F2; }
.b-not-verified, .b-unverified, .b-n-a, .b-rencana, .b-defer, .b-not-reproducible { color: #475467; border-color: #98A2B3; background: #F9FAFB; }
.b-blocked { color: #344054; border-color: #475467; background: #F2F4F7; }
.b-v3-specification, .b-superseded-by-v3, .b-reference-zip, .b-integrate-reference { color: #6941C6; border-color: #6941C6; background: #F4F3FF; }
.b-as-is-implementation, .b-proposed-target-state { color: #0B2545; border-color: #0B2545; background: #EEF2F7; }
.b-p0 { color: #fff; background: #912018; border-color: #912018; } .b-p1 { color: #fff; background: #C4320A; border-color: #C4320A; }
.b-p2 { color: #fff; background: #B54708; border-color: #B54708; } .b-p3 { color: #fff; background: #475467; border-color: #475467; }
section.landscape { page: wide; } section.landscape table { font-size: 7.9pt; }
.cover { page: cover; height: 297mm; width: 210mm; position: relative; overflow: hidden; color: #fff; background: #0B2545; }
.cover .band { position: absolute; left: 0; right: 0; bottom: 0; height: 96mm; background: #fff; color: #1F2937; padding: 9mm 18mm; box-sizing: border-box; }
.cover .inner { position: absolute; top: 30mm; left: 18mm; right: 18mm; }
.cover .kicker { font-size: 10pt; letter-spacing: 0.24em; color: #67E8F9; text-transform: uppercase; }
.cover .t1 { display: block; font-size: 36pt; font-weight: 800; letter-spacing: 0.02em; margin: 4mm 0 2mm; }
.cover .t2 { font-size: 17pt; font-weight: 700; line-height: 1.25; max-width: 165mm; }
.cover .t3 { font-size: 11pt; color: #BFDBFE; margin-top: 4mm; line-height: 1.45; max-width: 160mm; }
.cover table { font-size: 8.4pt; margin: 0; } .cover td { border: 0; border-bottom: 0.5pt solid #E4E7EC; padding: 1.1mm 1.5mm; background: #fff !important; }
.cover td:first-child { color: #5C677D; width: 40mm; font-weight: 600; }
.cover .motif { position: absolute; right: 0; top: 0; width: 210mm; height: 201mm; opacity: 0.95; }
.cover .status { display: inline-block; margin-top: 7mm; padding: 1.5mm 3mm; border: 1pt solid #FDA29B; color: #FEE4E2; font-size: 9.5pt; font-weight: 700; letter-spacing: 0.04em; }
.cover .labels { margin-top: 5mm; font-size: 8.5pt; color: #A5F3FC; letter-spacing: 0.06em; }
.toc { font-size: 9.6pt; }
.toc .row { display: flex; align-items: baseline; margin: 0.6mm 0; break-inside: avoid; }
.toc .row .t { flex: 0 1 auto; } .toc .row .dots { flex: 1 1 auto; border-bottom: 0.8pt dotted #98A2B3; margin: 0 1.5mm; transform: translateY(-1mm); }
.toc .row .n { flex: 0 0 auto; min-width: 7mm; text-align: right; font-variant-numeric: tabular-nums; }
.toc .l1 { font-weight: 700; color: #0B2545; margin-top: 2mm; } .toc .l2 { padding-left: 6mm; }
.pagebreak { display: none; }
.marker { font-size: 2px; color: #fff; }
`;

function coverHtml() {
  // Layered-pavement motif with a dual-tyre load and two strain probes (asphalt bottom, subgrade top).
  const layers = [['#13315C', 54], ['#1B4472', 70], ['#24557F', 110]];
  let y = 150, motif = '';
  for (const [c, h] of layers) { motif += `<rect x="0" y="${y}" width="794" height="${h}" fill="${c}"/>`; y += h; }
  for (const x of [560, 640]) {
    motif += `<path d="M${x} 60 L${x} 136" stroke="#67E8F9" stroke-width="5"/><path d="M${x - 13} 124 L${x} 146 L${x + 13} 124 z" fill="#67E8F9"/>`;
    for (let k = 1; k <= 4; k++) motif += `<ellipse cx="${x}" cy="150" rx="${k * 40}" ry="${k * 34}" fill="none" stroke="#67E8F9" stroke-width="0.8" opacity="${0.45 - k * 0.08}"/>`;
  }
  motif += `<circle cx="600" cy="203" r="5" fill="#FDE68A"/><circle cx="600" cy="275" r="5" fill="#FDE68A"/>`;
  const svgMotif = `<svg class="motif" viewBox="0 0 794 760" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">${motif}<rect x="0" y="0" width="794" height="760" fill="url(#fade)"/><defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#0B2545" stop-opacity="0.97"/><stop offset="0.55" stop-color="#0B2545" stop-opacity="0.72"/><stop offset="1" stop-color="#0B2545" stop-opacity="0.12"/></linearGradient></defs></svg>`;
  const rows = [
    ['Document ID', META.id], ['Version / date', `${META.version} · ${META.date}`], ['Repository commit', `<code>${META.commit}</code>`],
    ['Branch', `<code>${META.branch}</code> (working tree with another session's uncommitted changes, preserved)`], ['Status', META.status],
    ['Specification', 'PAVEMENT-PINN v3 Dokumen Induk v3.0 (15 Oct 2026, 65 pp.) and AGENTS.md'],
    ['Reference code', 'pavement_pinn_v3_code.zip — inspected in isolation, not executed'],
    ['Previous audit', 'PAVEMENT-PINN-AUDIT-001 v1.0 (14 Oct 2026)'],
    ['Classification', 'Internal engineering document of the project team; not approved by Intel or any agency']
  ];
  return `<section class="cover">${svgMotif}<div class="inner"><div class="kicker">Forensic audit · v3 comparison · development baseline</div><span class="t1">PAVEMENT-PINN v3</span>
<div class="t2">Consolidated Forensic Audit, Reference-Code Comparison &amp; Development Baseline</div>
<div class="t3">Revalidation of AUDIT-001, traceability to the v3 specification, independent assessment of the reference implementation, and a gated roadmap for the next development phases.</div>
<div class="status">NOT v3-COMPLIANT — 19 OPEN P0 ITEMS — PHASE 0 RECOMMENDED</div>
<div class="labels">AS-IS IMPLEMENTATION · V3 SPECIFICATION · REFERENCE ZIP · VERIFIED FINDING · PROPOSED TARGET STATE</div></div>
<div class="band"><table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table></div></section>`;
}

function buildHtml(pages) {
  const ctx = { headings: [], figures: [], tables: [], equations: [] };
  const bodyHtml = render(body, ctx, figureLoader);
  const pg = (id) => (pages && pages[id] ? String(pages[id]) : '··');
  const tocRows = ctx.headings.filter((h) => h.level <= 2).map((h) => `<div class="row l${h.level}"><span class="t">${inline(h.text)}</span><span class="dots"></span><span class="n">${pg(h.id)}</span></div>`).join('');
  const lof = ctx.figures.map((f) => `<div class="row l2"><span class="t">${inline(f.caption.split(' — ')[0])} — ${inline(f.caption.split(' — ').slice(1).join(' — ').split('. ')[0])}</span><span class="dots"></span><span class="n">${pg(f.id)}</span></div>`).join('');
  const lot = ctx.tables.map((t) => `<div class="row l2"><span class="t">${inline(t.caption)}</span><span class="dots"></span><span class="n">${pg(t.id)}</span></div>`).join('');
  const seen = new Set();
  const loe = ctx.equations.filter((e) => e.id && !seen.has(e.id) && seen.add(e.id)).sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)))
    .map((e) => `<div class="row l2"><span class="t">${e.id} — ${inline((e.caption || '').split('(')[0].replace(/\.$/, ''))}</span><span class="dots"></span><span class="n">${pg('eq:' + e.id)}</span></div>`).join('');
  const front = `<div class="front"><h1 id="toc">Table of Contents</h1><div class="toc">${tocRows}</div>
<h1 id="lof">List of Figures and Equations</h1><div class="toc">${lof}</div><div class="toc" style="margin-top:5mm">${loe}</div>
<h1 id="lot">List of Tables</h1><div class="toc">${lot}</div></div>`;
  const bodyMarked = pages ? bodyHtml : bodyHtml.replace('Document Control</h1>', 'Document Control<span class="marker">ZZBODYSTARTZZ</span></h1>');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PAVEMENT-PINN v3 Consolidated Audit Baseline</title>
<meta name="description" content="${META.id} v${META.version}">
<style>${CSS}</style></head><body>${coverHtml()}${front}${bodyMarked}</body></html>`;
  return { html, ctx };
}

// ------------------------------------------------------------------ 4. print + page mapping
const tmp = mkdtempSync(path.join(tmpdir(), 'ppinn-v3-'));
function printPdf(html, outPdf) {
  const htmlPath = path.join(root, '_build', 'report.html');
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(tmp, 'profile')}`,
    '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=15000', `--print-to-pdf=${outPdf}`, pathToFileURL(htmlPath).href], { stdio: 'pipe' });
  return outPdf;
}
function pageTexts(pdf) {
  const txt = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
  const pages = txt.split('\f');
  if (pages[pages.length - 1].trim() === '') pages.pop();
  return pages;
}
const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/`/g, '').replace(/\*\*/g, '').replace(/\[([A-Za-z0-9_/ -]+)\]/g, '$1').replace(/\$[^$]*\$/g, '').replace(/&amp;/g, '&').replace(/\s+/g, '').toLowerCase();
function mapPages(pages, ctx) {
  const start = pages.findIndex((p) => p.includes('ZZBODYSTARTZZ'));
  if (start < 0) throw new Error('body marker not found');
  const flat = pages.map((p) => norm(p));
  const find = (needle, from = start) => { const n = norm(needle).slice(0, 70); for (let i = from; i < flat.length; i++) if (flat[i].includes(n)) return i + 1; return null; };
  const map = {};
  let cursor = start;
  for (const h of ctx.headings.filter((x) => x.level <= 2)) {
    const p = find(h.text, cursor);
    if (p) { map[h.id] = p; cursor = p - 1; }
  }
  for (const f of ctx.figures) map[f.id] = find(f.caption.split(' — ')[0] + ' — ');
  for (const t of ctx.tables) map[t.id] = find(t.caption.split(' — ')[0] + ' — ');
  for (const e of ctx.equations) if (e.id && !map['eq:' + e.id]) map['eq:' + e.id] = find(`(${e.id})`);
  return { map };
}

const pass1 = buildHtml(null);
const pages1 = pageTexts(printPdf(pass1.html, path.join(tmp, 'pass1.pdf')));
const { map } = mapPages(pages1, pass1.ctx);
const missing = [...pass1.ctx.headings.filter((h) => h.level <= 2).map((h) => h.id), ...pass1.ctx.figures.map((f) => f.id), ...pass1.ctx.tables.map((t) => t.id)].filter((id) => !map[id]);
const finalPdf = path.join(root, `${NAME}.pdf`);
const pass2 = buildHtml(map);
printPdf(pass2.html, finalPdf);
const pages2 = pageTexts(finalPdf);

// ------------------------------------------------------------------ 5. QA checks
const qa = [];
const check = (name, ok, detail = '') => qa.push({ name, ok: !!ok, detail });
check('page count stable between passes', pages1.length === pages2.length, `${pages1.length} vs ${pages2.length}`);
const tocMismatch = (() => {
  const flat = pages2.map(norm);
  return pass2.ctx.headings.filter((x) => x.level <= 2).filter((h) => { const p = map[h.id]; return !p || !flat[p - 1].includes(norm(h.text).slice(0, 70)); }).map((h) => h.text);
})();
check('every TOC, figure and table entry resolved to a page', missing.length === 0, missing.join(', '));
check('TOC page numbers match final PDF headings', tocMismatch.length === 0, tocMismatch.slice(0, 5).join(' | '));
const all = pages2.join('\n');
for (let i = 0; i <= 12; i++) check(`present: Chapter ${i} —`, all.includes(`Chapter ${i} —`));
for (const ap of 'ABCDEFGHIJ'.split('')) check(`present: Appendix ${ap} —`, all.includes(`Appendix ${ap} —`));
check('no raw LaTeX commands in HTML', !/<mtext>\\/.test(pass2.html), (pass2.html.match(/<mtext>\\[a-z]+/gi) || []).join(' '));
check('no leftover placeholder page numbers', !pass2.html.includes('>··<'));
check('no "undefined" text in PDF', !/\bundefined\b/.test(all));
check('no TODO/TBD/lorem placeholders', !/\b(TODO|TBD|lorem ipsum|XXX)\b/i.test(all));
// consistency: findings counts in the register vs the summary tables
const reg = read('PAVEMENT_PINN_v3_Findings_Register.md');
const newRows = [...reg.matchAll(/^\| (F-\d+) \| \[(P\d)\] \|/gm)].map((m) => ({ id: m[1], sev: m[2] })).filter((r) => Number(r.id.slice(2)) >= 32);
const cnt = (s) => newRows.filter((r) => r.sev === s).length;
check('new findings F-32..F-51: 20 rows, 1/6/10/3 by severity', newRows.length === 20 && cnt('P0') === 1 && cnt('P1') === 6 && cnt('P2') === 10 && cnt('P3') === 3, `n=${newRows.length} P0=${cnt('P0')} P1=${cnt('P1')} P2=${cnt('P2')} P3=${cnt('P3')}`);
check('new finding IDs unique and contiguous', new Set(newRows.map((r) => r.id)).size === 20 && newRows.every((r) => { const n = Number(r.id.slice(2)); return n >= 32 && n <= 51; }));
const cross = read('PAVEMENT_PINN_v3_Previous_Audit_Crosswalk.md');
const crossRows = [...cross.matchAll(/^\| (F-\d\d) \| .*\| \[(CONFIRMED_OPEN|SUPERSEDED_BY_V3|PARTIALLY_RESOLVED|BLOCKED)\]/gm)].map((m) => m[2]);
const cc = (s) => crossRows.filter((x) => x === s).length;
check('crosswalk: 31 findings, 22/7/1/1', crossRows.length === 31 && cc('CONFIRMED_OPEN') === 22 && cc('SUPERSEDED_BY_V3') === 7 && cc('PARTIALLY_RESOLVED') === 1 && cc('BLOCKED') === 1, `n=${crossRows.length} open=${cc('CONFIRMED_OPEN')} sup=${cc('SUPERSEDED_BY_V3')} part=${cc('PARTIALLY_RESOLVED')} blk=${cc('BLOCKED')}`);
const road = read('PAVEMENT_PINN_v3_Development_Roadmap.md');
const tasks = [...road.matchAll(/^\| (R\d-\d\d) \|/gm)].map((m) => m[1]);
check('roadmap: 52 unique tasks', tasks.length === 52 && new Set(tasks).size === 52, `${tasks.length}`);
const referenced = new Set([...masterMd.matchAll(/\bR\d-\d\d\b/g)].map((m) => m[0]));
const undefinedTasks = [...referenced].filter((t) => !tasks.includes(t));
check('every referenced roadmap task is defined', undefinedTasks.length === 0, undefinedTasks.join(', '));
const findingIds = new Set([...[...Array(51)].map((_, i) => `F-${String(i + 1).padStart(2, '0')}`)]);
const badF = [...new Set([...masterMd.matchAll(/\bF-(\d{2})\b/g)].map((m) => `F-${m[1]}`))].filter((f) => !findingIds.has(f));
check('every referenced finding ID exists (F-01..F-51)', badF.length === 0, badF.join(', '));
const ev = figs.__evidence;
check('reference strains in text match evidence log', masterMd.includes('303.12') && masterMd.includes('792.67') && Math.abs(ev.a.reference.et - 303.12) < 0.01 && Math.abs(ev.a.reference.ev - 792.67) < 0.01);
check('8.16 t strains in text match evidence log', masterMd.includes('273.74') && masterMd.includes('662.99') && Math.abs(ev.b.isolated_816t.et - 273.74) < 0.01);
check('sign-check counts in text match evidence log', ev.a.direction_check.et.E1.pos === 4 && ev.a.direction_check.ev.E2.pos === 13 && masterMd.includes('4/54') && masterMd.includes('13/54'));
check('knapsack figures match evidence log', ev.b.knapsack.dp_ge_greedy === 1000 && ev.b.knapsack.dp_strictly_better === 607 && masterMd.includes('607'));
check('no secret-like strings', !/(AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,})/.test(masterMd + pass2.html));
const msHits = [...masterMd.matchAll(/[~<]?\s?\d+(?:\.\d+)?\s?ms\b/g)].map((m) => m[0].replace(/\s/g, ''));
check('only quoted prohibited or unverified latency figures appear (no measured ms value)', msHits.every((h) => ['<10ms', '8.4ms', '~13ms'].includes(h)), [...new Set(msHits)].join(' '));
const raw = readFileSync(finalPdf).toString('latin1');
const boxes = [...raw.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((m) => `${Math.round(m[1])}x${Math.round(m[2])}`);
const sizes = boxes.reduce((a, b) => ((a[b] = (a[b] || 0) + 1), a), {});
check('A4 portrait and landscape pages only', Object.keys(sizes).every((k) => k === '595x842' || k === '842x595'), JSON.stringify(sizes));
const emptyPages = pages2.map((p, i) => [i + 1, p.replace(/PAVEMENT-PINN v3 — Consolidated Audit Baseline|Internal engineering document|PAVEMENT-PINN-V3-BASELINE-001.*|Page \d+ of \d+/g, '').trim().length]).filter(([, n]) => n < 40);
check('no blank pages', emptyPages.length === 0, emptyPages.map(([p]) => p).join(', '));
const overflow = await overflowCheck(CHROME, path.join(root, '_build', 'report.html'));
check('no horizontal overflow (no clipping, no shrink-to-fit)', overflow.length === 0, overflow.slice(0, 6).join(' | '));

const result = { pages: pages2.length, pageSizes: sizes, figures: pass2.ctx.figures.length, tables: pass2.ctx.tables.length, equations: new Set(pass2.ctx.equations.map((e) => e.id)).size, headingsInToc: pass2.ctx.headings.filter((h) => h.level <= 2).length, qa };
writeFileSync(path.join(root, '_build', 'qa-result.json'), JSON.stringify({ ...result, pageMap: map }, null, 1));
rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ pages: result.pages, pageSizes: sizes, figures: result.figures, tables: result.tables, equations: result.equations, toc: result.headingsInToc }));
for (const c of qa) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  [' + c.detail + ']' : ''}`);
process.exit(qa.every((c) => c.ok) ? 0 : 1);
