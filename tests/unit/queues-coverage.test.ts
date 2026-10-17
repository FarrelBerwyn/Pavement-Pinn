/**
 * Every open workflow state is visible somewhere in the M.O queue, so a case never drops
 * out of operational monitoring (found in the live E2E run: verified inspections vanished).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKFLOW_STATES } from '../../src/domain/workflow/model';
import { operationsQueue } from '../../src/features/workflow/queues';

test('every open state, for both inspection verdicts, lands in an operations bucket', () => {
  const transient = new Set(['SUBMITTED', 'AI_SCREENING', 'CLOSED']);
  for (const state of WORKFLOW_STATES.filter((s) => !transient.has(s))) {
    for (const verdict of ['CONFIRMED', 'NOT_CONFIRMED'] as const) {
      const c = { id: `X-${state}`, state, report: { severity: 'MODERATE' }, inspection: { verdict }, createdAt: '2026-10-17T00:00:00Z', updatedAt: '2026-10-17T00:00:00Z' } as any;
      const buckets = operationsQueue([c]).filter((b) => b.items.some((i) => i.id === c.id));
      assert.equal(buckets.length, 1, `${state}/${verdict} appears in exactly one bucket (got ${buckets.map((b) => b.key)})`);
    }
  }
});

test('a fresh citizen report is listed before seeded sample cases, whatever their severity', () => {
  // Live incident REP-F35AF0965161FCA8: a MODERATE real report sat below 15 SYNTHETIC samples.
  const mk = (id: string, severity: string, dataStatus: string, createdAt: string) =>
    ({ id, state: 'NEEDS_REVIEW', dataStatus, report: { severity }, createdAt, updatedAt: createdAt }) as any;
  const cases = [
    mk('SAMPLE-CRIT', 'CRITICAL', 'SYNTHETIC', '2026-10-16T00:00:00Z'),
    mk('SAMPLE-SEV', 'SEVERE', 'SYNTHETIC', '2026-10-16T00:00:00Z'),
    mk('REAL-NEW', 'MODERATE', 'OBSERVED', '2026-10-17T14:23:00Z'),
    mk('REAL-CRIT', 'CRITICAL', 'OBSERVED', '2026-10-17T10:00:00Z')
  ];
  const review = operationsQueue(cases).find((b) => b.items.some((i) => i.id === 'REAL-NEW'))!;
  assert.deepEqual(review.items.map((i) => i.id), ['REAL-CRIT', 'REAL-NEW', 'SAMPLE-CRIT', 'SAMPLE-SEV']);
});
