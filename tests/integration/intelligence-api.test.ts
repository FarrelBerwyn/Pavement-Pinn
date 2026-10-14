/**
 * P4/P5 over HTTP: risk map, assessment + explanation, Road Story and What-If.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../../server/app';

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

const get = async (p: string) => {
  const r = await fetch(base + p);
  return { status: r.status, body: (await r.json()) as any };
};
const post = async (p: string, body: unknown) => {
  const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as any };
};

test('risk map lists the pilot corridor first with honest status labels', async () => {
  const r = await get('/api/risk-map');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items.slice(0, 4).map((i: any) => i.segmentId), ['KRW-001', 'KRW-002', 'KRW-003', 'KRW-004']);
  for (const i of r.body.items) {
    assert.ok(['HIGH', 'WATCH', 'MODERATE', 'GOOD'].includes(i.risk));
    assert.equal(i.engine, 'RULE_BASED');
    assert.equal(i.validationStatus, 'VALIDATION_REQUIRED');
  }
  assert.equal(r.body.items[0].geometryStatus, 'ILLUSTRATIVE');
});

test('assessment endpoint returns provenance and a deterministic explanation', async () => {
  const r = await get('/api/road-segments/KRW-001/assessment');
  assert.equal(r.status, 200);
  assert.equal(r.body.assessment.engine, 'RULE_BASED');
  assert.equal(r.body.assessment.traffic.wim.status, 'WIM_NOT_AVAILABLE');
  assert.equal(r.body.explanation.source, 'DETERMINISTIC_RULES');
  assert.equal((await get('/api/road-segments/NOPE/assessment')).status, 404);
});

test('What-If returns a SIMULATION with deltas and validates input', async () => {
  const r = await post('/api/simulations', { segmentId: 'KRW-002', scenario: { asphaltThicknessCm: 14 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.result.label, 'SIMULATION');
  assert.equal(r.body.result.changed[0].parameter, 'asphaltThicknessCm');
  assert.equal((await post('/api/simulations', { segmentId: 'KRW-002', scenario: { asphaltThicknessCm: 'tebal' } })).status, 400);
  assert.equal((await post('/api/simulations', { segmentId: 'NOPE', scenario: {} })).status, 400);
});

test('Road Story includes PREDICTED and SIMULATED entries, labelled', async () => {
  const r = await get('/api/road-segments/KRW-002/story');
  assert.equal(r.status, 200);
  assert.equal(r.body.audience, 'PUBLIC');
  const kinds = new Set(r.body.story.map((e: any) => e.kind));
  assert.ok(kinds.has('PREDICTED'));
  assert.ok(kinds.has('SIMULATED'), 'the What-If run from the previous test appears');
});
