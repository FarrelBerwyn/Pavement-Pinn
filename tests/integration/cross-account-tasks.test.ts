/**
 * Cross-account hand-off R.E → M.O → F.E → D.M as each account's screens derive it:
 * one report id travels through real HTTP sessions (fresh login per step), and for every
 * role the task list ("Tugas Saya"), the sidebar badge and the notification bell are
 * computed from what that account's own session reads back from the server.
 * The server-side golden path, permissions, restart persistence and failed writes are
 * covered in workflow-api.test.ts; this file covers what the client builds on top.
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
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';
import { KARAWANG_PILOT_SEGMENTS } from '../../src/data/reference/karawangPilot';

const ROAD_SEGMENTS = [...KARAWANG_PILOT_SEGMENTS, ...INDONESIAN_ROAD_SEGMENTS];
import { demoLoginFor } from '../../src/data/reference/demoCredentials';
import { fieldTasks, tasksDue } from '../../src/features/work-orders/fieldTasks';
import { workflowNotifications } from '../../src/features/workflow/notifications';
import { OfflineWorkflowGateway, type ReportView } from '../../src/services/api/workflowClient';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const DUE = new Date(Date.now() + 4 * 86400000).toISOString();

const dataDir = mkdtempSync(path.join(tmpdir(), 'pinn-handoff-'));
let server: Server;
let base = '';

before(async () => {
  const store = new FileCaseStore(dataDir);
  const workflow = createWorkflowRuntime({ store, storeKind: 'file', storeLocation: store.location, sessionSecret: 'y'.repeat(40) });
  await workflow.ready;
  await new Promise<void>((resolve) => {
    server = createApp({ workflow }).listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(dataDir, { recursive: true, force: true });
});

async function call(method: string, p: string, body?: unknown, token?: string) {
  const res = await fetch(base + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, body: (await res.json()) as any };
}

/** A fresh login each time: nothing is carried over in the client between steps. */
const login = async (accountId: string) => (await call('POST', '/api/auth/login', demoLoginFor(accountId))).body.token as string;
/** What this account's screens would load: its own server read of all reports. */
const viewsOf = async (accountId: string): Promise<ReportView[]> => (await call('GET', '/api/workflow/reports', undefined, await login(accountId))).body.items;

const RE = 'USR-004';
const MO = 'USR-008';
const FE = 'USR-006';
const FE_OTHER = 'USR-001';
const DM = 'USR-007';

test('one report id travels R.E → M.O → F.E → D.M with consistent tasks, badges and notifications', async () => {
  // R.E submits a report and receives its id.
  const { id: _id, status: _s, creatorAccountId: _c, creatorRole: _r, origin: _o, createdAt: _t, ...content } = INITIAL_COMMUNITY_REPORTS[0];
  void _id; void _s; void _c; void _r; void _o; void _t;
  const created = await call('POST', '/api/workflow/reports', { report: { ...content, coordinates: [-6.3672, 107.4011], photoUrl: PNG, description: 'Uji alur lintas akun' } }, await login(RE));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.report.case.id as string;

  // M.O sees the same id in its queue and gets a notification about it.
  let mo = await viewsOf(MO);
  const moCase = mo.find((v) => v.case.id === id)!;
  assert.equal(moCase.audience, 'STAFF');
  assert.equal(moCase.case.state, 'NEEDS_REVIEW');
  assert.ok(workflowNotifications(mo, { id: MO, role: 'OPERATIONS_MANAGER' }).some((n) => n.caseId === id && n.kind === 'REVIEW'));

  let version = moCase.case.version;
  const act = async (accountId: string, command: object) => {
    const r = await call('POST', `/api/workflow/reports/${id}/transitions`, { command, expectedVersion: version }, await login(accountId));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    version = r.body.report.case.version;
  };

  await act(MO, { action: 'REVIEW_ACCEPT', reason: 'Bukti cukup.' });
  await act(MO, { action: 'REQUEST_INSPECTION', reason: 'Koridor pilot', engineerId: FE, dueAt: DUE, instructions: 'Ukur kedalaman.' });

  // F.E: the assignment is a task with "Mulai Tugas", the badge counts it, the bell announces it.
  let fe = await viewsOf(FE);
  let tasks = fieldTasks(fe, FE);
  const task = tasks.find((t) => t.c.id === id)!;
  assert.ok(task, 'assigned case appears in Tugas Saya of the assigned engineer');
  assert.deepEqual(task.cta, { action: 'SUBMIT_INSPECTION', label: 'Mulai Tugas' });
  assert.equal(task.c.report.description, 'Uji alur lintas akun', 'task carries the original report context');
  assert.equal(task.c.assignment!.assignedBy, MO);
  assert.equal(tasksDue(tasks), 1);
  assert.ok(workflowNotifications(fe, { id: FE, role: 'FIELD_ENGINEER' }).some((n) => n.caseId === id && n.kind === 'ASSIGNED'));

  // Another engineer has no task and no notification for it.
  const other = await viewsOf(FE_OTHER);
  assert.equal(fieldTasks(other, FE_OTHER).some((t) => t.c.id === id), false);
  assert.equal(workflowNotifications(other, { id: FE_OTHER, role: 'FIELD_ENGINEER' }).some((n) => n.caseId === id), false);

  // F.E inspects → next own step is the recommendation; after recommending it waits on M.O.
  await act(FE, { action: 'SUBMIT_INSPECTION', verdict: 'CONFIRMED', cvReview: { accepted: true, correctedClass: null }, measuredDepthCm: 9, measuredAreaM2: 2, severity: 'SEVERE', notes: 'Terkonfirmasi.' });
  tasks = fieldTasks(await viewsOf(FE), FE);
  assert.equal(tasks.find((t) => t.c.id === id)!.cta?.action, 'RECOMMEND_ACTION');
  await act(FE, { action: 'RECOMMEND_ACTION', treatment: 'Patching', urgency: 'PRIORITY', rationale: 'Lajur berat.', assessmentId: null });
  tasks = fieldTasks(await viewsOf(FE), FE);
  assert.equal(tasks.find((t) => t.c.id === id)!.stage, 'WAITING');
  assert.equal(tasksDue(tasks), 0, 'badge clears when it is not the engineer’s turn');

  // M.O and D.M read the same inspection and recommendation; both are notified.
  mo = await viewsOf(MO);
  const dm = await viewsOf(DM);
  for (const views of [mo, dm]) {
    const c = views.find((v) => v.case.id === id)!.case as any;
    assert.equal(c.state, 'ACTION_RECOMMENDED');
    assert.equal(c.inspection.measuredDepthCm, 9);
    assert.equal(c.recommendation.treatment, 'Patching');
    assert.equal(c.recommendation.assessment.engine, 'RULE_BASED');
  }
  assert.ok(workflowNotifications(mo, { id: MO, role: 'OPERATIONS_MANAGER' }).some((n) => n.caseId === id && n.kind === 'DECISION'));
  assert.ok(workflowNotifications(dm, { id: DM, role: 'POLICY_MAKER' }).some((n) => n.caseId === id && n.title === 'Rekomendasi penanganan baru'));
  assert.deepEqual(dm.find((v) => v.case.id === id)!.availableActions, [], 'D.M reads; approval stays with M.O');

  // The human decision returns to F.E and D.M.
  await act(MO, { action: 'APPROVE_ACTION', reason: 'Sesuai prioritas.' });
  fe = await viewsOf(FE);
  assert.ok(workflowNotifications(fe, { id: FE, role: 'FIELD_ENGINEER' }).some((n) => n.caseId === id && n.title.includes('disetujui')));
  assert.ok(workflowNotifications(await viewsOf(DM), { id: DM, role: 'POLICY_MAKER' }).some((n) => n.caseId === id && n.title === 'Penanganan disetujui M.O'));

  // R.E sees the status of their own report with public notes only, and is notified.
  const re = await viewsOf(RE);
  const mine = re.find((v) => v.case.id === id)!;
  assert.equal(mine.audience, 'PUBLIC');
  assert.equal(mine.case.state, 'ACTION_APPROVED');
  assert.doesNotMatch(JSON.stringify(mine), /Lajur berat|Ukur kedalaman|USR-00[0-35-9]/, 'no staff notes or staff ids');
  assert.equal((mine.case.report as any).repairDetails, undefined, 'client-sent repair evidence is not stored');
  assert.equal(mine.case.report.upvotesCount, 0);
  assert.ok(workflowNotifications(re, { id: RE, role: 'PUBLIC_REPORTER' }).some((n) => n.caseId === id));
});

test('offline demo gateway attaches the segment assessment to a recommendation, like the server', async () => {
  const gw = new OfflineWorkflowGateway(
    INITIAL_COMMUNITY_REPORTS,
    (id) => (id === 'USR-008' ? 'OPERATIONS_MANAGER' : id === 'USR-006' ? 'FIELD_ENGINEER' : null),
    [],
    ROAD_SEGMENTS,
    async (c) => (c.username === 'ops' ? 'USR-008' : c.username === 'eng' ? 'USR-006' : null)
  );
  await gw.login({ username: 'ops', password: 'x' });
  const target = (await gw.listReports()).find((v) => v.case.state === 'NEEDS_REVIEW' && ROAD_SEGMENTS.some((s) => s.id === v.case.segmentId))!;
  let v = await gw.transition(target.case.id, { action: 'REVIEW_ACCEPT', reason: 'ok' }, target.case.version);
  v = await gw.transition(target.case.id, { action: 'REQUEST_INSPECTION', reason: 'ok', engineerId: 'USR-006', dueAt: DUE, instructions: '' }, v.case.version);
  await gw.login({ username: 'eng', password: 'x' });
  v = await gw.transition(target.case.id, { action: 'SUBMIT_INSPECTION', verdict: 'CONFIRMED', cvReview: { accepted: true, correctedClass: null }, measuredDepthCm: 5, measuredAreaM2: 1, severity: 'MODERATE', notes: 'ok' }, v.case.version);
  v = await gw.transition(target.case.id, { action: 'RECOMMEND_ACTION', treatment: 'Patching', urgency: 'ROUTINE', rationale: 'ok', assessmentId: null }, v.case.version);
  const rec = (v.case as any).recommendation;
  assert.equal(rec.assessment.engine, 'RULE_BASED');
  assert.equal(typeof rec.assessmentId, 'string');
});
