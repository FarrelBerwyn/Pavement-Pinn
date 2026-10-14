/**
 * Source of the "Report density" layer: Regular User reports only, valid coordinates,
 * each report once, same severity filter as the markers, and an honest provenance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORTS_PERSISTED,
  hasValidCoordinates,
  matchesSeverityFilter,
  selectRegularUserDensity
} from '../../src/features/community-reports/reportDensity';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import type { DamageReport, UserRole } from '../../src/types';

const seed = INITIAL_COMMUNITY_REPORTS;

function sessionReport(id: string, creatorRole: UserRole, patch: Partial<DamageReport> = {}): DamageReport {
  return { ...seed[0], id, origin: 'SESSION', creatorRole, ...patch };
}

test('the bundled reports are demo R.U. reports and the source is never reported as live', () => {
  const selection = selectRegularUserDensity(seed, 'ALL');
  assert.equal(selection.reports.length, seed.length);
  assert.equal(selection.counts.demoSeed, seed.length);
  assert.equal(selection.counts.session, 0);
  assert.equal(REPORTS_PERSISTED, false);
  assert.equal(selection.provenance, 'DEMO');
});

test('session reports count only when a public account created them', () => {
  const reports = [
    sessionReport('S-PUB', 'PUBLIC_REPORTER'),
    sessionReport('S-VIEW', 'PUBLIC_VIEWER'),
    sessionReport('S-ENG', 'FIELD_ENGINEER'),
    sessionReport('S-OPS', 'OPERATIONS_MANAGER'),
    { ...seed[0], id: 'S-UNKNOWN', origin: 'SESSION' as const }
  ];
  const selection = selectRegularUserDensity(reports, 'ALL');
  assert.deepEqual(
    selection.reports.map((r) => r.id),
    ['S-PUB', 'S-VIEW']
  );
  assert.equal(selection.excluded.notRegularUser, 3);
  assert.equal(selection.counts.session, 2);
});

test('reports without valid coordinates are left out and counted as excluded', () => {
  const bad = [
    sessionReport('NAN', 'PUBLIC_REPORTER', { coordinates: [Number.NaN, 107] }),
    sessionReport('RANGE', 'PUBLIC_REPORTER', { coordinates: [-6.3, 270] }),
    sessionReport('MISSING', 'PUBLIC_REPORTER', { coordinates: undefined as unknown as [number, number] }),
    sessionReport('OK', 'PUBLIC_REPORTER')
  ];
  const selection = selectRegularUserDensity(bad, 'ALL');
  assert.deepEqual(
    selection.reports.map((r) => r.id),
    ['OK']
  );
  assert.equal(selection.excluded.invalidCoordinates, 3);
  assert.equal(hasValidCoordinates({ coordinates: [-6.3, 107.3] }), true);
});

test('a report id counts once', () => {
  const selection = selectRegularUserDensity([seed[0], seed[0], seed[1]], 'ALL');
  assert.equal(selection.reports.length, 2);
  assert.equal(selection.excluded.duplicate, 1);
});

test('density uses the same severity filter as the markers, and only narrows it', () => {
  for (const filter of ['ALL', 'CRITICAL', 'MODERATE', 'MINOR']) {
    const markerSet = seed.filter((r) => matchesSeverityFilter(r.severity, filter)).map((r) => r.id);
    const densitySet = selectRegularUserDensity(seed, filter).reports.map((r) => r.id);
    assert.ok(densitySet.every((id) => markerSet.includes(id)), filter);
    assert.equal(densitySet.length, markerSet.length, filter);
  }
});

test('no reports, or no matching reports, gives an empty source rather than invented data', () => {
  assert.equal(selectRegularUserDensity([], 'ALL').provenance, 'NONE');
  const onlyOfficial = selectRegularUserDensity([sessionReport('S-ENG', 'FIELD_ENGINEER')], 'ALL');
  assert.equal(onlyOfficial.reports.length, 0);
  assert.equal(onlyOfficial.provenance, 'NONE');
});

test('every status counts: verification is shown on the report, not hidden from density', () => {
  const statuses: DamageReport['status'][] = ['PENDING', 'VERIFIED_BY_ENGINEER', 'SCHEDULED_FOR_REPAIR', 'REPAIRED'];
  const reports = statuses.map((status, i) => sessionReport(`ST-${i}`, 'PUBLIC_REPORTER', { status }));
  assert.equal(selectRegularUserDensity(reports, 'ALL').reports.length, statuses.length);
});
