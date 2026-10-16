/**
 * Pilot corridors are configuration (Dokumen Induk v3 D-03): Narogong is corridor 1,
 * Karawang corridor 2, and reports in either are in scope.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { findCorridor, PILOT_CORRIDORS } from '../../src/domain/corridors';
import { DEMO_CV_PROVIDER, screenReport } from '../../src/domain/workflow/screening';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';

const at = (coordinates: [number, number]) => ({ ...INITIAL_COMMUNITY_REPORTS[0], id: 'X', coordinates });
const outOfScope = (coordinates: [number, number]) =>
  screenReport(at(coordinates), '2026-10-16T00:00:00Z', [], DEMO_CV_PROVIDER).reasons.some((r) => r.startsWith('OUT_OF_SCOPE'));

test('corridors are ordered Narogong first, Karawang second', () => {
  assert.deepEqual(PILOT_CORRIDORS.map((c) => c.id), ['NRG', 'KRW']);
});

test('a report on Jalan Raya Narogong is in scope', () => {
  assert.equal(findCorridor(-6.32, 106.99)?.id, 'NRG');
  assert.equal(outOfScope([-6.32, 106.99]), false);
});

test('a report in Karawang Klari–Jatisari is still in scope', () => {
  assert.equal(findCorridor(-6.36, 107.4)?.id, 'KRW');
  assert.equal(outOfScope([-6.36, 107.4]), false);
});

test('a report in central Jakarta is flagged OUT_OF_SCOPE, not rejected', () => {
  assert.equal(findCorridor(-6.2, 106.8), null);
  assert.equal(outOfScope([-6.2, 106.8]), true);
});
