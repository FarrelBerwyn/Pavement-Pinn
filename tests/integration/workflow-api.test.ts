/**
 * P2/P7: workflow API over real HTTP (ephemeral port, temporary data directory).
 * Covers the cross-role golden path and the rejection cases: unauthenticated, wrong
 * role, wrong owner, forged token, stale version, invalid transition, bad photo,
 * failed persistence, restart persistence, audit access and demo-auth switch-off.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../../server/app';
import { createWorkflowRuntime } from '../../server/services/workflowRuntime';
import { FileCaseStore } from '../../server/repositories/fileCaseStore';
import { MemoryCaseStore } from '../../src/domain/workflow/service';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';

// 1x1 transparent PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const dataDir = mkdtempSync(path.join(tmpdir(), 'pinn-workflow-'));
let server: Server;
let base = '';

function listen(app: ReturnType<typeof createApp>): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve({ server: s, base: `http://127.0.0.1:${(s.address() as AddressInfo).port}` }));
  });
}

before(async () => {
  const store = new FileCaseStore(dataDir);
  const workflow = createWorkflowRuntime({ store, storeKind: 'file', storeLocation: store.location, sessionSecret: 'x'.repeat(40) });
  await workflow.ready;
  ({ server, base } = await listen(createApp({ workflow })));
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(dataDir, { recursive: true, force: true });
});

async function call(method: string, p: string, body?: unknown, token?: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(base + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, body: (await res.json()) as any };
}

const session = async (accountId: string) => (await call('POST', '/api/auth/demo-session', { accountId })).body.token as string;

function draft() {
  const { id, status, creatorAccountId, creatorRole, origin, createdAt, ...content } = INITIAL_COMMUNITY_REPORTS[0];
  void id; void status; void creatorAccountId; void creatorRole; void origin; void createdAt;
  return { ...content, coordinates: [-6.3672, 107.4011] as [number, number], photoUrl: PNG, description: 'Lubang dalam di lajur kiri Klari' };
}

const DUE = new Date(Date.now() + 5 * 86400000).toISOString();

test('cross-role golden path over HTTP, with public tracking and audit', async () => {
  const anon = await call('POST', '/api/auth/anonymous');
  assert.equal(anon.status, 200);
  assert.equal(anon.body.actor.kind, 'ANONYMOUS');
  assert.match(anon.body.actor.id, /^anon-/);

  const created = await call('POST', '/api/workflow/reports', { report: draft() }, anon.body.token);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.report.audience, 'PUBLIC');
  assert.equal(created.body.report.case.state, 'NEEDS_REVIEW');
  assert.equal(created.body.report.canEdit, false, 'anonymous visitors create but do not edit');
  assert.equal(typeof created.body.claimToken, 'string');
  const id = created.body.report.case.id as string;

  // Citizen tracking with the claim token on a fresh, tokenless request.
  const tracked = await call('GET', `/api/workflow/reports/${id}`, undefined, undefined, { 'x-claim-token': created.body.claimToken });
  assert.equal(tracked.body.report.isMine, true);
  assert.equal(tracked.body.report.case.timeline.at(-1).state, 'NEEDS_REVIEW');

  const ops = await session('USR-008');
  const ops2 = await session('USR-002');
  const eng = await session('USR-006');
  const engOther = await session('USR-001');
  const policy = await session('USR-007');

  // Operations sees the same report in its queue, as a full staff case.
  const queue = await call('GET', '/api/workflow/reports?state=NEEDS_REVIEW', undefined, ops);
  const inQueue = queue.body.items.find((i: any) => i.case.id === id);
  assert.equal(inQueue.audience, 'STAFF');
  assert.deepEqual(inQueue.availableActions, ['REVIEW_ACCEPT', 'CLOSE_INVALID']);
  assert.equal(inQueue.case.screening.modelStatus, 'DEMO');

  let version = inQueue.case.version as number;
  const act = async (token: string, command: object) => {
    const r = await call('POST', `/api/workflow/reports/${id}/transitions`, { command, expectedVersion: version }, token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    version = r.body.report.case.version;
    return r.body.report;
  };

  await act(ops, { action: 'REVIEW_ACCEPT', reason: 'Foto dan lokasi masuk akal.' });
  const engineers = await call('GET', '/api/workflow/engineers', undefined, ops);
  assert.ok(engineers.body.items.some((e: any) => e.id === 'USR-006'));
  await act(ops, { action: 'REQUEST_INSPECTION', reason: 'Prioritas koridor pilot', engineerId: 'USR-006', dueAt: DUE, instructions: 'Ukur kedalaman dan luas.' });

  // The engineer's queue shows the assignment; another engineer cannot act on it.
  const engView = await call('GET', `/api/workflow/reports/${id}`, undefined, eng);
  assert.deepEqual(engView.body.report.availableActions, ['SUBMIT_INSPECTION']);
  const wrongEngineer = await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'SUBMIT_INSPECTION', verdict: 'CONFIRMED', cvReview: { accepted: true, correctedClass: null }, measuredDepthCm: 8, measuredAreaM2: 2, severity: 'SEVERE', notes: 'x' }, expectedVersion: version }, engOther);
  assert.equal(wrongEngineer.status, 403);

  await act(eng, { action: 'SUBMIT_INSPECTION', verdict: 'CONFIRMED', cvReview: { accepted: true, correctedClass: null }, measuredDepthCm: 8, measuredAreaM2: 2.4, severity: 'SEVERE', notes: 'Lubang aktif, tepi retak.' });
  await act(eng, { action: 'RECOMMEND_ACTION', treatment: 'Patching + overlay tipis AC-WC', urgency: 'PRIORITY', rationale: 'Kerusakan terkonfirmasi di lajur berat.', assessmentId: null });

  // Policy Maker sees the same case and evidence but has no workflow actions.
  const policyView = await call('GET', `/api/workflow/reports/${id}`, undefined, policy);
  assert.equal(policyView.body.report.audience, 'STAFF');
  assert.equal(policyView.body.report.case.recommendation.treatment, 'Patching + overlay tipis AC-WC');
  assert.deepEqual(policyView.body.report.availableActions, []);
  const policyApproves = await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'APPROVE_ACTION', reason: 'x' }, expectedVersion: version }, policy);
  assert.equal(policyApproves.status, 403);

  await act(ops2, { action: 'APPROVE_ACTION', reason: 'Disetujui sesuai prioritas.' });
  await act(ops2, { action: 'START_WORK', reason: 'Tim tersedia', contractorNote: 'Swakelola' });
  await act(ops2, { action: 'COMPLETE_WORK_ORDER', reason: 'Pekerjaan selesai' });
  await act(eng, { action: 'RESOLVE', reason: 'Dicek di lapangan.' });
  const closed = await act(ops, { action: 'CLOSE_RESOLVED', reason: 'Selesai' });
  assert.equal(closed.case.state, 'CLOSED');
  assert.equal(closed.case.report.status, 'REPAIRED');

  // Citizen-visible tracking: same record, public notes only.
  const pub = await call('GET', `/api/workflow/reports/${id}`);
  assert.equal(pub.body.report.audience, 'PUBLIC');
  assert.equal(pub.body.report.case.state, 'CLOSED');
  const pubJson = JSON.stringify(pub.body);
  assert.doesNotMatch(pubJson, /USR-00[0-9]|Swakelola|Prioritas koridor pilot|Lubang aktif, tepi retak/);
  assert.ok(pub.body.report.case.timeline.some((t: any) => t.note === 'Perbaikan terverifikasi di lapangan'));

  // Audit trail: who did what, when and why — officials only.
  const audit = await call('GET', `/api/workflow/audit?entityId=${id}`, undefined, ops);
  assert.equal(audit.status, 200);
  const actions = audit.body.items.map((e: any) => e.action).reverse();
  assert.deepEqual(actions, ['SUBMIT', 'BEGIN_SCREENING', 'SCREENING_NEEDS_REVIEW', 'REVIEW_ACCEPT', 'REQUEST_INSPECTION', 'SUBMIT_INSPECTION', 'RECOMMEND_ACTION', 'APPROVE_ACTION', 'START_WORK', 'COMPLETE_WORK_ORDER', 'RESOLVE', 'CLOSE_RESOLVED']);
  for (const e of audit.body.items) assert.ok(e.actor.id && e.at && e.reason);
});

test('audit and staff-only endpoints refuse citizens, anonymous and unauthenticated callers', async () => {
  const citizen = await session('USR-004');
  const anon = (await call('POST', '/api/auth/anonymous')).body.token;
  assert.equal((await call('GET', '/api/workflow/audit')).status, 401);
  assert.equal((await call('GET', '/api/workflow/audit', undefined, citizen)).status, 403);
  assert.equal((await call('GET', '/api/workflow/audit', undefined, anon)).status, 403);
  assert.equal((await call('GET', '/api/workflow/engineers', undefined, citizen)).status, 403);
  // Public listing never exposes staff fields.
  const list = await call('GET', '/api/workflow/reports?limit=5');
  assert.equal(list.body.limit, 5);
  for (const item of list.body.items) {
    assert.equal(item.audience, 'PUBLIC');
    assert.equal(item.case.screening, undefined);
    assert.equal(item.case.history, undefined);
  }
});

test('forged or tampered tokens are rejected; identity never comes from the body', async () => {
  const citizen = await session('USR-004');
  const [body, sig] = citizen.split('.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  const forged = `${Buffer.from(JSON.stringify({ ...payload, role: 'OPERATIONS_MANAGER', sub: 'USR-008' })).toString('base64url')}.${sig}`;
  assert.equal((await call('GET', '/api/auth/me', undefined, forged)).status, 401);
  assert.equal((await call('GET', '/api/workflow/audit', undefined, forged)).status, 401);

  const created = await call('POST', '/api/workflow/reports', { report: { ...draft(), creatorAccountId: 'USR-008', creatorRole: 'OPERATIONS_MANAGER' } }, citizen);
  assert.equal(created.status, 201);
  assert.equal(created.body.report.case.report.creatorAccountId, 'USR-004');
  assert.equal(created.body.report.case.report.creatorRole, 'PUBLIC_REPORTER');
});

test('ownership: only the creating reporter edits, by id; others and later states are refused', async () => {
  const owner = await session('USR-004');
  const viewer = await session('USR-005');
  const ops = await session('USR-008');
  const created = await call('POST', '/api/workflow/reports', { report: draft() }, owner);
  const id = created.body.report.case.id;
  let version = created.body.report.case.version;
  assert.equal(created.body.report.canEdit, true);

  const byViewer = await call('PATCH', `/api/workflow/reports/${id}/content`, { patch: { description: 'x' }, expectedVersion: version }, viewer);
  assert.equal(byViewer.status, 403);
  const byOps = await call('PATCH', `/api/workflow/reports/${id}/content`, { patch: { description: 'x' }, expectedVersion: version }, ops);
  assert.equal(byOps.status, 403);
  const edited = await call('PATCH', `/api/workflow/reports/${id}/content`, { patch: { description: 'Diperbarui pelapor', estimatedDepthCm: 12 }, expectedVersion: version }, owner);
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  version = edited.body.report.case.version;

  const staffView = await call('GET', `/api/workflow/reports/${id}`, undefined, ops);
  await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'REVIEW_ACCEPT', reason: 'ok' }, expectedVersion: staffView.body.report.case.version }, ops);
  const frozen = await call('PATCH', `/api/workflow/reports/${id}/content`, { patch: { description: 'late' }, expectedVersion: version + 1 }, owner);
  assert.equal(frozen.status, 403);
});

test('stale version → 409, illegal transition → 422, unauthenticated → 401, bad input → 400', async () => {
  const owner = await session('USR-004');
  const ops = await session('USR-008');
  const created = await call('POST', '/api/workflow/reports', { report: draft() }, owner);
  const id = created.body.report.case.id;
  const v = created.body.report.case.version;
  assert.equal((await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'REVIEW_ACCEPT', reason: 'x' }, expectedVersion: v })).status, 401);
  assert.equal((await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'START_WORK', reason: 'x', contractorNote: '' }, expectedVersion: v }, ops)).status, 422);
  assert.equal((await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'REVIEW_ACCEPT', reason: 'x' }, expectedVersion: v + 7 }, ops)).status, 409);
  assert.equal((await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'MAKE_COFFEE' }, expectedVersion: v }, ops)).status, 400);
  assert.equal((await call('POST', `/api/workflow/reports/${id}/transitions`, { command: { action: 'REVIEW_ACCEPT', reason: 'x' } }, ops)).status, 400);
  assert.equal((await call('GET', '/api/workflow/reports/REP-NOPE')).status, 404);
});

test('photo validation checks real bytes, not the declared type', async () => {
  const owner = await session('USR-004');
  const fakePng = `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
  const r1 = await call('POST', '/api/workflow/reports', { report: { ...draft(), photoUrl: fakePng } }, owner);
  assert.equal(r1.status, 400);
  assert.match(r1.body.error.message, /not a JPEG, PNG or WebP/);
  const r2 = await call('POST', '/api/workflow/reports', { report: { ...draft(), photoUrl: 'file:///etc/passwd' } }, owner);
  assert.equal(r2.status, 400);
  const r3 = await call('POST', '/api/workflow/reports', { report: { ...draft(), coordinates: [Number.NaN, 107] } }, owner);
  assert.equal(r3.status, 400);
});

test('the file store persists across a server restart', async () => {
  const store = new FileCaseStore(dataDir);
  const runtime = createWorkflowRuntime({ store, storeKind: 'file', sessionSecret: 'x'.repeat(40) });
  await runtime.ready;
  const restarted = await listen(createApp({ workflow: runtime }));
  try {
    const res = await fetch(`${restarted.base}/api/workflow/reports?limit=200`);
    const body = (await res.json()) as any;
    assert.ok(body.items.some((i: any) => i.case.report.description === 'Diperbarui pelapor'), 'edit from the earlier test survived the restart');
    assert.ok(body.total > INITIAL_COMMUNITY_REPORTS.length);
  } finally {
    await new Promise<void>((resolve) => restarted.server.close(() => resolve()));
  }
});

test('a failed write returns 503 and leaves the stored case unchanged', async () => {
  const store = new MemoryCaseStore();
  const runtime = createWorkflowRuntime({ store, sessionSecret: 'y'.repeat(40) });
  await runtime.ready;
  const s = await listen(createApp({ workflow: runtime }));
  try {
    const opsTok = ((await (await fetch(`${s.base}/api/auth/demo-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: 'USR-008' }) })).json()) as any).token;
    const before = ((await (await fetch(`${s.base}/api/workflow/reports?limit=1`, { headers: { Authorization: `Bearer ${opsTok}` } })).json()) as any).items[0].case;
    store.failNextCommit = true;
    const r = await fetch(`${s.base}/api/workflow/reports/${before.id}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opsTok}` },
      body: JSON.stringify({ command: { action: 'REVIEW_ACCEPT', reason: 'x' }, expectedVersion: before.version })
    });
    assert.equal(r.status, 503);
    const after = ((await (await fetch(`${s.base}/api/workflow/reports/${before.id}`, { headers: { Authorization: `Bearer ${opsTok}` } })).json()) as any).report.case;
    assert.deepEqual(after, before);
  } finally {
    await new Promise<void>((resolve) => s.server.close(() => resolve()));
  }
});

test('DEMO_AUTH=false switches off the demo account picker; anonymous sessions remain', async () => {
  const runtime = createWorkflowRuntime({ demoAuthEnabled: false, seed: false });
  const s = await listen(createApp({ workflow: runtime }));
  try {
    const r = await fetch(`${s.base}/api/auth/demo-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: 'USR-008' }) });
    assert.equal(r.status, 403);
    const a = await fetch(`${s.base}/api/auth/anonymous`, { method: 'POST' });
    assert.equal(a.status, 200);
  } finally {
    await new Promise<void>((resolve) => s.server.close(() => resolve()));
  }
});

test('system health reports demo and missing components as they are', async () => {
  const r = await call('GET', '/api/system-health');
  assert.equal(r.status, 200);
  assert.equal(r.body.storage.status, 'ok');
  assert.match(r.body.storage.kind, /LOCAL_FILE/);
  assert.equal(r.body.cloudDatabase.status, 'NOT_CONFIGURED');
  assert.equal(r.body.authentication.status, 'DEMO');
  assert.equal(r.body.ai.computerVision.status, 'DEMO');
  assert.equal(r.body.ai.pinn.status, 'RULE_BASED');
  assert.equal(r.body.externalIntegrations.wim.status, 'NOT_AVAILABLE');
});
