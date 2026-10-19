// Visual-QA helper: prints selected page ranges of _build/report.html (the exact HTML of the
// final PDF) through Chrome DevTools Page.printToPDF, so individual pages can be viewed.
// Usage: node inspect-pages.mjs 19-20 35 55 ...   Output: _build/inspect/p<range>.pdf
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(path.join(tmpdir(), 'ppinn-inspect-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { await sleep(200); } }
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const events = [];
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else events.push(d.method); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url: pathToFileURL(path.join(here, 'report.html')).href });
for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await sleep(100);
await sleep(1500);
mkdirSync(path.join(here, 'inspect'), { recursive: true });
for (const range of process.argv.slice(2)) {
  const res = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, pageRanges: range });
  if (res.error) { console.log(range, 'ERROR', res.error.message); continue; }
  const out = path.join(here, 'inspect', `p${range}.pdf`);
  writeFileSync(out, Buffer.from(res.result.data, 'base64'));
  console.log('wrote', out);
}
ws.close();
proc.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
