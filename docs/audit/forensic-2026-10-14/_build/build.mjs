// Builds the audit deliverables from the Markdown sources in this folder:
//   PAVEMENT_PINN_Forensic_Technical_Audit_Report.md   (assembled master source)
//   PAVEMENT_PINN_Forensic_Technical_Audit_Report.pdf  (A4, Chrome headless, 2-pass TOC)
//   figures/*.svg
// Usage (from the repository root): node docs/audit/forensic-2026-10-14/_build/build.mjs
// Requires: Google Chrome (headless), pdftotext. Writes only inside the audit folder and a
// temporary Chrome profile in the OS temp directory.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { render, inline, slug } from './md.mjs';
import { buildFigures } from './figures.mjs';
import { overflowCheck } from './overflow-check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const NAME = 'PAVEMENT_PINN_Forensic_Technical_Audit_Report';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const read = (f) => readFileSync(path.join(root, f), 'utf8');

const META = {
  id: 'PAVEMENT-PINN-AUDIT-001', version: '1.0', date: '2026-10-14', commit: '4a9b4fc49ec6e1d583648b2eaaa26293577add2e',
  branch: 'feature/m1-report-ownership', status: 'Issued for review — overall audit status: FAIL (5 open P0 findings)'
};

// ------------------------------------------------------------------ 1. assemble master Markdown
const appendices = ['PAVEMENT_PINN_Audit_Findings_Register.md', 'PAVEMENT_PINN_Mathematical_Verification_Register.md', 'PAVEMENT_PINN_Test_and_Benchmark_Evidence.md', 'PAVEMENT_PINN_Blueprint_Traceability_Matrix.md'].map(read);
const body = read('_build/report-body.md').replace('<!-- include: appendices -->', appendices.join('\n\n<!-- pagebreak -->\n\n'));
const titleBlock = `<!-- GENERATED FILE: assembled by _build/build.mjs from _build/report-body.md and the four companion registers. Edit the sources, not this file. -->

**PAVEMENT-PINN**

**Comprehensive Forensic Technical Audit Report**

*Scientific Validity, PINN Mathematics, Software Architecture, Data Integrity, and Intel Edge AI Readiness*

Physics-Informed Neural Networks for Intelligent Pavement Infrastructure Management · Intel AI Global Impact Festival 2026 — AI Changemakers

Document ID ${META.id} · Version ${META.version} · Audit date ${META.date} · Commit \`${META.commit.slice(0, 7)}\` · Branch \`${META.branch}\` · Status: ${META.status}

Reference: *Master Blueprint & Kanvas Arsitektur Lengkap PAVEMENT-PINN (Versi Final Terbaru)*. Companion files: findings register, mathematical verification register, test and benchmark evidence, blueprint traceability matrix, QA summary (same folder).
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
  @top-left { content: "PAVEMENT-PINN Technical Audit"; font: 600 8pt "Segoe UI", Arial, sans-serif; color: #0B2545; border-bottom: 0.6pt solid #9FB3C8; vertical-align: bottom; padding-bottom: 2mm; }
  @top-right { content: "Scientific and Software Verification"; font: 8pt "Segoe UI", Arial, sans-serif; color: #5C677D; border-bottom: 0.6pt solid #9FB3C8; vertical-align: bottom; padding-bottom: 2mm; }
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
h4 { font-size: 10.5pt; color: var(--blue); margin: 4mm 0 1.5mm; break-after: avoid; }
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
.b-verified, .b-pass, .b-confirmed { color: #067647; border-color: #067647; background: #ECFDF3; }
.b-partially-verified, .b-conditional-pass, .b-plausible { color: #B54708; border-color: #B54708; background: #FFFAEB; }
.b-not-implemented, .b-failed, .b-fail { color: #B42318; border-color: #B42318; background: #FEF3F2; }
.b-not-verified, .b-unverified, .b-n-a { color: #475467; border-color: #98A2B3; background: #F9FAFB; }
.b-blocked { color: #344054; border-color: #475467; background: #F2F4F7; }
.b-divergent { color: #6941C6; border-color: #6941C6; background: #F4F3FF; }
.b-simulated { color: #9E5A00; border-color: #9E5A00; background: #FEF6EE; }
.b-as-implemented, .b-blueprint-reference, .b-proposed-target-state { color: #0B2545; border-color: #0B2545; background: #EEF2F7; }
.b-p0 { color: #fff; background: #912018; border-color: #912018; } .b-p1 { color: #fff; background: #C4320A; border-color: #C4320A; }
.b-p2 { color: #fff; background: #B54708; border-color: #B54708; } .b-p3 { color: #fff; background: #475467; border-color: #475467; }
section.landscape { page: wide; } section.landscape table { font-size: 7.9pt; }
.cover { page: cover; height: 297mm; width: 210mm; position: relative; overflow: hidden; color: #fff; background: #0B2545; }
.cover .band { position: absolute; left: 0; right: 0; bottom: 0; height: 92mm; background: #fff; color: #1F2937; padding: 9mm 18mm; box-sizing: border-box; }
.cover .inner { position: absolute; top: 34mm; left: 18mm; right: 18mm; }
.cover .kicker { font-size: 10pt; letter-spacing: 0.24em; color: #7DD3FC; text-transform: uppercase; }
.cover h0 { display: block; font-size: 38pt; font-weight: 800; letter-spacing: 0.02em; margin: 4mm 0 2mm; }
.cover .t2 { font-size: 18pt; font-weight: 700; line-height: 1.2; }
.cover .t3 { font-size: 11.5pt; color: #BFDBFE; margin-top: 4mm; line-height: 1.4; max-width: 160mm; }
.cover .t4 { font-size: 10pt; color: #E0F2FE; margin-top: 9mm; line-height: 1.5; }
.cover table { font-size: 8.6pt; margin: 0; } .cover td { border: 0; border-bottom: 0.5pt solid #E4E7EC; padding: 1.2mm 1.5mm; background: #fff !important; }
.cover td:first-child { color: #5C677D; width: 42mm; font-weight: 600; }
.cover .motif { position: absolute; right: 0; top: 0; width: 210mm; height: 205mm; opacity: 0.95; }
.cover .status { display: inline-block; margin-top: 7mm; padding: 1.5mm 3mm; border: 1pt solid #FDA29B; color: #FEE4E2; font-size: 9.5pt; font-weight: 700; letter-spacing: 0.04em; }
.front h1 { break-before: page; }
.toc { font-size: 9.6pt; }
.toc .row { display: flex; align-items: baseline; margin: 0.6mm 0; break-inside: avoid; }
.toc .row .t { flex: 0 1 auto; } .toc .row .dots { flex: 1 1 auto; border-bottom: 0.8pt dotted #98A2B3; margin: 0 1.5mm; transform: translateY(-1mm); }
.toc .row .n { flex: 0 0 auto; min-width: 7mm; text-align: right; font-variant-numeric: tabular-nums; }
.toc .l1 { font-weight: 700; color: #0B2545; margin-top: 2mm; } .toc .l2 { padding-left: 6mm; }
.pagebreak { display: none; }
.marker { font-size: 2px; color: #fff; }
`;

function coverHtml() {
  // Abstract pavement-layer motif: layered bands with a load arrow and a dotted strain field.
  const layers = [['#13315C', 60], ['#1B4472', 46], ['#24557F', 58], ['#2E6A8E', 84]];
  let y = 100;
  let motif = '';
  for (const [c, h] of layers) { motif += `<rect x="0" y="${y}" width="794" height="${h}" fill="${c}"/>`; y += h; }
  for (let i = 0; i < 18; i++) for (let j = 0; j < 6; j++) motif += `<circle cx="${430 + i * 20}" cy="${120 + j * 46}" r="${1.4 + (6 - j) * 0.25}" fill="#7DD3FC" opacity="${0.15 + 0.1 * (6 - j) / 6}"/>`;
  motif += `<path d="M610 30 L610 92" stroke="#7DD3FC" stroke-width="5"/><path d="M596 80 L610 100 L624 80 z" fill="#7DD3FC"/>`;
  for (let k = 1; k <= 4; k++) motif += `<ellipse cx="610" cy="100" rx="${k * 46}" ry="${k * 30}" fill="none" stroke="#7DD3FC" stroke-width="0.8" opacity="${0.5 - k * 0.09}"/>`;
  const svgMotif = `<svg class="motif" viewBox="0 0 794 776" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">${motif}<rect x="0" y="0" width="794" height="776" fill="url(#fade)"/><defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#0B2545" stop-opacity="0.96"/><stop offset="0.55" stop-color="#0B2545" stop-opacity="0.7"/><stop offset="1" stop-color="#0B2545" stop-opacity="0.1"/></linearGradient></defs></svg>`;
  const rows = [
    ['Document ID', META.id], ['Version', META.version], ['Audit date', META.date], ['Repository commit', `<code>${META.commit}</code>`],
    ['Audited branch', `<code>${META.branch}</code> (working tree with another session's uncommitted changes)`], ['Report status', META.status],
    ['Reference blueprint', 'Master Blueprint &amp; Kanvas Arsitektur Lengkap PAVEMENT-PINN (Versi Final Terbaru)'],
    ['Classification', 'Internal engineering review — project team and mentors']
  ];
  return `<section class="cover">${svgMotif}<div class="inner"><div class="kicker">Forensic technical audit · Audit-only phase</div><h0>PAVEMENT-PINN</h0>
<div class="t2">Comprehensive Forensic Technical Audit Report</div>
<div class="t3">Scientific Validity, PINN Mathematics, Software Architecture, Data Integrity, and Intel Edge AI Readiness</div>
<div class="t4">Physics-Informed Neural Networks for Intelligent Pavement Infrastructure Management<br>Intel AI Global Impact Festival 2026 — AI Changemakers</div>
<div class="status">OVERALL AUDIT STATUS: FAIL — 5 OPEN P0 FINDINGS</div></div>
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
<h1 id="lof">List of Figures</h1><div class="toc">${lof}</div>
<h1 id="lot">List of Tables</h1><div class="toc">${lot}</div>
<h1 id="loe">List of Equations</h1><div class="toc">${loe}</div></div>`;
  const bodyMarked = pages ? bodyHtml : bodyHtml.replace('Document Control</h1>', 'Document Control<span class="marker">ZZBODYSTARTZZ</span></h1>');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PAVEMENT-PINN Forensic Technical Audit Report</title>
<meta name="author" content="Audit session for the PAVEMENT-PINN repository owner"><meta name="description" content="${META.id} v${META.version}">
<style>${CSS}</style></head><body>${coverHtml()}${front}${bodyMarked}</body></html>`;
  return { html, ctx };
}

// ------------------------------------------------------------------ 4. print + page mapping
const tmp = mkdtempSync(path.join(tmpdir(), 'ppinn-audit-'));
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
const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/`/g, '').replace(/\*\*/g, '').replace(/\[([A-Z0-9/ -]+)\]/g, '$1').replace(/\$[^$]*\$/g, '').replace(/&amp;/g, '&').replace(/\s+/g, '').toLowerCase();
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
  return { map, start };
}

const pdf1 = path.join(tmp, 'pass1.pdf');
const pass1 = buildHtml(null);
const pages1 = pageTexts(printPdf(pass1.html, pdf1));
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
// verify TOC numbers against the final PDF (shift-free because the marker has no layout)
const verify = (() => {
  const flat = pages2.map(norm);
  let bad = 0;
  for (const h of pass2.ctx.headings.filter((x) => x.level <= 2)) {
    const p = map[h.id];
    if (!p || !flat[p - 1].includes(norm(h.text).slice(0, 70))) bad++;
  }
  return bad;
})();
check('every TOC entry resolved to a page', missing.length === 0, missing.join(', '));
check('TOC page numbers match final PDF headings', verify === 0, `${verify} mismatches`);
const all = pages2.join('\n');
for (const ch of [...Array(14)].map((_, i) => `Chapter ${i + 1} —`)) check(`present: ${ch}`, all.includes(ch));
for (const ap of ['Appendix A —', 'Appendix B —', 'Appendix C —', 'Appendix D —', 'Appendix E —', 'Appendix F —', 'Appendix G —', 'Appendix H —', 'Executive Summary', 'Document Control']) check(`present: ${ap}`, all.includes(ap));
check('no raw LaTeX commands in HTML', !/<mtext>\\/.test(pass2.html), (pass2.html.match(/<mtext>\\[a-z]+/gi) || []).join(' '));
check('no leftover placeholder page numbers', !pass2.html.includes('>··<'));
check('no "undefined" text in PDF', !/undefined/.test(all));
check('no TODO/TBD/lorem placeholders', !/\b(TODO|TBD|lorem ipsum|XXX)\b/i.test(all));
const sev = figs.__severity;
const count = (s) => sev.filter((r) => r.sev === s).length;
check('findings counts 5/15/8/3', count('P0') === 5 && count('P1') === 15 && count('P2') === 8 && count('P3') === 3, ['P0', 'P1', 'P2', 'P3'].map((s) => `${s}=${count(s)}`).join(' '));
const log = read('evidence/evidence-run.log');
for (const s of ['median 0.047', 'median 0.067', 'median 0.019', 'median 0.025', 'engine et=20 ev=17 | ref2 et=435 ev=1174 | ref3 et=303 ev=793', 'ALL REFERENCE-SOLVER CHECKS PASS', 'LAYERED CONSISTENCY CHECKS PASS', 'eps_t > 200 ue: engine 3 | ref 2-layer 123 | ref 3-layer 111', 'eps_v > 350 ue: engine 0 | ref 2-layer 134 | ref 3-layer 126'])
  check(`report figures match evidence log: "${s.slice(0, 40)}"`, log.includes(s));
check('no secret-like strings', !/(AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,})/.test(masterMd + pass2.html));
// page sizes from the PDF MediaBox entries
const raw = readFileSync(finalPdf).toString('latin1');
const boxes = [...raw.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((m) => `${Math.round(m[1])}x${Math.round(m[2])}`);
const sizes = boxes.reduce((a, b) => ((a[b] = (a[b] || 0) + 1), a), {});
check('A4 portrait and landscape pages only', Object.keys(sizes).every((k) => k === '595x842' || k === '842x595'), JSON.stringify(sizes));
const emptyPages = pages2.map((p, i) => [i + 1, p.replace(/PAVEMENT-PINN Technical Audit|Scientific and Software Verification|PAVEMENT-PINN-AUDIT-001.*|Page \d+ of \d+/g, '').trim().length]).filter(([, n]) => n < 40);
check('no blank pages', emptyPages.length === 0, emptyPages.map(([p]) => p).join(', '));

const overflow = await overflowCheck(CHROME, path.join(root, '_build', 'report.html'));
check('no horizontal overflow (no clipping, no shrink-to-fit)', overflow.length === 0, overflow.slice(0, 6).join(' | '));

const result = { pages: pages2.length, pageSizes: sizes, figures: pass2.ctx.figures.length, tables: pass2.ctx.tables.length, equations: new Set(pass2.ctx.equations.map((e) => e.id)).size, headingsInToc: pass2.ctx.headings.filter((h) => h.level <= 2).length, qa };
writeFileSync(path.join(root, '_build', 'qa-result.json'), JSON.stringify({ ...result, pageMap: map }, null, 1));
rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ pages: result.pages, pageSizes: sizes, figures: result.figures, tables: result.tables, equations: result.equations, toc: result.headingsInToc }, null, 0));
for (const c of qa) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  [' + c.detail + ']' : ''}`);
process.exit(qa.every((c) => c.ok) ? 0 : 1);
