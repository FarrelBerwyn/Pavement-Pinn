/**
 * Regression tests for two defects found after the restructure:
 *  1. upvotes were stored on the report, so they leaked between demo identities;
 *  2. an open report panel kept showing the count it was opened with.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addReport,
  createReportState,
  isUpvotedBy,
  replaceReport,
  resolveLiveReport,
  toggleUpvote,
  viewReportsAs
} from '../../src/features/community-reports/reportState';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import type { DamageReport } from '../../src/types';

const REPORTER = 'USR-004';
const VIEWER = 'USR-005';
const ENGINEER = 'USR-006';
const seed = () => createReportState(INITIAL_COMMUNITY_REPORTS, REPORTER);
const byId = (reports: DamageReport[], id: string) => reports.find((r) => r.id === id)!;
const upvotedSeed = INITIAL_COMMUNITY_REPORTS.find((r) => r.userUpvoted)!;
const plainSeed = INITIAL_COMMUNITY_REPORTS.find((r) => !r.userUpvoted)!;

test('seed upvote flags belong to the starting identity only', () => {
  const state = seed();
  assert.equal(byId(viewReportsAs(state, REPORTER), upvotedSeed.id).userUpvoted, true);
  assert.equal(byId(viewReportsAs(state, VIEWER), upvotedSeed.id).userUpvoted, false);
  assert.equal(byId(viewReportsAs(state, ENGINEER), upvotedSeed.id).userUpvoted, false);
});

test('the default identity sees the seed data unchanged (same counts and flags)', () => {
  const view = viewReportsAs(seed(), REPORTER);
  assert.equal(view.length, INITIAL_COMMUNITY_REPORTS.length);
  view.forEach((report, index) => {
    assert.equal(report.upvotesCount, INITIAL_COMMUNITY_REPORTS[index].upvotesCount);
    assert.equal(Boolean(report.userUpvoted), Boolean(INITIAL_COMMUNITY_REPORTS[index].userUpvoted));
  });
});

test('an upvote changes the shared count by one and only the voting identity is marked', () => {
  const before = seed();
  const after = toggleUpvote(before, VIEWER, plainSeed.id);
  assert.equal(byId(after.reports, plainSeed.id).upvotesCount, plainSeed.upvotesCount + 1);
  assert.equal(byId(viewReportsAs(after, VIEWER), plainSeed.id).userUpvoted, true);
  assert.equal(byId(viewReportsAs(after, REPORTER), plainSeed.id).userUpvoted, false);
  assert.equal(byId(viewReportsAs(after, ENGINEER), plainSeed.id).userUpvoted, false);
  // every identity sees the same count
  for (const account of [REPORTER, VIEWER, ENGINEER]) {
    assert.equal(byId(viewReportsAs(after, account), plainSeed.id).upvotesCount, plainSeed.upvotesCount + 1);
  }
});

test('toggling twice restores count and flag; two identities each add one', () => {
  let state = seed();
  state = toggleUpvote(toggleUpvote(state, VIEWER, plainSeed.id), VIEWER, plainSeed.id);
  assert.equal(byId(state.reports, plainSeed.id).upvotesCount, plainSeed.upvotesCount);
  assert.equal(isUpvotedBy(state.ledger, VIEWER, plainSeed.id), false);

  state = toggleUpvote(toggleUpvote(state, VIEWER, plainSeed.id), ENGINEER, plainSeed.id);
  assert.equal(byId(state.reports, plainSeed.id).upvotesCount, plainSeed.upvotesCount + 2);
  // the engineer removing their vote does not remove the viewer's
  state = toggleUpvote(state, ENGINEER, plainSeed.id);
  assert.equal(byId(state.reports, plainSeed.id).upvotesCount, plainSeed.upvotesCount + 1);
  assert.equal(isUpvotedBy(state.ledger, VIEWER, plainSeed.id), true);
});

test('removing a seed upvote as its owner decrements the count once', () => {
  const after = toggleUpvote(seed(), REPORTER, upvotedSeed.id);
  assert.equal(byId(after.reports, upvotedSeed.id).upvotesCount, upvotedSeed.upvotesCount - 1);
  assert.equal(byId(viewReportsAs(after, REPORTER), upvotedSeed.id).userUpvoted, false);
});

test('upvoting an unknown report is a no-op; inputs are never mutated', () => {
  const state = seed();
  const frozen = JSON.stringify(state);
  assert.equal(toggleUpvote(state, VIEWER, 'NO-SUCH-REPORT'), state);
  toggleUpvote(state, VIEWER, plainSeed.id);
  assert.equal(JSON.stringify(state), frozen);
});

test('a new report is listed first and its pre-set upvote belongs to its author', () => {
  const created: DamageReport = { ...plainSeed, id: 'RP-TEST-1', upvotesCount: 1, userUpvoted: true };
  const state = addReport(seed(), VIEWER, created);
  assert.equal(state.reports[0].id, 'RP-TEST-1');
  assert.equal(viewReportsAs(state, VIEWER)[0].userUpvoted, true);
  assert.equal(viewReportsAs(state, REPORTER)[0].userUpvoted, false);
  // the author withdrawing the vote brings the count to zero, not below
  assert.equal(toggleUpvote(state, VIEWER, 'RP-TEST-1').reports[0].upvotesCount, 0);
});

test('editing a report keeps its vote count and vote ownership', () => {
  let state = toggleUpvote(seed(), VIEWER, plainSeed.id);
  const edited: DamageReport = { ...byId(viewReportsAs(state, REPORTER), plainSeed.id), description: 'edited', upvotesCount: 999, userUpvoted: true };
  state = replaceReport(state, edited);
  const stored = byId(state.reports, plainSeed.id);
  assert.equal(stored.description, 'edited');
  assert.equal(stored.upvotesCount, plainSeed.upvotesCount + 1);
  assert.equal(byId(viewReportsAs(state, REPORTER), plainSeed.id).userUpvoted, false);
  assert.equal(byId(viewReportsAs(state, VIEWER), plainSeed.id).userUpvoted, true);
});

test('an open panel resolves to the current report, so its count is never stale', () => {
  const state = seed();
  const snapshot = byId(viewReportsAs(state, VIEWER), plainSeed.id); // what a panel holds
  const after = toggleUpvote(state, VIEWER, plainSeed.id);
  const live = resolveLiveReport(snapshot, viewReportsAs(after, VIEWER))!;
  assert.equal(snapshot.upvotesCount, plainSeed.upvotesCount);
  assert.equal(live.upvotesCount, plainSeed.upvotesCount + 1);
  assert.equal(live.userUpvoted, true);
});

test('resolveLiveReport keeps a snapshot that is not in the list and passes null through', () => {
  const orphan: DamageReport = { ...plainSeed, id: 'ORPHAN' };
  assert.equal(resolveLiveReport(orphan, INITIAL_COMMUNITY_REPORTS), orphan);
  assert.equal(resolveLiveReport(null, INITIAL_COMMUNITY_REPORTS), null);
  // unchanged reports resolve to the identical object (no needless re-render)
  assert.equal(resolveLiveReport(plainSeed, INITIAL_COMMUNITY_REPORTS), plainSeed);
});
