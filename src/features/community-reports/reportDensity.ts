/**
 * Which reports feed the "Report density" layer, and how trustworthy that source is.
 *
 * The layer shows where Regular Users (R.U., the public accounts) have reported damage.
 * It is a count of reports, not a damage level or a structural risk.
 *
 * Rules, in order:
 * 1. Severity filter: the same chip filter as the report markers.
 * 2. Creator: a report made in this session counts only if its creator role is a public
 *    role. The bundled demo reports have no creator account; they are written as citizen
 *    submissions and count as demo R.U. reports.
 * 3. Coordinates: a report without a finite latitude/longitude in range is left out.
 * 4. Duplicates: a report id counts once.
 * Every status counts (pending, verified, scheduled, repaired): the schema has no draft
 * or rejected state, and verification is shown on the report itself, not hidden here.
 *
 * There is no report store on the server (see docs/api/API_INVENTORY.md): reports live
 * in browser memory for one session. Until that changes the source is DEMO, never LIVE.
 */
import type { DamageReport, UserRole } from '../../types';

export const REGULAR_USER_ROLES: readonly UserRole[] = ['PUBLIC_REPORTER', 'PUBLIC_VIEWER'];

/** True only once reports are stored by a backend and loaded from it. */
export const REPORTS_PERSISTED = false;

export type DensityProvenance = 'LIVE' | 'DEMO' | 'NONE';

export interface DensitySelection {
  reports: DamageReport[];
  provenance: DensityProvenance;
  counts: { demoSeed: number; session: number };
  excluded: { notRegularUser: number; invalidCoordinates: number; duplicate: number };
}

export function matchesSeverityFilter(severity: DamageReport['severity'], filter: string): boolean {
  if (filter === 'CRITICAL') return severity === 'CRITICAL';
  if (filter === 'MODERATE') return severity === 'SEVERE' || severity === 'MODERATE';
  if (filter === 'MINOR') return severity === 'LIGHT';
  return true;
}

export function hasValidCoordinates(report: Pick<DamageReport, 'coordinates'>): boolean {
  const coordinates = report.coordinates as unknown;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
  const [lat, lng] = coordinates;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** A report without an origin is one of the bundled demo reports. */
export function isSessionReport(report: DamageReport): boolean {
  return report.origin === 'SESSION';
}

export function isRegularUserReport(report: DamageReport): boolean {
  if (!isSessionReport(report)) return true;
  return report.creatorRole !== undefined && REGULAR_USER_ROLES.includes(report.creatorRole);
}

export function selectRegularUserDensity(reports: DamageReport[], severityFilter: string): DensitySelection {
  const selected: DamageReport[] = [];
  const seen = new Set<string>();
  const excluded = { notRegularUser: 0, invalidCoordinates: 0, duplicate: 0 };
  const counts = { demoSeed: 0, session: 0 };

  for (const report of reports) {
    if (!matchesSeverityFilter(report.severity, severityFilter)) continue;
    if (!isRegularUserReport(report)) {
      excluded.notRegularUser += 1;
      continue;
    }
    if (!hasValidCoordinates(report)) {
      excluded.invalidCoordinates += 1;
      continue;
    }
    if (seen.has(report.id)) {
      excluded.duplicate += 1;
      continue;
    }
    seen.add(report.id);
    selected.push(report);
    if (isSessionReport(report)) counts.session += 1;
    else counts.demoSeed += 1;
  }

  const provenance: DensityProvenance = selected.length === 0 ? 'NONE' : REPORTS_PERSISTED ? 'LIVE' : 'DEMO';
  return { reports: selected, provenance, counts, excluded };
}
