// Minimal Markdown + LaTeX-subset renderer for the audit report (no external dependencies).
// Supports exactly what the report sources use: headings, paragraphs, GFM pipe tables,
// flat lists, fenced code, ```math blocks, blockquote callouts, inline bold/italic/code,
// $inline math$, links, status badges written as [VERIFIED], [P0] etc., figure images and
// page-control comments. Anything outside that subset is escaped and shown literally.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ------------------------------------------------------------------ LaTeX subset → MathML
const SYM = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ϵ', varepsilon: 'ε', lambda: 'λ', mu: 'μ', nu: 'ν',
  pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', theta: 'θ', phi: 'φ', varphi: 'φ', omega: 'ω', chi: 'χ', zeta: 'ζ', xi: 'ξ',
  nabla: '∇', partial: '∂', infty: '∞', cdot: '⋅', times: '×', approx: '≈', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠',
  propto: '∝', to: '→', rightarrow: '→', sum: '∑', int: '∫', pm: '±', mid: '|', ldots: '…', colon: ':'
};
const BOLD = { sigma: '𝛔', varepsilon: '𝛆', epsilon: '𝛜', b: '𝐛', u: '𝐮', C: '𝐂', x: '𝐱', n: '𝐧' };
const SCRIPT = { L: 'ℒ', N: '𝒩' };
const FUNCS = new Set(['max', 'min', 'exp', 'ln', 'log', 'round', 'sin', 'cos']);
const OPS = new Set(['+', '-', '=', '(', ')', '[', ']', ',', ':', '/', '<', '>', '|', '!', '−', '·']);

function tokenize(src) {
  const t = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([A-Za-z]+|.)/.exec(src.slice(i));
      t.push({ k: 'cmd', v: m[1] });
      i += m[0].length;
    } else if (/\s/.test(c)) i++;
    else if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+|^[0-9]+/.exec(src.slice(i));
      t.push({ k: 'num', v: m[0] });
      i += m[0].length;
    } else { t.push({ k: 'ch', v: c }); i++; }
  }
  return t;
}

function parseLatex(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const group = () => {
    // a {...} group or a single atom
    if (peek() && peek().k === 'ch' && peek().v === '{') {
      p++;
      const inner = seq('}');
      p++; // }
      return inner.length === 1 ? inner[0] : `<mrow>${inner.join('')}</mrow>`;
    }
    return atom();
  };
  const rawGroup = () => {
    // returns raw text of a {...} group
    if (!(peek() && peek().v === '{')) return peek() ? toks[p++].v : '';
    p++;
    let s = '';
    let depth = 1;
    while (p < toks.length) {
      const tk = toks[p++];
      if (tk.v === '{') depth++;
      if (tk.v === '}' && --depth === 0) break;
      s += tk.k === 'cmd' ? (SYM[tk.v] ?? (tk.v === ' ' || tk.v === ',' ? ' ' : tk.v)) : tk.v;
    }
    return s;
  };
  function atom() {
    const tk = toks[p++];
    if (!tk) return '';
    if (tk.k === 'num') return `<mn>${tk.v}</mn>`;
    if (tk.k === 'ch') {
      if (/[A-Za-z]/.test(tk.v)) return `<mi>${tk.v}</mi>`;
      if (OPS.has(tk.v)) return `<mo>${esc(tk.v === '-' ? '−' : tk.v)}</mo>`;
      return `<mo>${esc(tk.v)}</mo>`;
    }
    const c = tk.v;
    if (c === 'frac') { const a = group(); const b = group(); return `<mfrac>${a}${b}</mfrac>`; }
    if (c === 'sqrt') return `<msqrt>${group()}</msqrt>`;
    if (c === 'mathrm' || c === 'text' || c === 'operatorname') return `<mtext>${esc(rawGroup())}</mtext>`;
    if (c === 'mathcal') { const s = rawGroup(); return `<mi>${[...s].map((x) => SCRIPT[x] ?? x).join('')}</mi>`; }
    if (c === 'boldsymbol' || c === 'mathbf') { const s = rawGroup(); return `<mi>${BOLD[s] ?? s}</mi>`; }
    if (c === 'mathsf') { const s = rawGroup(); return `<mi>${s === 'C' ? '𝖢' : s}</mi>`; }
    if (c === 'left' || c === 'right') { const d = toks[p++]; return `<mo stretchy="true">${esc(d.k === 'cmd' ? (d.v === '{' ? '{' : d.v === '}' ? '}' : d.v === '|' ? '‖' : '') : d.v === '.' ? '' : d.v)}</mo>`; }
    if (c === 'quad') return '<mspace width="1em"/>';
    if (c === ',' || c === ' ') return '<mspace width="0.2em"/>';
    if (c === '{' || c === '}') return `<mo>${c}</mo>`;
    if (FUNCS.has(c)) return `<mi>${c}</mi>`;
    if (SYM[c]) {
      const s = SYM[c];
      return /[α-ωϵφΔ∂∇∞]/.test(s) && !'∑∫'.includes(s) ? `<mi>${s}</mi>` : `<mo>${s}</mo>`;
    }
    return `<mtext>\\${esc(c)}</mtext>`;
  }
  function seq(stop) {
    const out = [];
    while (p < toks.length && !(stop && peek().k === 'ch' && peek().v === stop)) {
      let base = atom();
      let sub = null, sup = null;
      while (peek() && peek().k === 'ch' && (peek().v === '_' || peek().v === '^')) {
        const which = toks[p++].v;
        const g = group();
        if (which === '_') sub = g; else sup = g;
      }
      if (sub && sup) base = `<msubsup>${base}${sub}${sup}</msubsup>`;
      else if (sub) base = `<msub>${base}${sub}</msub>`;
      else if (sup) base = `<msup>${base}${sup}</msup>`;
      out.push(base);
    }
    return out;
  }
  return seq(null).join('');
}

export function latexToMathML(src, display) {
  return `<math${display ? ' display="block"' : ''}><mrow>${parseLatex(src)}</mrow></math>`;
}

// ------------------------------------------------------------------ inline Markdown
const BADGES = ['PARTIALLY VERIFIED', 'NOT IMPLEMENTED', 'NOT VERIFIED', 'VERIFIED', 'FAILED', 'BLOCKED', 'AS-IMPLEMENTED', 'BLUEPRINT REFERENCE', 'PROPOSED TARGET STATE', 'DIVERGENT', 'UNVERIFIED', 'P0', 'P1', 'P2', 'P3', 'PASS', 'CONDITIONAL PASS', 'FAIL', 'N/A', 'SIMULATED', 'PLAUSIBLE', 'CONFIRMED'];
const badgeRe = new RegExp(`\\[(${BADGES.map((b) => b.replace('/', '\\/')).join('|')})\\](?!\\()`, 'g');
const badgeClass = (b) => 'b-' + b.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function inline(text) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = text;
  s = s.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));
  s = s.replace(/\$([^$]+)\$/g, (_, m) => keep(latexToMathML(m, false)));
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => keep(`<a href="${esc(u)}">${esc(t)}</a>`));
  s = esc(s);
  s = s.replace(badgeRe, (_, b) => `<span class="badge ${badgeClass(b)}">${b}</span>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/&lt;br&gt;/g, '<br>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
  return s;
}

// ------------------------------------------------------------------ block Markdown
/** Table cells that hold only an identifier (F-01, R-P0-01, BP-3.F1a, EQ-4, T-01) must not wrap. */
const ID_CELL = /^`?[A-Z]{1,4}-[A-Za-z0-9.]+(-[A-Za-z0-9.]+)?`?$/;

export function slug(text) {
  return 'h-' + text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/**
 * Render Markdown to HTML. `ctx` collects headings, figures, tables and equations so the
 * caller can build the table of contents and the lists of figures, tables and equations.
 */
export function render(md, ctx, figureLoader) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const splitRow = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  while (i < lines.length) {
    const line = lines[i];
    if (/^<!--\s*pagebreak\s*-->/.test(line)) { out.push('<div class="pagebreak"></div>'); i++; continue; }
    if (/^<!--\s*landscape-start\s*-->/.test(line)) { out.push('<section class="landscape">'); i++; continue; }
    if (/^<!--\s*landscape-end\s*-->/.test(line)) { out.push('</section>'); i++; continue; }
    if (/^<!--/.test(line)) { while (i < lines.length && !/-->/.test(lines[i])) i++; i++; continue; }
    if (/^\s*$/.test(line)) { i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const id = slug(text);
      ctx.headings.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }
    if (/^```math/.test(line)) {
      const info = line.slice(7).trim();
      const [eqId, caption] = info.split('|').map((x) => x?.trim());
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      ctx.equations.push({ id: eqId, caption });
      // `\\` separates display lines: MathML does not line-break, so long relations are split by hand.
      const mathLines = body.join(' ').split(/\\\\/).map((l) => l.trim()).filter(Boolean);
      out.push(`<div class="equation" id="${slug(eqId || 'eq')}"><div class="eq-body">${mathLines.map((l) => latexToMathML(l, true)).join('')}</div><div class="eq-label">(${esc(eqId || '')})</div>${caption ? `<div class="eq-caption">${inline(caption)}</div>` : ''}</div>`);
      continue;
    }
    if (/^```/.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    const img = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line);
    if (img) {
      const caption = img[1];
      const num = /^(Figure [0-9.]+)/.exec(caption)?.[1] ?? '';
      const id = slug(num || caption);
      ctx.figures.push({ caption, id });
      out.push(`<figure id="${id}">${figureLoader(img[2])}<figcaption>${inline(caption)}</figcaption></figure>`);
      i++;
      continue;
    }
    if (/^Table [A-Z0-9][\w.-]* — /.test(line)) {
      const id = slug(line.split(' — ')[0]);
      ctx.tables.push({ caption: line, id });
      out.push(`<p class="table-caption" id="${id}">${inline(line)}</p>`);
      i++;
      continue;
    }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      const cls = head.length >= 6 ? ' class="wide"' : '';
      out.push(`<table${cls}><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td${ID_CELL.test(c) ? ' class="id"' : ''}>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<div class="callout">${body.map((b) => `<p>${inline(b)}</p>`).join('')}</div>`);
      continue;
    }
    if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^(\s*)([-*]|\d+\.)\s+/, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4}\s|```|\||>|!\[|<!--)/.test(lines[i]) && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
