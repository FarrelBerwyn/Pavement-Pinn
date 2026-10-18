/**
 * F.E tab mapping (video 2026-10-18: "Belum Dimulai (0)" while an "Inspeksi dijadwalkan"
 * task sat under "Sedang Dikerjakan"). Every open state an assigned case can be in maps to
 * exactly one tab and stage; new and re-requested work is "Belum Dimulai".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldStage } from '../../src/features/work-orders/fieldStages';

const base = { inspection: null, inspectionReviews: [], workOrder: null } as any;
const wo = (status: string, decision?: string) => ({ status, submissions: decision ? [{ decision }] : [] }) as any;

const CASES: [string, any, string, string][] = [
  ['new SPK', { ...base, state: 'FIELD_INSPECTION_REQUESTED' }, 'TODO', 'NEW'],
  ['re-inspection requested', { ...base, state: 'FIELD_INSPECTION_REQUESTED', inspectionReviews: [{ decision: 'REINSPECTION_REQUESTED' }] }, 'TODO', 'REINSPECTION'],
  ['inspection sent', { ...base, state: 'INSPECTED' }, 'ACTIVE', 'INSPECTION_SENT'],
  ['verified, recommend', { ...base, state: 'INSPECTION_VERIFIED', inspection: { verdict: 'CONFIRMED' } }, 'ACTIVE', 'RECOMMEND'],
  ['verified, not confirmed', { ...base, state: 'INSPECTION_VERIFIED', inspection: { verdict: 'NOT_CONFIRMED' } }, 'ACTIVE', 'NOT_CONFIRMED'],
  ['recommendation sent', { ...base, state: 'ACTION_RECOMMENDED' }, 'ACTIVE', 'DECISION'],
  ['approved, no work order yet', { ...base, state: 'ACTION_APPROVED' }, 'ACTIVE', 'WORK_ORDER'],
  ['repair under way', { ...base, state: 'IN_PROGRESS', workOrder: wo('ISSUED') }, 'TODO', 'REPAIR'],
  ['repair evidence sent', { ...base, state: 'IN_PROGRESS', workOrder: wo('COMPLETED') }, 'ACTIVE', 'REPAIR_SENT'],
  ['rework requested', { ...base, state: 'IN_PROGRESS', workOrder: wo('IN_PROGRESS', 'REWORK_REQUESTED') }, 'TODO', 'REWORK'],
  ['resolved', { ...base, state: 'RESOLVED' }, 'DONE', 'RESOLVED'],
  ['closed', { ...base, state: 'CLOSED' }, 'DONE', 'CLOSED']
];

for (const [name, c, tab, key] of CASES) {
  test(`F.E stage: ${name} → ${tab}/${key}`, () => {
    const s = fieldStage(c);
    assert.equal(s.tab, tab);
    assert.equal(s.key, key);
  });
}

test('a local draft marks a new inspection as started, still under "Belum Dimulai"', () => {
  const s = fieldStage({ ...base, state: 'FIELD_INSPECTION_REQUESTED' }, { hasDraft: true });
  assert.equal(s.tab, 'TODO');
  assert.equal(s.key, 'DRAFT');
});

test('F.E is never in "Belum Dimulai" for an M.O-only state', () => {
  for (const state of ['NEEDS_REVIEW', 'VERIFIED']) assert.notEqual(fieldStage({ ...base, state }).tab, 'TODO');
});
