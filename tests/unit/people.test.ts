/**
 * One person, several accounts: the links match the demo credentials, linked accounts count
 * as the same assignee, and a different engineer never sees or acts on someone else's task.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINKED_ACCOUNTS, personOf, samePerson } from '../../src/domain/identity/people';
import { DEMO_CREDENTIALS } from '../../src/data/reference/demoCredentials';
import { MemoryCaseStore, WorkflowService } from '../../src/domain/workflow/service';
import { fieldTasks } from '../../src/features/work-orders/fieldTasks';
import type { Actor } from '../../src/domain/workflow/model';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import { DEMO_CV_PROVIDER } from '../../src/domain/workflow/screening';

test('linked accounts mirror the demo credentials (modern account first)', () => {
  const fromCredentials = DEMO_CREDENTIALS.filter((c) => c.accounts.CLASSIC_PORTAL).map((c) => [c.accounts.MODERN_APP, c.accounts.CLASSIC_PORTAL]);
  assert.deepEqual([...LINKED_ACCOUNTS].map((g) => [...g]).sort(), fromCredentials.sort());
  assert.equal(personOf('USR-001'), 'USR-006');
  assert.ok(samePerson('USR-001', 'USR-006'));
  assert.ok(!samePerson('USR-006', 'USR-099'));
  assert.ok(!samePerson(null, null));
});

test('a different engineer cannot see or submit an assigned inspection', async () => {
  const store = new MemoryCaseStore();
  let seq = 0;
  const roles: Record<string, string> = { 'USR-004': 'PUBLIC_REPORTER', 'USR-008': 'OPERATIONS_MANAGER', 'USR-006': 'FIELD_ENGINEER', 'USR-001': 'FIELD_ENGINEER', 'USR-099': 'FIELD_ENGINEER' };
  const service = new WorkflowService(store, { now: () => new Date().toISOString(), newId: (prefix: string) => `${prefix}-${++seq}`, roleOf: (id: string) => (roles[id] as any) ?? null, cv: DEMO_CV_PROVIDER } as any);
  const RE: Actor = { id: 'USR-004', role: 'PUBLIC_REPORTER', kind: 'DEMO_ACCOUNT' };
  const MO: Actor = { id: 'USR-008', role: 'OPERATIONS_MANAGER', kind: 'DEMO_ACCOUNT' };
  const FE_CLASSIC: Actor = { id: 'USR-001', role: 'FIELD_ENGINEER', kind: 'DEMO_ACCOUNT' };
  const OTHER: Actor = { id: 'USR-099', role: 'FIELD_ENGINEER', kind: 'DEMO_ACCOUNT' };
  const { id: _i, status: _s, creatorAccountId: _c, creatorRole: _r, origin: _o, createdAt: _t, ...draft } = INITIAL_COMMUNITY_REPORTS[0];
  void _i; void _s; void _c; void _r; void _o; void _t;
  const submitted = await service.submitReport(draft as any, RE, null);
  assert.ok(submitted.ok, JSON.stringify(submitted));
  let c = (submitted as any).value;
  const step = async (actor: Actor, command: any) => {
    const r: any = await service.transition(c.id, command, actor, c.version);
    assert.ok(r.ok, JSON.stringify(r));
    c = r.value;
  };
  await step(MO, { action: 'REVIEW_ACCEPT', reason: 'ok' });
  await step(MO, { action: 'REQUEST_INSPECTION', reason: 'ok', engineerId: 'USR-006', dueAt: new Date(Date.now() + 86400000).toISOString(), instructions: '' });

  const views = [{ audience: 'STAFF', case: c, availableActions: [] }] as any;
  assert.equal(fieldTasks(views, OTHER.id).length, 0, 'another engineer has no task');
  assert.equal(fieldTasks(views, FE_CLASSIC.id).length, 1, 'same person on the classic portal has it');
  const blocked: any = await service.transition(c.id, { action: 'SUBMIT_INSPECTION', verdict: 'CONFIRMED', cvReview: { accepted: true, correctedClass: null }, measuredDepthCm: 1, measuredAreaM2: 1, severity: 'LIGHT', notes: 'x' } as any, OTHER, c.version);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, 'FORBIDDEN');
});
