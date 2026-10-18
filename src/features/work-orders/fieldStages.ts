/**
 * One mapping from the server workflow state of an assigned case to the F.E task stage and
 * tab. Pure, so the board and the tests agree. No new workflow states: the stages below are
 * read from the state plus the assignment, inspection reviews and work-order evidence.
 *
 * Tabs: TODO "Belum Dimulai" = field work not yet sent back to M.O; ACTIVE "Sedang
 * Dikerjakan" = sent and waiting, or the engineer's recommendation step; DONE "Selesai" =
 * repair verified by M.O (RESOLVED) or case closed.
 */
import type { ReportCase } from '../../domain/workflow/model';

export type FieldTab = 'TODO' | 'ACTIVE' | 'DONE';

export interface FieldStage {
  tab: FieldTab;
  key:
    | 'NEW'
    | 'DRAFT'
    | 'REINSPECTION'
    | 'INSPECTION_SENT'
    | 'RECOMMEND'
    | 'NOT_CONFIRMED'
    | 'DECISION'
    | 'WORK_ORDER'
    | 'REPAIR'
    | 'REWORK'
    | 'REPAIR_SENT'
    | 'RESOLVED'
    | 'CLOSED'
    | 'OTHER';
  label: string;
  /** Sort order of the stage groups (lower first). */
  order: number;
}

type StageCase = Pick<ReportCase, 'state' | 'inspection' | 'inspectionReviews' | 'workOrder'>;

const S = (tab: FieldTab, key: FieldStage['key'], label: string, order: number): FieldStage => ({ tab, key, label, order });

export function fieldStage(c: StageCase, opts: { hasDraft?: boolean } = {}): FieldStage {
  switch (c.state) {
    case 'FIELD_INSPECTION_REQUESTED': {
      const last = c.inspectionReviews?.at(-1);
      if (last?.decision === 'REINSPECTION_REQUESTED') return S('TODO', 'REINSPECTION', 'Inspeksi diminta ulang M.O', 1);
      if (opts.hasDraft) return S('TODO', 'DRAFT', 'Inspeksi sedang dikerjakan · draf di perangkat ini', 2);
      return S('TODO', 'NEW', 'SPK baru · inspeksi belum dikirim', 3);
    }
    case 'IN_PROGRESS': {
      if (c.workOrder?.status === 'COMPLETED') return S('ACTIVE', 'REPAIR_SENT', 'Bukti perbaikan dikirim · menunggu verifikasi M.O', 13);
      if (c.workOrder?.submissions?.at(-1)?.decision === 'REWORK_REQUESTED') return S('TODO', 'REWORK', 'Perbaikan diminta ulang M.O', 0);
      return S('TODO', 'REPAIR', 'Perbaikan berlangsung · bukti belum dikirim', 4);
    }
    case 'INSPECTED':
      return S('ACTIVE', 'INSPECTION_SENT', 'Inspeksi dikirim · menunggu verifikasi M.O', 11);
    case 'INSPECTION_VERIFIED':
      return c.inspection?.verdict === 'CONFIRMED'
        ? S('ACTIVE', 'RECOMMEND', 'Inspeksi terverifikasi · perlu rekomendasi penanganan Anda', 10)
        : S('ACTIVE', 'NOT_CONFIRMED', 'Kerusakan tidak dikonfirmasi · menunggu keputusan M.O', 12);
    case 'ACTION_RECOMMENDED':
      return S('ACTIVE', 'DECISION', 'Rekomendasi dikirim · menunggu keputusan M.O', 12);
    case 'ACTION_APPROVED':
      return S('ACTIVE', 'WORK_ORDER', 'Penanganan disetujui · menunggu perintah kerja M.O', 12);
    case 'RESOLVED':
      return S('DONE', 'RESOLVED', 'Selesai & terverifikasi M.O', 20);
    case 'CLOSED':
      return S('DONE', 'CLOSED', 'Ditutup', 21);
    default:
      return S('ACTIVE', 'OTHER', 'Status lain', 30);
  }
}
