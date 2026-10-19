// Builds docs/v3/PAVEMENT-PINN_v3.1_Dokumen_Induk.pdf (A4, Chrome headless, 2-pass TOC, page stamps).
// Usage:  DEPS=<folder whose node_modules has pdfjs-dist@4 and pdf-lib@1.17> node build.mjs
import { writeFileSync, existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { esc } from './parts/h.mjs';
import { cover, changelog, sec0, sec1 } from './parts/p0.mjs';
import { sec2, sec3 } from './parts/p2.mjs';
import { sec4 } from './parts/p4.mjs';
import { sec5, sec6 } from './parts/p5.mjs';
import { sec7, sec8 } from './parts/p7.mjs';
import { sec9, sec10, sec11 } from './parts/p9.mjs';
import { sec12, sec13 } from './parts/p12.mjs';
import { appA, appB, appC, appD, appE } from './parts/app.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '..', 'PAVEMENT-PINN_v3.1_Dokumen_Induk.pdf');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!process.env.DEPS) throw new Error('Set DEPS to a folder with node_modules/pdfjs-dist and node_modules/pdf-lib');
const req = createRequire(path.join(process.env.DEPS, 'noop.js'));
const pdfjs = await import(pathToFileURL(req.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
const { PDFDocument, StandardFonts, rgb } = req('pdf-lib');

const css = readFileSync(path.join(here, 'style.css'), 'utf8');
const body = [changelog, sec0, sec1, sec2, sec3, sec4, sec5, sec6, sec7, sec8, sec9, sec10, sec11, sec12, sec13, appA, appB, appC, appD, appE].join('\n');

// TOC entries from data-toc attributes (h1 = level 1, h2 = level 2)
const entries = [...body.matchAll(/<(h1|h2) id="([^"]+)"[^>]*data-toc="([^"]+)"/g)].map((m) => ({ lvl: m[1] === 'h1' ? 1 : 2, id: m[2], text: m[3].replace(/&quot;/g, '"') }));

function tocHtml(pages) {
  return `<div class="toc"><h1 class="toch">Daftar Isi</h1>${entries.map((e) => `<div class="te l${e.lvl}"><a href="#${e.id}">${e.text}</a><span class="dots"></span><span class="pg">${pages?.[e.id] ?? '00'}</span></div>`).join('')}</div>`;
}
const page = (pages) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>PAVEMENT-PINN v3.1 — Dokumen Induk</title><style>${css}</style></head><body>${cover}${tocHtml(pages)}${body}</body></html>`;

function print(html, out) {
  const tmp = mkdtempSync(path.join(tmpdir(), 'pp31-'));
  try {
    const h = path.join(tmp, 'doc.html');
    writeFileSync(h, html);
    writeFileSync(path.join(here, 'report.html'), html);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(tmp, 'p')}`,
      '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=15000', `--print-to-pdf=${out}`, pathToFileURL(h).href], { stdio: 'pipe' });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
async function pageTexts(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)) }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) out.push((await (await doc.getPage(i)).getTextContent()).items.map((it) => it.str).join(''));
  return out;
}
const norm = (s) => s.replace(/&amp;/g, '&').replace(/\s+/g, '').toLowerCase();

// pass 1 → locate headings → pass 2
const tmpPdf = OUT.replace(/\.pdf$/, '.pass1.pdf');
print(page(null), tmpPdf);
let texts = await pageTexts(tmpPdf);
const tocEnd = texts.findIndex((t, i) => i > 1 && norm(t).includes(norm(entries[0].text)) && !norm(t).includes('daftarisi'));
const pages = {};
let cursor = Math.max(tocEnd, 2);
for (const e of entries) {
  const n = norm(e.text);
  let found = -1;
  for (let i = cursor; i < texts.length; i++) if (norm(texts[i]).includes(n)) { found = i; break; }
  if (found < 0) throw new Error(`heading not found: ${e.text}`);
  pages[e.id] = found + 1; cursor = found;
}
print(page(pages), tmpPdf);
texts = await pageTexts(tmpPdf);
// verify page numbers did not shift
for (const e of entries) if (!norm(texts[pages[e.id] - 1]).includes(norm(e.text))) throw new Error(`TOC page drift: ${e.text}`);

// stamp header/footer
const pdf = await PDFDocument.load(readFileSync(tmpPdf));
const font = await pdf.embedFont(StandardFonts.Helvetica);
const N = pdf.getPageCount();
pdf.getPages().forEach((p, i) => {
  if (i === 0) return;
  const { width } = p.getSize();
  const left = 'PAVEMENT-PINN v3.1 · Dokumen Induk Developer & Pitch · Intel AI Global Impact Festival 2026';
  const right = `Halaman ${i + 1} / ${N}`;
  p.drawText(left, { x: 38, y: 20, size: 7, font, color: rgb(0.42, 0.45, 0.52) });
  p.drawText(right, { x: width - 38 - font.widthOfTextAtSize(right, 7), y: 20, size: 7, font, color: rgb(0.42, 0.45, 0.52) });
});
pdf.setTitle('PAVEMENT-PINN v3.1 — Dokumen Induk');
pdf.setAuthor('Tim PAVEMENT-PINN');
pdf.setSubject('Spesifikasi, roadmap, pemetaan rubrik 90 poin, persiapan wawancara Stage 3');
writeFileSync(OUT, await pdf.save());
rmSync(tmpPdf, { force: true });
console.log(JSON.stringify({ out: OUT, pages: N, headings: entries.length }));
