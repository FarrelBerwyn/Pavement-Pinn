// Shared HTML helpers for the Dokumen Induk v3.1 build.
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inline markup: `code`, **bold**, [[STATUS]] badge.
export const md = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[\[([A-Z0-9 _-]+)\]\]/g, (_, k) => badge(k));

const BADGE = {
  TERBUKTI: 'ok', 'TERVERIFIKASI': 'ok', 'TERVERIFIKASI PRIMER': 'ok', ADA: 'ok', SELESAI: 'ok', DIUJI: 'ok', PASS: 'ok',
  TARGET: 'warn', SEBAGIAN: 'warn', 'TERVERIFIKASI SEKUNDER': 'warn', 'BELUM DIUJI': 'warn', 'PASS WITH MODIFICATION': 'warn', 'PERLU CEK': 'warn',
  RENCANA: 'muted', OPSIONAL: 'muted', 'ADD-ON': 'muted', 'NOT VERIFIED': 'muted',
  DILARANG: 'bad', BELUM: 'bad', 'BELUM ADA': 'bad', 'NOT YET': 'bad', 'NEED MODIFICATION': 'bad', 'TIDAK TERVERIFIKASI': 'bad', BLOKER: 'bad',
  'CONTOH DOKUMEN': 'ex', WAJIB: 'p0', P0: 'p0', P1: 'p1', P2: 'p2', NANTI: 'p1', BARU: 'new', DIUBAH: 'new', DIHAPUS: 'bad',
};
export const badge = (k) => `<span class="b b-${BADGE[k] || 'muted'}">${esc(k)}</span>`;

export const T = (head, rows, { cls = '', widths } = {}) =>
  `<table class="${cls}">${widths ? `<colgroup>${widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : ''}<thead><tr>${head
    .map((h) => `<th>${md(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => (r.__raw ? r.__raw : `<tr>${r.map((c) => `<td>${typeof c === 'object' && c && c.html ? c.html : md(c)}</td>`).join('')}</tr>`))
    .join('')}</tbody></table>`;

export const KV = (rows, cls = '') => `<table class="kv ${cls}"><tbody>${rows.map(([k, v]) => `<tr><th>${md(k)}</th><td>${typeof v === 'object' && v.html ? v.html : md(v)}</td></tr>`).join('')}</tbody></table>`;
export const P = (...ps) => ps.map((p) => `<p>${md(p)}</p>`).join('');
export const UL = (items) => `<ul>${items.map((i) => `<li>${md(i)}</li>`).join('')}</ul>`;
export const OL = (items) => `<ol>${items.map((i) => `<li>${md(i)}</li>`).join('')}</ol>`;
export const note = (title, body, kind = '') => `<div class="note ${kind}">${title ? `<div class="nt">${md(title)}</div>` : ''}${body}</div>`;
export const H1 = (id, t) => `<h1 id="${id}" class="sec" data-toc="${esc(t).replace(/"/g, "&quot;")}">${esc(t)}</h1>`;
export const H2 = (id, t) => `<h2 id="${id}" data-toc="${esc(t).replace(/"/g, "&quot;")}">${esc(t)}</h2>`;
export const H3 = (t) => `<h3>${md(t)}</h3>`;
export const pre = (s) => `<pre>${esc(s)}</pre>`;
export const raw = (html) => ({ html });
