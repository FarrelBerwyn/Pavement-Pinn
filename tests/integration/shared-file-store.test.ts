/**
 * Two server processes on one data directory (live incident 2026-10-18: :3001 and :5173 each
 * kept their own in-memory copy of .data/workflow.json; :3001 overwrote REP-0D48E30E6358447F
 * that :5173 had saved). Two store instances here = two processes: separate caches, one file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FileCaseStore } from '../../server/repositories/fileCaseStore';
import { StoreConflictError, WorkflowService } from '../../src/domain/workflow/service';
import { DEMO_CV_PROVIDER } from '../../src/domain/workflow/screening';
import type { Actor } from '../../src/domain/workflow/model';
import type { ReportDraft } from '../../src/domain/reports/reportFactory';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';

const CITIZEN: Actor = { id: 'USR-004', role: 'PUBLIC_REPORTER', kind: 'DEMO_ACCOUNT' };
const OPS: Actor = { id: 'USR-008', role: 'OPERATIONS_MANAGER', kind: 'DEMO_ACCOUNT' };
const ROLES: Record<string, 'PUBLIC_REPORTER' | 'OPERATIONS_MANAGER'> = { 'USR-004': 'PUBLIC_REPORTER', 'USR-008': 'OPERATIONS_MANAGER' };

function draft(): ReportDraft {
  const { id, status, creatorAccountId, creatorRole, origin, createdAt, workflowState, caseVersion, ...content } = INITIAL_COMMUNITY_REPORTS[0];
  void id; void status; void creatorAccountId; void creatorRole; void origin; void createdAt; void workflowState; void caseVersion;
  return content;
}

function serviceOn(dir: string, tag: string) {
  let seq = 0;
  return new WorkflowService(new FileCaseStore(dir), {
    now: () => new Date().toISOString(),
    newId: (prefix) => `${prefix}-${tag}${++seq}`,
    roleOf: (id) => ROLES[id] ?? null,
    cv: DEMO_CV_PROVIDER
  });
}

const tempDir = () => mkdtempSync(path.join(tmpdir(), 'pinn-store-'));

test('a second store instance sees writes made by the first (no stale cache)', async (t) => {
  const dir = tempDir();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const a = new FileCaseStore(dir);
  const b = new FileCaseStore(dir);
  assert.equal((await b.load()).revision, 0);
  await a.commit({ revision: 1, cases: [], audit: [{ id: 'AUD-1' } as never] });
  const seen = await b.load();
  assert.equal(seen.revision, 1);
  assert.equal(seen.audit.length, 1);
});

test('a commit built on a stale snapshot is refused, never overwrites the newer file', async (t) => {
  const dir = tempDir();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const a = new FileCaseStore(dir);
  const b = new FileCaseStore(dir);
  await a.load();
  await b.load();
  await b.commit({ revision: 1, cases: [], audit: [{ id: 'AUD-B' } as never] });
  await assert.rejects(a.commit({ revision: 1, cases: [], audit: [{ id: 'AUD-A' } as never] }), StoreConflictError);
  const disk = await new FileCaseStore(dir).load();
  assert.deepEqual(disk.audit.map((e) => e.id), ['AUD-B'], 'the newer write survives');
});

test('two services on one data directory keep every report, also when writing at the same time', async (t) => {
  const dir = tempDir();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const port3001 = serviceOn(dir, 'A');
  const port5173 = serviceOn(dir, 'B');

  const first = await port3001.submitReport(draft(), CITIZEN, null);
  assert.ok(first.ok);
  // :5173 had loaded nothing yet; it must see :3001's report and add its own without dropping it.
  const second = await port5173.submitReport(draft(), CITIZEN, null);
  assert.ok(second.ok);
  const both = [first.value.id, second.value.id];

  // Simultaneous writes from both "processes".
  const [x, y] = await Promise.all([port3001.submitReport(draft(), CITIZEN, null), port5173.submitReport(draft(), CITIZEN, null)]);
  assert.ok(x.ok && y.ok);
  both.push(x.value.id, y.value.id);

  // A transition made through one server is visible through the other.
  const accepted = await port5173.transition(first.value.id, { action: 'REVIEW_ACCEPT', reason: 'Foto jelas.' }, OPS, first.value.version);
  assert.ok(accepted.ok, JSON.stringify(accepted));
  assert.equal((await port3001.getCase(first.value.id))?.state, 'VERIFIED');

  const ids = (await new FileCaseStore(dir).load()).cases.map((c) => c.id);
  for (const id of both) assert.ok(ids.includes(id), `${id} kept on disk`);
  assert.equal(ids.length, 4);
});
