// Vector figures for the audit report. Charts are computed from evidence/compare-grid.json and
// from the findings register; diagrams encode the statuses established in the report text.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const C = {
  navy: '#0B2545', blue: '#13315C', cyan: '#0E7490', ink: '#1F2937', grey: '#5C677D', light: '#EEF2F7', line: '#CBD5E1',
  verified: '#067647', partial: '#B54708', notimpl: '#B42318', failed: '#912018', divergent: '#6941C6', blocked: '#475467', simulated: '#9E5A00', notver: '#667085',
  p0: '#912018', p1: '#C4320A', p2: '#B54708', p3: '#475467'
};
const STATUS = {
  VERIFIED: [C.verified, '#ECFDF3'], PARTIAL: [C.partial, '#FFFAEB'], 'NOT IMPLEMENTED': [C.notimpl, '#FEF3F2'], FAILED: [C.failed, '#FEE4E2'],
  DIVERGENT: [C.divergent, '#F4F3FF'], BLOCKED: [C.blocked, '#F2F4F7'], SIMULATED: [C.simulated, '#FEF6EE'], 'NOT VERIFIED': [C.notver, '#F9FAFB']
};
const FONT = `font-family="Segoe UI, Arial, sans-serif"`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${FONT} role="img">${body}</svg>`;
const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size ?? 11}" fill="${o.fill ?? C.ink}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''} ${o.weight ? `font-weight="${o.weight}"` : ''} ${o.italic ? 'font-style="italic"' : ''}>${esc(s)}</text>`;
const tag = (label, x = 8, y = 8) => {
  const w = label.length * 6.4 + 14;
  return `<rect x="${x}" y="${y}" width="${w}" height="17" rx="3" fill="${C.navy}"/>${text(x + 7, y + 12.5, label, { size: 9.5, fill: '#fff', weight: 600 })}`;
};
function wrap(s, max) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
function box(x, y, w, h, label, status, o = {}) {
  const [stroke, fill] = STATUS[status] ?? [C.blue, '#fff'];
  const lines = wrap(label, o.wrap ?? Math.floor(w / 6.2));
  const ty = y + h / 2 - ((lines.length - 1) * 12) / 2 + 3 - (o.badge === false ? 0 : 6);
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.4" ${o.dashed ? 'stroke-dasharray="5 3"' : ''}/>`;
  lines.forEach((l, i) => { s += text(x + w / 2, ty + i * 12, l, { size: o.size ?? 10.5, anchor: 'middle', weight: o.weight }); });
  if (o.badge !== false && status) s += text(x + w / 2, y + h - 7, status, { size: 8.5, anchor: 'middle', fill: stroke, weight: 700 });
  return s;
}
const arrow = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.color ?? C.grey}" stroke-width="1.3" ${o.dashed ? 'stroke-dasharray="4 3"' : ''} marker-end="url(#ah)"/>`;
const defs = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.grey}"/></marker></defs>`;
function legend(x, y, keys) {
  let s = '';
  let cx = x;
  for (const k of keys) {
    const [stroke, fill] = STATUS[k];
    s += `<rect x="${cx}" y="${y}" width="12" height="12" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>` + text(cx + 16, y + 10, k, { size: 9.5 });
    cx += 22 + k.length * 6.1;
  }
  return s;
}

export function buildFigures(root) {
  mkdirSync(`${root}/figures`, { recursive: true });
  const out = {};
  const save = (name, content) => { writeFileSync(`${root}/figures/${name}`, content); out[name] = content; };

  // ---------------------------------------------------------------- Fig 1.1 blueprint pipeline status
  {
    const W = 720, H = 400;
    const cols = [
      ['Fase 1 · Offline training', [['YOLOv8 training (GRDDC + local)', 'NOT IMPLEMENTED'], ['PINN training (FWD/FEM + Burmister loss)', 'NOT IMPLEMENTED'], ['ONNX → IR → NNCF', 'NOT IMPLEMENTED'], ['Auto-fill SNI baseline', 'PARTIAL']]],
      ['Fase 2 · Field acquisition', [['Citizen PWA (camera + GPS)', 'PARTIAL'], ['Weather API (BMKG)', 'SIMULATED'], ['Virtual WIM (traffic API)', 'SIMULATED']]],
      ['Fase 3 · Photo & weather → physics', [['Anti-spoofing', 'NOT IMPLEMENTED'], ['Damage class + confidence', 'NOT IMPLEMENTED'], ['Visual → E₁ penalty', 'NOT IMPLEMENTED'], ['Rain → pore pressure / CBR', 'PARTIAL']]],
      ['Fase 4 · Physics on OpenVINO', [['PINN on OpenVINO (< 10 ms)', 'NOT IMPLEMENTED'], ['εt, εv (formula engine)', 'FAILED'], ['RUL, PCI projection', 'FAILED']]],
      ['Fase 5 · Reasoning & RBAC', [['Rule engine', 'VERIFIED'], ['Local SLM (Phi-3, NPU)', 'DIVERGENT'], ['Role dashboards + workflow', 'VERIFIED']]]
    ];
    let b = defs + tag('BLUEPRINT REFERENCE · status from audit');
    const cw = 132, gap = 10, x0 = 12, y0 = 40;
    cols.forEach(([title, items], i) => {
      const x = x0 + i * (cw + gap);
      b += `<rect x="${x}" y="${y0}" width="${cw}" height="26" rx="4" fill="${C.navy}"/>`;
      wrap(title, 24).forEach((l, k) => { b += text(x + cw / 2, y0 + 11 + k * 11, l, { size: 9.5, fill: '#fff', anchor: 'middle', weight: 600 }); });
      items.forEach(([label, st], j) => { b += box(x, y0 + 36 + j * 72, cw, 62, label, st, { size: 10 }); });
      if (i < cols.length - 1) b += arrow(x + cw + 1, y0 + 13, x + cw + gap - 1, y0 + 13);
    });
    b += legend(12, H - 22, ['VERIFIED', 'PARTIAL', 'SIMULATED', 'DIVERGENT', 'FAILED', 'NOT IMPLEMENTED']);
    save('fig-1-1-blueprint-status.svg', svg(W, H, b));
  }

  // ---------------------------------------------------------------- Fig 2.1 as-implemented architecture
  {
    const W = 720, H = 430;
    let b = defs + tag('AS-IMPLEMENTED');
    b += `<rect x="12" y="34" width="300" height="350" rx="8" fill="${C.light}" stroke="${C.line}"/>` + text(24, 54, 'Browser SPA — React 19 + Vite', { size: 12, weight: 700, fill: C.navy });
    b += box(24, 66, 276, 44, 'Role pages, maps (Leaflet / MapLibre 2D), queues, What-If UI', 'VERIFIED');
    b += box(24, 118, 134, 56, 'Client copy of formula engine (legacy screens)', 'FAILED');
    b += box(166, 118, 134, 56, 'CV keyword classifier + constant confidence', 'NOT IMPLEMENTED');
    b += box(24, 182, 134, 56, 'Simulated OpenVINO benchmark & telemetry', 'SIMULATED');
    b += box(166, 182, 134, 56, 'Simulated WIM scrape + "PINN training"', 'SIMULATED');
    b += box(24, 246, 134, 56, 'Hardware detector (defaults to Intel NPU)', 'FAILED');
    b += box(166, 246, 134, 56, 'jsPDF "official" report', 'PARTIAL');
    b += box(24, 310, 276, 60, 'Offline static-host mode (GitHub Pages) runs the same engine in the browser', 'PARTIAL');
    b += `<rect x="360" y="34" width="348" height="250" rx="8" fill="${C.light}" stroke="${C.line}"/>` + text(372, 54, 'Express API (Node, tsx / esbuild bundle)', { size: 12, weight: 700, fill: C.navy });
    b += box(372, 66, 160, 62, 'Workflow routes: signed sessions, RBAC, state machine, audit', 'VERIFIED');
    b += box(540, 66, 156, 62, 'Intelligence routes: assessSegment, What-If (validated)', 'PARTIAL');
    b += box(372, 136, 160, 62, 'Legacy /api/simulate (no validation)', 'FAILED');
    b += box(540, 136, 156, 62, 'OpenVINO "IR export" (hand-written XML)', 'FAILED');
    b += box(372, 206, 160, 62, 'Evidence providers: weather, traffic, baseline (demo)', 'SIMULATED');
    b += box(540, 206, 156, 62, 'Narrative route → cloud LLM or template', 'DIVERGENT');
    b += arrow(312, 120, 358, 120);
    b += text(318, 112, 'HTTPS / JSON', { size: 9, fill: C.grey });
    b += box(372, 300, 160, 56, 'FileCaseStore (atomic JSON, DATA_DIR)', 'VERIFIED');
    b += box(540, 300, 156, 56, 'Supabase/PostGIS migration (not applied)', 'BLOCKED', { dashed: true });
    b += arrow(452, 268, 452, 298);
    b += `<rect x="360" y="368" width="348" height="52" rx="8" fill="#FEF3F2" stroke="${C.notimpl}" stroke-dasharray="5 3"/>`;
    b += text(534, 388, 'Absent: Python / FastAPI · PyTorch PINN · YOLOv8 weights ·', { size: 10, anchor: 'middle', fill: C.notimpl, weight: 600 });
    b += text(534, 403, 'ONNX / OpenVINO runtime · NNCF · datasets (FWD, FEM, WIM, CV)', { size: 10, anchor: 'middle', fill: C.notimpl, weight: 600 });
    b += legend(12, H - 20, ['VERIFIED', 'PARTIAL', 'SIMULATED', 'DIVERGENT', 'FAILED', 'BLOCKED']);
    save('fig-2-1-architecture.svg', svg(W, H + 6, b));
  }

  // ---------------------------------------------------------------- Fig 3.1 PINN identity
  {
    const rows = [
      ['Neural network u_θ (layers, activations)', false], ['Trainable parameters θ', false], ['Spatial coordinates as inputs', false],
      ['Automatic differentiation of u_θ', false], ['PDE residual at collocation points', false], ['Boundary / interface condition loss', false],
      ['Data loss vs FWD / FEM', false], ['Optimiser (Adam + L-BFGS), training loop', false], ['Training data with split', false],
      ['Checkpoint and model loader', false], ['Closed-form formulas with literal coefficients', true], ['Threshold rules (alerts, notes, overlay)', true]
    ];
    const W = 720, H = 36 + rows.length * 26 + 58;
    let b = tag('BLUEPRINT REFERENCE (BAB 5.1) vs AS-IMPLEMENTED');
    b += text(24, 50, 'Element', { size: 11, weight: 700, fill: C.navy }) + text(470, 50, 'Required for a PINN', { size: 11, weight: 700, fill: C.navy, anchor: 'middle' }) + text(620, 50, 'Present in repository', { size: 11, weight: 700, fill: C.navy, anchor: 'middle' });
    rows.forEach(([label, present], i) => {
      const y = 60 + i * 26;
      b += `<rect x="12" y="${y}" width="696" height="24" fill="${i % 2 ? '#fff' : C.light}"/>` + text(24, y + 16, label, { size: 11 });
      const req = i < 10;
      b += text(470, y + 16, req ? 'yes' : 'no', { size: 11, anchor: 'middle', fill: req ? C.navy : C.grey });
      b += `<rect x="580" y="${y + 4}" width="80" height="16" rx="3" fill="${present ? '#FFFAEB' : '#FEF3F2'}" stroke="${present ? C.partial : C.notimpl}"/>` + text(620, y + 16, present ? 'present' : 'absent', { size: 10, anchor: 'middle', fill: present ? C.partial : C.notimpl, weight: 700 });
    });
    b += text(12, H - 12, 'Classification: deterministic analytical heuristic — not a PINN, not a surrogate, not a hybrid.', { size: 11, weight: 700, fill: C.notimpl });
    save('fig-3-1-pinn-identity.svg', svg(W, H, b));
  }

  // ---------------------------------------------------------------- Fig 4.1 ratio distribution (log x)
  const grid = JSON.parse(readFileSync(`${root}/evidence/compare-grid.json`, 'utf8'));
  {
    const series = [
      ['εt, two-layer', grid.map((r) => r.eng_et / r.ref2_et)], ['εt, three-layer', grid.map((r) => r.eng_et / r.ref3_et)],
      ['εv, two-layer', grid.map((r) => r.eng_ev / r.ref2_ev)], ['εv, three-layer', grid.map((r) => r.eng_ev / r.ref3_ev)]
    ];
    const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); const i = p * (s.length - 1); const lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };
    const W = 720, H = 300, L = 150, R = 690, top = 40, rowH = 50;
    const lx = (v) => L + ((Math.log10(v) + 2.5) / 2.5) * (R - L); // 10^-2.5 .. 10^0
    let b = tag('AS-IMPLEMENTED evidence · 144 cases');
    for (const t of [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]) {
      const x = lx(t);
      b += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + rowH * 4}" stroke="${t === 1 ? C.verified : C.line}" stroke-width="${t === 1 ? 1.6 : 1}" ${t === 1 ? '' : 'stroke-dasharray="2 3"'}/>` + text(x, top + rowH * 4 + 16, String(t), { size: 10, anchor: 'middle', fill: C.grey });
    }
    b += text(lx(1) - 4, top - 6, 'agreement = 1', { size: 9.5, anchor: 'end', fill: C.verified, weight: 600 });
    series.forEach(([name, xs], i) => {
      const y = top + i * rowH + rowH / 2;
      const [mn, q1, md, q3, mx] = [0, 0.25, 0.5, 0.75, 1].map((p) => q(xs, p));
      b += text(L - 10, y + 4, name, { size: 11, anchor: 'end' });
      b += `<line x1="${lx(mn)}" y1="${y}" x2="${lx(mx)}" y2="${y}" stroke="${C.blue}" stroke-width="1.2"/>`;
      b += `<line x1="${lx(mn)}" y1="${y - 7}" x2="${lx(mn)}" y2="${y + 7}" stroke="${C.blue}"/><line x1="${lx(mx)}" y1="${y - 7}" x2="${lx(mx)}" y2="${y + 7}" stroke="${C.blue}"/>`;
      b += `<rect x="${lx(q1)}" y="${y - 12}" width="${lx(q3) - lx(q1)}" height="24" fill="#DBEAFE" stroke="${C.blue}" stroke-width="1.2"/>`;
      b += `<line x1="${lx(md)}" y1="${y - 12}" x2="${lx(md)}" y2="${y + 12}" stroke="${C.navy}" stroke-width="2.4"/>`;
      b += text(lx(md), y + 23, `median ${md.toFixed(3)}`, { size: 9.5, fill: C.grey, anchor: 'middle' });
    });
    b += text((L + R) / 2, H - 14, 'engine strain / reference strain (log scale)', { size: 11, anchor: 'middle', fill: C.grey });
    save('fig-4-1-ratio-distribution.svg', svg(W, H, b));
  }

  // ---------------------------------------------------------------- Fig B.1 blueprint point bars (log y)
  {
    // Values from evidence-run.log (blueprint default segment, 4 tyres @ 0.55 MPa)
    const data = [
      ['8.16 t', { eng: [16, 14], r2: [387, 1029], r3: [274, 663] }],
      ['10 t', { eng: [20, 17], r2: [435, 1174], r3: [303, 793] }],
      ['22.5 t', { eng: [44, 38], r2: [652, 1889], r3: [424, 1536] }]
    ];
    const W = 720, H = 300, top = 36, bot = 240, L = 60;
    const ly = (v) => bot - ((Math.log10(v) - 1) / (Math.log10(3000) - 1)) * (bot - top);
    let b = tag('AS-IMPLEMENTED evidence · AC 10 cm, 2500 MPa, CBR 6');
    for (const t of [10, 30, 100, 300, 1000, 3000]) {
      const y = ly(t);
      b += `<line x1="${L}" y1="${y}" x2="${W - 12}" y2="${y}" stroke="${C.line}" stroke-width="1" stroke-dasharray="2 3"/>` + text(L - 6, y + 4, String(t), { size: 9.5, anchor: 'end', fill: C.grey });
    }
    b += `<text transform="rotate(-90 18 ${(top + bot) / 2})" x="18" y="${(top + bot) / 2}" font-size="10" fill="${C.grey}" text-anchor="middle">µε (log scale)</text>`;
    const panels = [['εt (bottom of asphalt)', 0], ['εv (top of subgrade)', 1]];
    const colors = [[C.notimpl, 'engine'], [C.navy, 'reference 2-layer'], [C.cyan, 'reference 3-layer']];
    const pw = (W - L - 20) / 2;
    panels.forEach(([pname, k], p) => {
      const px = L + 10 + p * pw;
      b += text(px + pw / 2 - 10, bot + 34, pname, { size: 11, anchor: 'middle', weight: 600, fill: C.navy });
      data.forEach(([axle, d], g) => {
        const gx = px + g * (pw / 3) + 8;
        [d.eng, d.r2, d.r3].forEach((v, s) => {
          const x = gx + s * 26;
          const y = ly(v[k]);
          b += `<rect x="${x}" y="${y}" width="22" height="${bot - y}" fill="${colors[s][0]}" opacity="0.9"/>` + text(x + 11, y - 3, String(v[k]), { size: 8.5, anchor: 'middle' });
        });
        b += text(gx + 37, bot + 14, axle, { size: 10, anchor: 'middle', fill: C.grey });
      });
    });
    // Each strain limit applies to its own panel only (200 µε for εt, 350 µε for εv).
    panels.forEach(([, k], p) => {
      const px = L + 10 + p * pw;
      const lim = k === 0 ? 200 : 350;
      const y = ly(lim);
      b += `<line x1="${px - 4}" y1="${y}" x2="${px + pw - 22}" y2="${y}" stroke="${C.p1}" stroke-width="1.3" stroke-dasharray="6 3"/>`;
    });
    b += `<line x1="${L + 460}" y1="${H - 10}" x2="${L + 482}" y2="${H - 10}" stroke="${C.p1}" stroke-width="1.3" stroke-dasharray="6 3"/>` + text(L + 488, H - 6, 'limit used in UI: εt 200, εv 350 µε (uncited)', { size: 10, fill: C.p1 });
    b += `<line x1="${L}" y1="${bot}" x2="${W - 12}" y2="${bot}" stroke="${C.grey}"/>`;
    colors.forEach(([c, n], i) => { b += `<rect x="${L + 10 + i * 140}" y="${H - 16}" width="12" height="12" fill="${c}"/>` + text(L + 26 + i * 140, H - 6, n, { size: 10 }); });
    save('fig-b1-blueprint-point.svg', svg(W, H, b));
  }

  // ---------------------------------------------------------------- Fig 6.1 translation chain
  {
    const nodes = [
      ['Visual damage (photo)', 'NOT IMPLEMENTED', 'CV is keyword match'],
      ['Material degradation (E₁ penalty)', 'NOT IMPLEMENTED', 'mapping refused: calibration required'],
      ['Weather → moisture / pore pressure', 'PARTIAL', 'linear CBR decay; no pore pressure'],
      ['Subgrade properties (CBR → Es)', 'PARTIAL', 'Es = 10·CBR, uncited'],
      ['Traffic loading (virtual WIM)', 'SIMULATED', 'illustrative spectrum, no WIM'],
      ['Structural response (εt, εv)', 'FAILED', '1–2 orders below MLET'],
      ['Predicted deterioration (RUL, PCI)', 'FAILED', 'independent of response']
    ];
    const W = 720, H = 250;
    let b = defs + tag('BLUEPRINT REFERENCE chain · AS-IMPLEMENTED status');
    const w = 92, gap = 8.5;
    nodes.forEach(([label, st, note], i) => {
      const x = 12 + i * (w + gap);
      b += box(x, 50, w, 92, label, st, { size: 10, wrap: 15 });
      wrap(note, 17).forEach((l, k) => { b += text(x + w / 2, 162 + k * 12, l, { size: 9, anchor: 'middle', fill: C.grey, italic: true }); });
      if (i < nodes.length - 1) b += arrow(x + w, 96, x + w + gap, 96);
    });
    b += legend(12, H - 22, ['PARTIAL', 'SIMULATED', 'FAILED', 'NOT IMPLEMENTED']);
    save('fig-6-1-translation-chain.svg', svg(W, H, b));
  }

  // ---------------------------------------------------------------- Fig 10.1 OpenVINO pipeline
  {
    const st = [
      ['PyTorch model (PINN / YOLOv8)', 'NOT IMPLEMENTED'], ['ONNX export', 'NOT IMPLEMENTED'], ['OpenVINO IR (.xml + .bin)', 'FAILED'],
      ['NNCF INT8 / FP16', 'NOT IMPLEMENTED'], ['Device inference CPU / iGPU / NPU', 'NOT IMPLEMENTED'], ['Latency & accuracy benchmark', 'SIMULATED']
    ];
    const W = 720, H = 210;
    let b = defs + tag('BLUEPRINT REFERENCE pipeline · status found');
    const w = 104, gap = 15;
    st.forEach(([label, s], i) => {
      const x = 12 + i * (w + gap);
      b += box(x, 50, w, 80, label, s, { size: 10, wrap: 16 });
      if (i < st.length - 1) b += arrow(x + w, 90, x + w + gap, 90);
    });
    b += text(12, 160, 'IR: hand-written XML with custom op "PhysicsPDEOp", no weights.  Benchmark: lookup constants + random jitter / JS loop.', { size: 10, fill: C.grey });
    b += text(12, 176, 'The current engine is closed-form arithmetic and is not eligible for PyTorch → ONNX → IR conversion.', { size: 10, fill: C.notimpl, weight: 600 });
    b += legend(12, H - 20, ['SIMULATED', 'FAILED', 'NOT IMPLEMENTED']);
    save('fig-10-1-openvino.svg', svg(W, H, b));
  }

  // ---------------------------------------------------------------- Fig 12.1 severity distribution
  {
    const reg = readFileSync(`${root}/PAVEMENT_PINN_Audit_Findings_Register.md`, 'utf8');
    const rows = reg.slice(reg.indexOf('## A.1'), reg.indexOf('## A.2')).split('\n').filter((l) => /^\| F-\d\d \| \[P\d\]/.test(l)).map((l) => {
      const c = l.split('|').map((x) => x.trim());
      return { sev: c[2].replace(/[[\]]/g, ''), ev: (/\[(VERIFIED|NOT IMPLEMENTED|BLOCKED|NOT VERIFIED|PARTIALLY VERIFIED)\]/.exec(c[5]) ?? [, 'OTHER'])[1] };
    });
    const sevs = ['P0', 'P1', 'P2', 'P3'];
    const evs = [['VERIFIED', C.navy], ['NOT IMPLEMENTED', C.notimpl], ['BLOCKED', C.blocked], ['NOT VERIFIED', '#98A2B3']];
    const W = 720, H = 240, L = 70, unit = 34, top = 40;
    let b = tag(`AS-IMPLEMENTED evidence · ${rows.length} findings`);
    sevs.forEach((s, i) => {
      const y = top + i * 40;
      b += text(L - 10, y + 20, s, { size: 12, anchor: 'end', weight: 700, fill: C[s.toLowerCase()] });
      let x = L;
      for (const [ev, col] of evs) {
        const n = rows.filter((r) => r.sev === s && r.ev === ev).length;
        if (!n) continue;
        b += `<rect x="${x}" y="${y + 4}" width="${n * unit}" height="24" fill="${col}"/>`;
        b += text(x + (n * unit) / 2, y + 20, String(n), { size: 10.5, anchor: 'middle', fill: '#fff', weight: 700 });
        x += n * unit;
      }
      const total = rows.filter((r) => r.sev === s).length;
      b += text(x + 8, y + 20, `${total}`, { size: 11, weight: 700 });
    });
    evs.forEach(([ev, col], i) => { b += `<rect x="${L + i * 160}" y="${H - 22}" width="12" height="12" fill="${col}"/>` + text(L + 16 + i * 160, H - 12, ev, { size: 10 }); });
    save('fig-12-1-severity.svg', svg(W, H, b));
    out.__severity = rows;
  }

  // ---------------------------------------------------------------- Fig 13.1 roadmap
  {
    const phases = [
      ['P0 · Integrity & scientific identity', C.p0, ['Relabel PINN / OpenVINO claims', 'Remove random & constant "measurements"', 'Remove fake training modal & IR', 'Decide model form & governing document', 'Withdraw unverified verdicts']],
      ['P1 · Workflow integration & contracts', C.p1, ['Verified MLET response computation', 'One cited fatigue / rutting criterion', 'Single standard axle; validated legacy API', 'Honest device detection; PDF disclaimer', 'Typed contracts with units']],
      ['P2 · Shared persistence & provenance', C.p2, ['Apply Supabase migration; identity provider', 'Live weather / traffic / WIM adapters', 'Acquire FWD, cores, CBR, PCI, photos', 'Status labels on every page', 'Provenance stored with predictions']],
      ['P3 · End-to-end scientific verification', C.p3, ['Cross-check MLET with certified software', 'Validate vs FWD on held-out sections', 'Surrogate / PINN with ablation', 'Deterioration model; CV + anti-spoofing', 'OpenVINO benchmark; uncertainty']]
    ];
    const W = 720, H = 292;
    let b = defs + tag('PROPOSED TARGET STATE · no phase complete');
    const w = 168, gap = 9;
    phases.forEach(([title, col, items], i) => {
      const x = 12 + i * (w + gap);
      b += `<rect x="${x}" y="40" width="${w}" height="32" rx="5" fill="${col}"/>`;
      wrap(title, 28).forEach((l, k) => { b += text(x + w / 2, 53 + k * 12, l, { size: 10, fill: '#fff', anchor: 'middle', weight: 700 }); });
      b += `<rect x="${x}" y="76" width="${w}" height="${items.length * 34 + 8}" rx="5" fill="#fff" stroke="${col}" stroke-width="1.2"/>`;
      items.forEach((it, j) => {
        wrap(it, 29).forEach((l, k) => { b += text(x + 10, 96 + j * 34 + k * 12, (k === 0 ? '• ' : '  ') + l, { size: 9.8 }); });
      });
      if (i < phases.length - 1) b += arrow(x + w, 56, x + w + gap, 56);
    });
    b += text(12, H - 12, 'Exit criteria per task: Chapter 13 tables; closure conditions: Appendix G.', { size: 10, fill: C.grey });
    save('fig-13-1-roadmap.svg', svg(W, H, b));
  }
  return out;
}
