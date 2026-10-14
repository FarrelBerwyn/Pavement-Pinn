/**
 * Pure state helpers for community reports: per-identity upvotes and keeping an open
 * report panel in step with the shared report list.
 *
 * Why this exists: the upvote flag used to be stored on the report itself
 * (`report.userUpvoted`), so an upvote made as one demo identity showed up as
 * "already upvoted" for every other identity, and an open detail panel kept showing
 * the count it was opened with. Upvotes are now tracked per account in a ledger; the
 * count stays on the report because it is shared by everyone.
 *
 * Everything is in-memory demonstration state (no backend, reset on refresh).
 */
import type { DamageReport } from '../../types';

/** accountId -> reportId -> upvoted */
export type UpvoteLedger = Readonly<Record<string, Readonly<Record<string, boolean>>>>;

export interface ReportState {
  /** Reports as stored. `userUpvoted` on these objects is NOT authoritative. */
  reports: DamageReport[];
  ledger: UpvoteLedger;
}

/**
 * Seed data marks some reports as upvoted by "the user". Those flags belong to the
 * identity the application starts with, so they are assigned to that account only.
 */
export function createReportState(seedReports: DamageReport[], seedOwnerAccountId: string): ReportState {
  const owned: Record<string, boolean> = {};
  for (const report of seedReports) {
    if (report.userUpvoted) owned[report.id] = true;
  }
  return { reports: seedReports, ledger: { [seedOwnerAccountId]: owned } };
}

export function isUpvotedBy(ledger: UpvoteLedger, accountId: string, reportId: string): boolean {
  return ledger[accountId]?.[reportId] === true;
}

function setUpvote(ledger: UpvoteLedger, accountId: string, reportId: string, value: boolean): UpvoteLedger {
  return { ...ledger, [accountId]: { ...(ledger[accountId] ?? {}), [reportId]: value } };
}

/** Reports as one identity sees them: shared counts, that identity's own upvote flags. */
export function viewReportsAs(state: ReportState, accountId: string): DamageReport[] {
  return state.reports.map((report) => {
    const upvoted = isUpvotedBy(state.ledger, accountId, report.id);
    return Boolean(report.userUpvoted) === upvoted ? report : { ...report, userUpvoted: upvoted };
  });
}

/** Toggle one identity's upvote. The shared count moves by exactly one. */
export function toggleUpvote(state: ReportState, accountId: string, reportId: string): ReportState {
  if (!state.reports.some((report) => report.id === reportId)) return state;
  const wasUpvoted = isUpvotedBy(state.ledger, accountId, reportId);
  return {
    reports: state.reports.map((report) =>
      report.id === reportId ? { ...report, upvotesCount: report.upvotesCount + (wasUpvoted ? -1 : 1) } : report
    ),
    ledger: setUpvote(state.ledger, accountId, reportId, !wasUpvoted)
  };
}

/** A new report goes first; if its author pre-upvoted it, that belongs to the author only. */
export function addReport(state: ReportState, accountId: string, report: DamageReport): ReportState {
  return {
    reports: [report, ...state.reports],
    ledger: report.userUpvoted ? setUpvote(state.ledger, accountId, report.id, true) : state.ledger
  };
}

/** Replace a report's content. Upvote ownership and the shared count are not editable. */
export function replaceReport(state: ReportState, updated: DamageReport): ReportState {
  return {
    ...state,
    reports: state.reports.map((report) =>
      report.id === updated.id ? { ...updated, upvotesCount: report.upvotesCount } : report
    )
  };
}

/**
 * The current version of a report that a panel is holding a snapshot of.
 * Returns the snapshot itself when the report is not (or no longer) in the list.
 */
export function resolveLiveReport<T extends DamageReport | null | undefined>(snapshot: T, reports: DamageReport[]): T | DamageReport {
  if (!snapshot) return snapshot;
  return reports.find((report) => report.id === snapshot.id) ?? snapshot;
}
