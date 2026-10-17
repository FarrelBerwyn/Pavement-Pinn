/**
 * Field Engineer task derivation over the shared report cases. Pure, so the task page,
 * the sidebar badge and tests agree on what "my task" and "my turn" mean.
 */
import type { ReportCase, WorkflowAction } from '../../domain/workflow/model';
import type { ReportView } from '../../services/api/workflowClient';
import { samePerson } from '../../domain/identity/people';

export type Stage = 'TODO' | 'WAITING' | 'DONE';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type Filter = 'ALL' | Stage | 'HIGH';

export interface FieldTask {
  c: ReportCase;
  stage: Stage;
  priority: Priority;
  title: string;
  /** What happens next, in one line. */
  next: string;
  /** The transition the main button opens, when this engineer may take it now. */
  cta: { action: WorkflowAction; label: string } | null;
  overdue: boolean;
  /** Set when M.O sent the result back: the reason and instructions F.E must act on. */
  returned: { reason: string; at: string; by: string } | null;
}

export const PRIORITY_OF: Record<string, Priority> = { CRITICAL: 'HIGH', SEVERE: 'HIGH', MODERATE: 'MEDIUM', LIGHT: 'LOW' };
export const RANK: Record<Priority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };


/** Where a case stands for the assigned engineer, and which step is theirs. */
export function toTask(c: ReportCase, allowed: WorkflowAction[]): FieldTask {
  const priority = PRIORITY_OF[c.inspection?.severity ?? c.report.severity] ?? 'MEDIUM';
  const can = (action: WorkflowAction) => allowed.includes(action);
  const overdue = c.state === 'FIELD_INSPECTION_REQUESTED' && !!c.assignment && Date.parse(c.assignment.dueAt) < Date.now();
  const last = c.history[c.history.length - 1];
  // M.O sent work back: a re-inspection, or a recommendation returned for revision.
  const returned =
    (c.state === 'FIELD_INSPECTION_REQUESTED' && last?.action === 'REQUEST_REINSPECTION') ||
    (c.state === 'INSPECTION_VERIFIED' && last?.action === 'REJECT_ACTION')
      ? { reason: last.reason, at: last.at, by: 'Manajer Operasional' }
      : null;
  const base = { c, priority, overdue, returned };

  switch (c.state) {
    case 'FIELD_INSPECTION_REQUESTED':
      return returned
        ? { ...base, stage: 'TODO', title: 'Inspeksi ulang diminta M.O', next: 'Ulangi inspeksi sesuai catatan M.O, lalu kirim untuk verifikasi.', cta: can('SUBMIT_INSPECTION') ? { action: 'SUBMIT_INSPECTION', label: 'Perbaiki Inspeksi' } : null }
        : { ...base, stage: 'TODO', title: 'Inspeksi lapangan', next: 'Periksa lokasi, ukur kerusakan, kirim hasil untuk verifikasi M.O.', cta: can('SUBMIT_INSPECTION') ? { action: 'SUBMIT_INSPECTION', label: 'Mulai Tugas' } : null };
    case 'INSPECTED':
      return { ...base, stage: 'WAITING', title: 'Menunggu Verifikasi M.O', next: 'Hasil inspeksi terkirim. M.O memverifikasi atau meminta inspeksi ulang.', cta: null };
    case 'INSPECTION_VERIFIED':
      return c.inspection?.verdict === 'CONFIRMED'
        ? returned
          ? { ...base, stage: 'TODO', title: 'Rekomendasi dikembalikan M.O', next: 'Perbaiki rekomendasi sesuai catatan M.O, lalu ajukan ulang.', cta: can('RECOMMEND_ACTION') ? { action: 'RECOMMEND_ACTION', label: 'Ajukan Ulang Penanganan' } : null }
          : { ...base, stage: 'TODO', title: 'Susun rekomendasi penanganan', next: 'Inspeksi terverifikasi M.O. Ajukan penanganan untuk disetujui M.O.', cta: can('RECOMMEND_ACTION') ? { action: 'RECOMMEND_ACTION', label: 'Ajukan Penanganan' } : null }
        : { ...base, stage: 'WAITING', title: 'Inspeksi terverifikasi', next: 'Tidak terkonfirmasi. Menunggu M.O menutup laporan.', cta: null };
    case 'ACTION_RECOMMENDED':
      return { ...base, stage: 'WAITING', title: 'Menunggu persetujuan penanganan', next: 'Rekomendasi terkirim. M.O menyetujui atau mengembalikannya; D.M melihatnya di prioritas.', cta: null };
    case 'ACTION_APPROVED':
      return { ...base, stage: 'WAITING', title: 'Penanganan disetujui', next: 'Menunggu M.O menerbitkan perintah kerja.', cta: null };
    case 'IN_PROGRESS':
      return c.workOrder?.status === 'COMPLETED'
        ? { ...base, stage: 'TODO', title: 'Verifikasi hasil perbaikan', next: 'Pekerjaan dilaporkan selesai. Cek hasil di lapangan.', cta: can('RESOLVE') ? { action: 'RESOLVE', label: 'Verifikasi Perbaikan' } : null }
        : { ...base, stage: 'WAITING', title: 'Perbaikan berjalan', next: 'Perintah kerja aktif; verifikasi setelah pekerjaan selesai.', cta: null };
    case 'RESOLVED':
      return { ...base, stage: 'DONE', title: 'Perbaikan terverifikasi', next: 'Menunggu M.O menutup laporan.', cta: null };
    default:
      return { ...base, stage: 'DONE', title: 'Laporan ditutup', next: 'Tidak ada tindakan lagi.', cta: null };
  }
}

/** R.E → M.O → F.E → D.M, as the four hand-offs of one report. */
export function flowStep(c: ReportCase): number {
  if (c.state === 'RESOLVED' || c.state === 'CLOSED') return 4;
  if (['INSPECTION_VERIFIED', 'ACTION_RECOMMENDED', 'ACTION_APPROVED', 'IN_PROGRESS'].includes(c.state)) return 3;
  if (c.assignment) return 2;
  return 1;
}

/** Tasks of one engineer: cases assigned to them, in any state. */
export function fieldTasks(views: ReportView[], engineerId: string): FieldTask[] {
  return views.filter((v) => v.audience === 'STAFF' && samePerson((v.case as ReportCase).assignment?.engineerId, engineerId)).map((v) => toTask(v.case as ReportCase, v.availableActions));
}

/** Tasks where it is the engineer's turn and the action is allowed now (sidebar badge). */
export const tasksDue = (tasks: FieldTask[]) => tasks.filter((t) => t.stage === 'TODO' && t.cta !== null).length;
