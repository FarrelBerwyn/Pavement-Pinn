/**
 * HTTP API contract tests.
 *
 * Boots the real Express app (server/app.ts) on an ephemeral port — no Vite, no mocks —
 * and exercises every endpoint. Expected values were recorded from the pre-restructure
 * server (server.ts @ fffa344) before the backend was split into modules.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../../server/app';
import { loadServerConfig } from '../../server/config/env';
import { generateNarrative, buildFallbackNarrative } from '../../server/services/narrativeService';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';
import { API_PATHS } from '../../src/types';
import { defaultParamsFor } from '../physics-validation/pinnScenarios';

// Never call the real Gemini API from the test suite: without a key the endpoint must
// deterministically answer with the offline rule-engine narrative.
delete process.env.GEMINI_API_KEY;

let server: Server;
let base = '';

before(async () => {
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const postJson = (path: string, body: unknown) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('API_PATHS keeps the six pre-restructure endpoint paths', () => {
  assert.deepEqual(API_PATHS, {
    health: '/api/health',
    roads: '/api/roads',
    simulate: '/api/simulate',
    openvinoExportIr: '/api/openvino/export-ir',
    openvinoExportConfig: '/api/openvino/export-config',
    generateNarrative: '/api/generate-narrative'
  });
});

test('GET /api/health', async () => {
  const res = await fetch(base + '/api/health');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /^application\/json/);
  const body = await res.json();
  assert.deepEqual(Object.keys(body), ['status', 'appName', 'timestamp']);
  assert.equal(body.status, 'ok');
  assert.equal(body.appName, 'PAVEMENT-PINN');
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
});

test('GET /api/roads returns the full reference dataset, byte-identical to baseline', async () => {
  const res = await fetch(base + '/api/roads');
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.equal(Buffer.byteLength(text), 18133);
  assert.equal(sha256(text), '5b0cf7f80ff4a5c3edc788982feccb9d37a25655ec3c5af83cbae88b27e334d9');
  assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify(INDONESIAN_ROAD_SEGMENTS)));
});

test('POST /api/simulate: success envelope and result shape', async () => {
  const segment = INDONESIAN_ROAD_SEGMENTS[0];
  const res = await postJson('/api/simulate', { params: defaultParamsFor(segment) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body), ['success', 'result']);
  assert.equal(body.success, true);
  assert.deepEqual(Object.keys(body.result), [
    'id', 'timestamp', 'params', 'roadSegment', 'predictedPci', 'pciDropPoints',
    'pavementLifeRemainingYears', 'tensors', 'roleOutputs', 'telemetry', 'aiNarrative'
  ]);
  assert.equal(body.result.roadSegment.id, segment.id);
  // Deterministic part of the baseline response for this exact request.
  assert.equal(body.result.predictedPci, 10);
  assert.equal(body.result.pciDropPoints, 28);
  assert.deepEqual(body.result.tensors, {
    tensileStrainEt: 24,
    compressiveStrainEv: 46,
    surfaceDeflectionMaxMicron: 883,
    stressTopMpa: 1.29,
    stressBottomMpa: 0.24
  });
});

test('POST /api/simulate: unknown segmentId falls back to the first segment', async () => {
  const res = await postJson('/api/simulate', { params: { segmentId: 'NOPE', axleLoadTon: 12 } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.result.roadSegment.id, INDONESIAN_ROAD_SEGMENTS[0].id);
  // Missing numeric inputs propagate NaN, which JSON serialises as null (no validation).
  assert.equal(body.result.predictedPci, null);
});

test('POST /api/simulate: missing params yields HTTP 500 with the runtime error message', async () => {
  const res = await postJson('/api/simulate', {});
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), {
    success: false,
    error: "Cannot read properties of undefined (reading 'segmentId')"
  });
});

test('GET /api/openvino/export-ir: XML attachment, byte-identical to baseline', async () => {
  const res = await fetch(base + '/api/openvino/export-ir?device=CPU&precision=FP32');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/xml; charset=utf-8');
  assert.equal(res.headers.get('content-disposition'), 'attachment; filename="pavement_pinn_cpu_fp32.xml"');
  assert.equal(sha256(await res.text()), '5eb3c942e0abb58891d0c23ebd3d38ea8b85d4383d31b5c80e61456018619d70');
});

test('GET /api/openvino/export-ir: defaults to NPU / INT8_NNCF', async () => {
  const res = await fetch(base + '/api/openvino/export-ir');
  assert.equal(res.headers.get('content-disposition'), 'attachment; filename="pavement_pinn_npu_int8_nncf.xml"');
});

test('GET /api/openvino/export-config: JSON attachment, byte-identical to baseline', async () => {
  const res = await fetch(base + '/api/openvino/export-config');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(res.headers.get('content-disposition'), 'attachment; filename="openvino_config_npu.json"');
  const text = await res.text();
  assert.equal(sha256(text), 'e36a2eeea249f4c00cb93540acaf612e6b6c868abdab53292e28a28d14f67322');
  const body = JSON.parse(text);
  assert.equal(body.target_device, 'NPU');
  assert.equal(body.nncf_quantization.enabled, true);
  assert.equal(body.performance_config.NUM_STREAMS, '2');
});

test('GET /api/openvino/export-config: query parameters are reflected', async () => {
  const res = await fetch(base + '/api/openvino/export-config?device=CPU&precision=FP32&streams=4');
  const body = await res.json();
  assert.equal(body.target_device, 'CPU');
  assert.equal(body.precision_mode, 'FP32');
  assert.equal(body.nncf_quantization.enabled, false);
  assert.equal(body.performance_config.NUM_STREAMS, '4');
});

test('POST /api/generate-narrative: 200 envelope, offline rule-engine source when no API key is configured', async () => {
  const res = await postJson('/api/generate-narrative', { role: 'FIELD_ENGINEER', simulationData: {} });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body), ['success', 'narrative', 'source']);
  assert.equal(body.success, true);
  assert.equal(typeof body.narrative, 'string');
  assert.equal(body.source, 'rule-engine-offline');
  assert.ok(body.narrative.startsWith('[ANALISIS REKAYASA STRUKTURAL BBPJN]'));
});

test('POST /api/generate-narrative: malformed JSON is rejected with HTTP 400', async () => {
  const res = await fetch(base + '/api/generate-narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json'
  });
  assert.equal(res.status, 400);
});

test('narrative service: offline text matches the baseline fallback, per role', async () => {
  const offline = await generateNarrative('FIELD_ENGINEER', {}, null);
  assert.equal(offline.source, 'rule-engine-offline');
  assert.equal(
    offline.narrative,
    '[ANALISIS REKAYASA STRUKTURAL BBPJN]\nSimulasi PINN mendeteksi regangan tarik dasar aspal εt sebesar 180 µε dan regangan tekan tanah dasar εv sebesar 320 µε. Laju deteriorasi akibat beban ODOL memproyeksikan pembentukan retak lelah. Rekomendasi perbaikan: Tebal overlay 6 cm AC-WC.'
  );
  assert.match(buildFallbackNarrative('OPERATIONS_MANAGER', {}), /^\[EVALUASI OPERASIONAL WIM & BPTD\]/);
  assert.match(buildFallbackNarrative('POLICY_MAKER', {}), /^\[RINGKASAN KEBIJAKAN PRESERVASI EKSEKUTIF\]/);
  // Any unrecognised role (including the public roles) receives the policy narrative.
  assert.equal(buildFallbackNarrative('PUBLIC_VIEWER', {}), buildFallbackNarrative('POLICY_MAKER', {}));
});

test('narrative service: prefers the narrative embedded in the simulation result', () => {
  const simulationData = { aiNarrative: { fieldEngineerNarrative: 'embedded-text' } };
  assert.equal(buildFallbackNarrative('FIELD_ENGINEER', simulationData), 'embedded-text');
});

test('narrative service: a failing Gemini client degrades to rule-engine-fallback', async () => {
  const failingClient = { models: { generateContent: async () => { throw new Error('boom'); } } };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await generateNarrative('POLICY_MAKER', {}, failingClient as never);
    assert.equal(result.source, 'rule-engine-fallback');
    assert.equal(result.narrative, buildFallbackNarrative('POLICY_MAKER', {}));
  } finally {
    console.warn = originalWarn;
  }
});

test('no endpoint requires authentication (documents the absence of backend authorization)', async () => {
  // Requests carry no credentials or role header and are all accepted. If auth is ever
  // added, this test must be replaced by a real role-to-endpoint matrix.
  for (const path of ['/api/health', '/api/roads', '/api/openvino/export-ir', '/api/openvino/export-config']) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200, path);
  }
});

test('server config: defaults preserve port 3000 and the GitHub Pages base path', () => {
  assert.deepEqual(loadServerConfig({}), {
    port: 3000,
    host: '0.0.0.0',
    isProduction: false,
    basePath: '/PavementPinn/',
    dataDir: '.data',
    sessionSecret: undefined,
    demoAuthEnabled: true
  });
  assert.equal(loadServerConfig({ SESSION_SECRET: 'too-short' }).sessionSecret, undefined);
  assert.equal(loadServerConfig({ DEMO_AUTH: 'false' }).demoAuthEnabled, false);
  assert.equal(loadServerConfig({ PORT: '4317', NODE_ENV: 'production', VITE_BASE_PATH: '/' }).port, 4317);
  assert.equal(loadServerConfig({ NODE_ENV: 'production' }).isProduction, true);
  assert.equal(loadServerConfig({ VITE_BASE_PATH: '/' }).basePath, '/');
  assert.equal(loadServerConfig({ VITE_BASE_PATH: 'demo' }).basePath, '/demo/');
  assert.equal(loadServerConfig({ PORT: 'abc' }).port, 3000);
});
