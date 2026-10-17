/**
 * Unsent inspection form, kept in this browser so a refresh does not lose the engineer's
 * progress. Tied to the case version: once the case moves on (submitted, or M.O asks for a
 * re-inspection) an older draft no longer applies. Not shared across devices — the UI says so.
 */
import type { ReportCase } from '../../domain/workflow/model';

export interface InspectionDraft {
  version: number;
  savedAt: string;
  verdict: 'CONFIRMED' | 'NOT_CONFIRMED';
  cvAccepted: boolean;
  correctedClass: string;
  depth: string;
  area: string;
  severity: 'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  notes: string;
  /** Kept when storage allows; large photos may not fit, the text fields still do. */
  evidencePhotoUrl?: string | null;
}

const key = (caseId: string) => `pavement-pinn.inspection-draft.${caseId}`;

export function loadDraft(c: Pick<ReportCase, 'id' | 'version' | 'state'>): InspectionDraft | null {
  if (c.state !== 'FIELD_INSPECTION_REQUESTED') return null;
  try {
    const raw = localStorage.getItem(key(c.id));
    if (!raw) return null;
    const d = JSON.parse(raw) as InspectionDraft;
    if (d.version !== c.version) {
      localStorage.removeItem(key(c.id));
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(caseId: string, draft: InspectionDraft): void {
  try {
    localStorage.setItem(key(caseId), JSON.stringify(draft));
  } catch {
    try {
      // Probably over quota because of the photo: keep the typed fields at least.
      localStorage.setItem(key(caseId), JSON.stringify({ ...draft, evidencePhotoUrl: null }));
    } catch {
      // Storage unavailable: the form still works, the draft just is not kept.
    }
  }
}

export function clearDraft(caseId: string): void {
  try {
    localStorage.removeItem(key(caseId));
  } catch {
    // ignore
  }
}
