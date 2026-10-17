/**
 * Notifications derived from the shared workflow history, so the bell tells each role
 * about the hand-offs that concern it (R.E → M.O → F.E → D.M) and nothing invented.
 * Pure: the caller passes the loaded views and the actor; read marks are kept by the
 * caller (per browser — they are a viewing convenience, not workflow data).
 */
import type { ReportCase, TransitionRecord, WorkflowAction } from '../../domain/workflow/model';
import type { PublicReportView } from '../../domain/workflow/projections';
import type { ReportView } from '../../services/api/workflowClient';

export type NotificationKind = 'ASSIGNED' | 'REVIEW' | 'DECISION' | 'PROGRESS' | 'DONE';

export interface WorkflowNotification {
  /** Stable id: the transition id (or the public timeline entry). */
  id: string;
  caseId: string;
  at: string;
  kind: NotificationKind;
  title: string;
  description: string;
}

interface Rule {
  kind: NotificationKind;
  title: string;
}

/** Which transitions each staff role hears about. `mine` = only cases assigned to / recommended by this engineer. */
const STAFF_RULES: Record<string, Partial<Record<WorkflowAction, Rule & { mine?: boolean }>>> = {
  OPERATIONS_MANAGER: {
    SUBMIT: { kind: 'REVIEW', title: 'Laporan warga baru' },
    SCREENING_NEEDS_REVIEW: { kind: 'REVIEW', title: 'Laporan perlu ditinjau' },
    SCREENING_PASSED: { kind: 'REVIEW', title: 'Laporan lolos penyaringan, siap ditugaskan' },
    SUBMIT_INSPECTION: { kind: 'DECISION', title: 'Hasil inspeksi F.E menunggu verifikasi Anda' },
    RECOMMEND_ACTION: { kind: 'DECISION', title: 'Rekomendasi menunggu persetujuan Anda' },
    RESOLVE: { kind: 'DONE', title: 'Perbaikan terverifikasi F.E, siap ditutup' }
  },
  FIELD_ENGINEER: {
    REQUEST_INSPECTION: { kind: 'ASSIGNED', title: 'Tugas inspeksi baru untuk Anda', mine: true },
    VERIFY_INSPECTION: { kind: 'DECISION', title: 'Inspeksi Anda diverifikasi M.O', mine: true },
    REQUEST_REINSPECTION: { kind: 'ASSIGNED', title: 'M.O meminta inspeksi ulang', mine: true },
    APPROVE_ACTION: { kind: 'DECISION', title: 'Rekomendasi Anda disetujui M.O', mine: true },
    REJECT_ACTION: { kind: 'DECISION', title: 'Rekomendasi Anda dikembalikan M.O', mine: true },
    COMPLETE_WORK_ORDER: { kind: 'ASSIGNED', title: 'Pekerjaan selesai, perlu verifikasi Anda', mine: true },
    CLOSE_RESOLVED: { kind: 'DONE', title: 'Laporan ditutup', mine: true }
  },
  POLICY_MAKER: {
    RECOMMEND_ACTION: { kind: 'DECISION', title: 'Rekomendasi penanganan baru' },
    APPROVE_ACTION: { kind: 'DECISION', title: 'Penanganan disetujui M.O' },
    START_WORK: { kind: 'PROGRESS', title: 'Perintah kerja diterbitkan' },
    RESOLVE: { kind: 'DONE', title: 'Perbaikan terverifikasi' }
  }
};

const isMineAsEngineer = (c: ReportCase, accountId: string) => c.assignment?.engineerId === accountId || c.recommendation?.recommendedBy === accountId;

function describe(c: ReportCase | PublicReportView, extra = ''): string {
  return `${c.id} · ${c.report.damageTypeLabel} · ${c.report.segmentName}${extra ? ` — ${extra}` : ''}`;
}

/** Newest first, at most `limit` items. Actions taken by the viewer themself are not notified. */
export function workflowNotifications(views: ReportView[], viewer: { id: string; role: string }, limit = 20): WorkflowNotification[] {
  const out: WorkflowNotification[] = [];
  const rules = STAFF_RULES[viewer.role];

  for (const v of views) {
    if (v.audience === 'STAFF' && rules) {
      const c = v.case as ReportCase;
      for (const h of c.history as TransitionRecord[]) {
        const rule = rules[h.action];
        if (!rule || h.actor.id === viewer.id) continue;
        if (rule.mine && !isMineAsEngineer(c, viewer.id)) continue;
        out.push({ id: h.id, caseId: c.id, at: h.at, kind: rule.kind, title: rule.title, description: describe(c, h.reason) });
      }
    } else if (v.audience === 'PUBLIC' && v.isMine) {
      // Citizens hear about status changes of their own reports (public notes only).
      const c = v.case as PublicReportView;
      c.timeline.slice(1).forEach((t, i) => {
        out.push({ id: `${c.id}-t${i + 1}`, caseId: c.id, at: t.at, kind: t.state === 'RESOLVED' || t.state === 'CLOSED' ? 'DONE' : 'PROGRESS', title: 'Status laporan Anda berubah', description: describe(c, t.note) });
      });
    }
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

/** "5 mnt lalu" style label. */
export function relativeTime(iso: string, nowMs = Date.now()): string {
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}
