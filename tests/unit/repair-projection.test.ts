/**
 * The "after" photo on the map sheet: real cases show only F.E evidence (verified after M.O),
 * sample cases only an illustrative photo when repaired — never a verification claim.
 * Found 2026-10-18: an unrepaired sample (NEEDS_REVIEW) showed "✓ Terverifikasi M.O".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { reportForDisplay } from '../../src/domain/workflow/projections';

const sampleRepair = { afterPhotoUrl: 'https://example.org/after.jpg', repairMethod: 'Contoh', repairedPciImprovement: 'PCI 28 → 88' };
const base = (over: Record<string, unknown>) =>
  ({ id: 'REP-X', version: 1, history: [], recommendation: null, workOrder: null, report: { id: 'REP-X', repairDetails: sampleRepair }, ...over }) as any;

test('an unrepaired sample has no after photo and no verification claim', () => {
  const r = reportForDisplay(base({ dataStatus: 'SYNTHETIC', state: 'NEEDS_REVIEW' }));
  assert.equal(r.repairDetails, undefined);
});

test('a repaired sample keeps its after photo, marked illustrative, not verified', () => {
  const r = reportForDisplay(base({ dataStatus: 'SYNTHETIC', state: 'RESOLVED' }));
  assert.equal(r.repairDetails?.illustrative, true);
  assert.notEqual(r.repairDetails?.verified, true);
});

test('a real case shows F.E evidence: pending until M.O verifies, verified after', () => {
  const wo = { completionPhotoUrl: 'data:image/png;base64,QUFB', completedAt: '2026-10-18T00:00:00Z' };
  const pending = reportForDisplay(base({ dataStatus: 'USER_GENERATED', state: 'IN_PROGRESS', workOrder: wo, report: { id: 'REP-X' } }));
  assert.equal(pending.repairDetails?.verified, false);
  const done = reportForDisplay(base({ dataStatus: 'USER_GENERATED', state: 'RESOLVED', workOrder: wo, report: { id: 'REP-X' } }));
  assert.equal(done.repairDetails?.verified, true);
  const none = reportForDisplay(base({ dataStatus: 'USER_GENERATED', state: 'IN_PROGRESS', report: { id: 'REP-X', repairDetails: sampleRepair } }));
  assert.equal(none.repairDetails, undefined, 'no stock after photo for a real case');
});
