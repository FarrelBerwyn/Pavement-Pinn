// Layout QA: loads the report HTML in headless Chrome with print media emulation at the
// printable text width (A4 portrait 176 mm; landscape sections 267 mm) and lists elements
// whose content is wider than their box. Any hit means clipped notation or, worse, a
// document-wide shrink-to-fit when Chrome prints.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function overflowCheck(chrome, htmlPath) {
  const port = 9950 + (process.pid % 40);
  const profile = mkdtempSync(path.join(tmpdir(), 'ppinn-overflow-'));
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let targets;
    for (let i = 0; i < 60 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { await sleep(200); } }
    const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const pending = new Map();
    let loaded = false;
    ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } if (d.method === 'Page.loadEventFired') loaded = true; });
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.enable');
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    await send('Emulation.setDeviceMetricsOverride', { width: 665, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: pathToFileURL(htmlPath).href });
    for (let i = 0; i < 100 && !loaded; i++) await sleep(100);
    await sleep(800);
    const expr = `(() => {
      for (const s of document.querySelectorAll('section.landscape')) s.style.width = '1009px';
      document.querySelector('.cover')?.remove();
      const hits = [];
      for (const el of document.querySelectorAll('.eq-body, .equation, table, figure, pre, p, li, td, th, h1, h2, h3')) {
        if (el.scrollWidth > el.clientWidth + 2) hits.push(el.tagName + '.' + el.className + ': ' + el.textContent.trim().slice(0, 70) + ' (' + el.scrollWidth + ' > ' + el.clientWidth + ')');
      }
      const body = document.body;
      for (const child of body.children) {
        if (child.matches('section.landscape')) continue;
        if (child.getBoundingClientRect().right > 666) hits.push('BLOCK ' + child.tagName + ': ' + child.textContent.trim().slice(0, 60) + ' right=' + Math.round(child.getBoundingClientRect().right));
      }
      return hits;
    })()`;
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    ws.close();
    return res.result.result.value;
  } finally {
    proc.kill();
    await sleep(400);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
