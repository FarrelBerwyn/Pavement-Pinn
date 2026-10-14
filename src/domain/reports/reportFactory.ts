/**
 * Report factory — the single place where a new community damage report object is built.
 *
 * Responsibility: the identity, creator metadata, defaults and shape validation of a
 * report made in this browser session. Callers still assemble the report content (form
 * values, segment, photo, CV analysis, WIM correlation) exactly as before.
 *
 * Not its job: storing reports (AppStateProvider), deciding who may edit them
 * (`canEditReport` in src/domain/access.ts), status transitions, assignment,
 * SPK, PINN calculations or report-density rules.
 *
 * DEMO IDENTITY: the creator is the demo account picked in the session switcher, which
 * is selected client-side without credentials. `creatorAccountId` is therefore a demo
 * attribution, not an authenticated owner, and nothing created here is persisted.
 */
import type { DamageReport, UserRole } from '../../types';
import { ALL_ROLES } from '../access';
import { hasValidCoordinates } from '../geo';

/** The slice of the session account the factory needs. */
export interface ReportCreator {
  id: string;
  role: UserRole;
}

/** Fields owned by the factory; everything else is the caller's report content. */
export type ReportDraft = Omit<DamageReport, 'id' | 'status' | 'creatorAccountId' | 'creatorRole' | 'origin' | 'createdAt'>;

export class ReportCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportCreationError';
  }
}

const KNOWN_ROLES: readonly UserRole[] = ALL_ROLES;

/** `REP-` plus 16 hex characters (64 bits) from the platform CSPRNG. */
export function generateReportId(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new ReportCreationError('No secure random source is available to generate a report id.');
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(8));
  return `REP-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * Build a validated, session-created report. Throws `ReportCreationError` instead of
 * returning an incomplete report; callers show the message and create nothing.
 */
export function createSessionReport(draft: ReportDraft, creator: ReportCreator | null | undefined, now: Date = new Date()): DamageReport {
  if (!creator || typeof creator.id !== 'string' || creator.id.trim() === '' || !KNOWN_ROLES.includes(creator.role)) {
    throw new ReportCreationError('No valid account is selected; the report was not created.');
  }
  if (!draft || typeof draft.segmentId !== 'string' || draft.segmentId === '' || typeof draft.segmentName !== 'string' || draft.segmentName === '') {
    throw new ReportCreationError('The report has no road segment.');
  }
  if (!hasValidCoordinates(draft)) {
    throw new ReportCreationError('The report location is not a valid latitude/longitude.');
  }
  if (!Number.isFinite(draft.estimatedDepthCm) || !Number.isFinite(draft.estimatedAreaM2)) {
    throw new ReportCreationError('Damage depth and area must be numbers.');
  }
  if (typeof draft.description !== 'string' || !draft.damageType || !draft.severity) {
    throw new ReportCreationError('The report is missing its description, damage type or severity.');
  }
  if (Number.isNaN(now.getTime())) {
    throw new ReportCreationError('The creation time is invalid.');
  }

  // Factory-owned fields are written last so caller content can never override them.
  return {
    ...draft,
    id: generateReportId(),
    status: 'PENDING',
    creatorAccountId: creator.id,
    creatorRole: creator.role,
    origin: 'SESSION',
    createdAt: now.toISOString()
  };
}
