/**
 * M1 engine endpoints over HTTP: Express forwards /api/engine/* to the Python inference
 * service at INFERENCE_URL. A stub service stands in for Python here; the physics itself is
 * tested by inference/tests (pytest).
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../server/app';
import { demoLoginFor } from '../../src/data/reference/demoCredentials';

let server: Server;
let stub: Server;
let base = '';
let stubUrl = '';
const seen: Array<{ method?: string; url?: string; body: string }> = [];

before(async () => {
  stub = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body });
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/v1/health') return res.end(JSON.stringify({ status: 'ok', mlet_method: 'PyMastic@be301be' }));
      const parsed = JSON.parse(body || '{}');
      if (!parsed.segment_id) { res.statusCode = 422; return res.end(JSON.stringify({ detail: 'segment_id required' })); }
      res.end(JSON.stringify({ segment_id: parsed.segment_id, mlet: { et_ue: 227, ev_ue: 876.4 }, status_label: 'COMPUTED' }));
    });
  });
  await new Promise<void>((r) => stub.listen(0, '127.0.0.1', () => r()));
  stubUrl = `http://127.0.0.1:${(stub.address() as AddressInfo).port}`;
  process.env.INFERENCE_URL = stubUrl;
  await new Promise<void>((r) => { server = createApp().listen(0, '127.0.0.1', () => r()); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  delete process.env.INFERENCE_URL;
  await new Promise<void>((r) => server.close(() => r()));
  await new Promise<void>((r) => stub.close(() => r()));
});

const call = async (method: string, p: string, body?: unknown, token?: string) => {
  const r = await fetch(base + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: r.status, body: (await r.json()) as any };
};
const login = async (accountId: string) => (await call('POST', '/api/auth/login', demoLoginFor(accountId))).body.token as string;

test('engine health is relayed from the inference service', async () => {
  const r = await call('GET', '/api/engine/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.result.mlet_method, 'PyMastic@be301be');
});

test('assessment requires a field engineer session', async () => {
  assert.equal((await call('POST', '/api/engine/assess', { segment_id: 'X' })).status, 401);
  const operator = await login('USR-002');
  assert.equal((await call('POST', '/api/engine/assess', { segment_id: 'X' }, operator)).status, 403);
});

test('a field engineer gets the service result; the body is forwarded unchanged', async () => {
  const engineer = await login('USR-001');
  const r = await call('POST', '/api/engine/assess', { segment_id: 'NRG-1', subgrade: { cbr: 6 } }, engineer);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.result.mlet, { et_ue: 227, ev_ue: 876.4 });
  assert.deepEqual(JSON.parse(seen.at(-1)!.body), { segment_id: 'NRG-1', subgrade: { cbr: 6 } });
});

test('service validation errors stay 422', async () => {
  const engineer = await login('USR-001');
  const r = await call('POST', '/api/engine/assess', {}, engineer);
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, 'VALIDATION');
});

test('an unreachable service gives 503 INFERENCE_UNAVAILABLE, never a local result', async () => {
  const engineer = await login('USR-001');
  process.env.INFERENCE_URL = 'http://127.0.0.1:1';
  try {
    const r = await call('POST', '/api/engine/assess', { segment_id: 'NRG-1' }, engineer);
    assert.equal(r.status, 503);
    assert.equal(r.body.error.code, 'INFERENCE_UNAVAILABLE');
    assert.equal(r.body.result, undefined);
  } finally {
    process.env.INFERENCE_URL = stubUrl;
  }
});
