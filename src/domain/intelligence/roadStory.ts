/**
 * Road Story (spec §21.5): one chronological history per road segment, built from the
 * canonical records. Every entry says what kind of knowledge it is — OBSERVED (people
 * saw it), PREDICTED (an engine estimated it), SIMULATED (a what-if), DECISION (a human
 * workflow step) — and those kinds are never merged without a label.
 */
import type { ReportCase } from '../workflow/model';
import type { EngineeringAssessment } from './assessment';

export type StoryKind = 'OBSERVED' | 'PREDICTED' | 'SIMULATED' | 'DECISION';

export interface StoryEntry {
  at: string;
  kind: StoryKind;
  title: string;
  detail: string;
  dataStatus: string;
  reportId?: string;
}

export function buildRoadStory(
  segmentId: string,
  cases: ReportCase[],
  assessments: EngineeringAssessment[] = [],
  simulations: Array<{ at: string; summary: string }> = [],
  audience: 'STAFF' | 'PUBLIC' = 'PUBLIC'
): StoryEntry[] {
  const entries: StoryEntry[] = [];
  for (const c of cases.filter((x) => x.segmentId === segmentId)) {
    entries.push({
      at: c.createdAt,
      kind: 'OBSERVED',
      title: `Laporan warga ${c.id}`,
      detail: `${c.report.damageTypeLabel} · ${c.report.severity}`,
      dataStatus: c.dataStatus,
      reportId: c.id
    });
    if (c.inspection) {
      entries.push({
        at: c.inspection.inspectedAt,
        kind: 'OBSERVED',
        title: 'Inspeksi lapangan',
        detail: audience === 'STAFF' ? `${c.inspection.verdict} · ${c.inspection.severity} · ${c.inspection.notes}` : `${c.inspection.verdict === 'CONFIRMED' ? 'Kerusakan terkonfirmasi' : 'Tidak terkonfirmasi'}`,
        dataStatus: 'OBSERVED',
        reportId: c.id
      });
    }
    if (c.recommendation && audience === 'STAFF') {
      entries.push({ at: c.recommendation.recommendedAt, kind: 'DECISION', title: 'Rekomendasi penanganan', detail: `${c.recommendation.treatment} (${c.recommendation.urgency})`, dataStatus: 'USER_GENERATED', reportId: c.id });
    }
    for (const a of c.approvals) {
      if (audience !== 'STAFF' && a.decision !== 'APPROVED') continue;
      entries.push({ at: a.decidedAt, kind: 'DECISION', title: a.decision === 'APPROVED' ? 'Penanganan disetujui' : 'Rekomendasi dikembalikan', detail: audience === 'STAFF' ? a.reason : '', dataStatus: 'USER_GENERATED', reportId: c.id });
    }
    if (c.workOrder) {
      entries.push({ at: c.workOrder.issuedAt, kind: 'DECISION', title: 'Perintah kerja internal diterbitkan', detail: 'Bukan dokumen SPK resmi', dataStatus: 'USER_GENERATED', reportId: c.id });
      if (c.workOrder.completedAt) entries.push({ at: c.workOrder.completedAt, kind: 'DECISION', title: 'Pekerjaan lapangan selesai', detail: '', dataStatus: 'USER_GENERATED', reportId: c.id });
    }
    const resolved = c.history.find((h) => h.action === 'RESOLVE');
    if (resolved) entries.push({ at: resolved.at, kind: 'OBSERVED', title: 'Perbaikan terverifikasi', detail: '', dataStatus: 'OBSERVED', reportId: c.id });
  }
  for (const a of assessments.filter((x) => x.segmentId === segmentId)) {
    entries.push({ at: a.createdAt, kind: 'PREDICTED', title: `Estimasi risiko: ${a.risk}`, detail: `Skor kondisi prototipe ${a.outputs.conditionScorePrototype} (${a.engine}, ${a.validationStatus})`, dataStatus: a.dataStatus });
  }
  for (const s of simulations) {
    entries.push({ at: s.at, kind: 'SIMULATED', title: 'Skenario What-If', detail: s.summary, dataStatus: 'SIMULATED' });
  }
  return entries.sort((x, y) => Date.parse(y.at) - Date.parse(x.at));
}
