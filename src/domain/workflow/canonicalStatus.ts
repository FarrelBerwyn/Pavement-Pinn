/**
 * Canonical cross-role workflow status model for PAVEMENT PINN.
 *
 * Defines the 8 ordered stages of the operational workflow from citizen report to closure:
 * 1. Menunggu Peninjauan  (O.M)
 * 2. Perlu Verifikasi     (R.E / O.M)
 * 3. Belum Ditugaskan     (O.M)
 * 4. Menunggu F.E         (F.E)
 * 5. Sedang Dikerjakan    (F.E)
 * 6. Menunggu Verifikasi  (O.M)
 * 7. Perlu Revisi         (F.E)
 * 8. Selesai              (R.E)
 *
 * Plus the catch-all filter tab "Semua" placed at the end.
 *
 * Pure, deterministic mapping over ReportCase and DamageReport.
 */
import type { ReportCase, WorkflowState } from '../../domain/workflow/model';
import type { DamageReport } from '../../types';

export type CanonicalStatusKey =
  | 'MENUNGGU_PENINJAUAN'
  | 'PERLU_VERIFIKASI'
  | 'BELUM_DITUGASKAN'
  | 'MENUNGGU_FE'
  | 'SEDANG_DIKERJAKAN'
  | 'MENUNGGU_VERIFIKASI'
  | 'PERLU_REVISI'
  | 'SELESAI';

export interface CanonicalStatusMeta {
  key: CanonicalStatusKey;
  order: number;
  label: string;
  operationalMeaning: string;
  nextResponsible: string;
  dotColor: string;
  badgeClass: string;
  borderAccent: string;
}

export const CANONICAL_STATUS_LIST: readonly CanonicalStatusKey[] = [
  'MENUNGGU_PENINJAUAN',
  'PERLU_VERIFIKASI',
  'BELUM_DITUGASKAN',
  'MENUNGGU_FE',
  'SEDANG_DIKERJAKAN',
  'MENUNGGU_VERIFIKASI',
  'PERLU_REVISI',
  'SELESAI'
] as const;

export const CANONICAL_STATUS_META: Record<CanonicalStatusKey, CanonicalStatusMeta> = {
  MENUNGGU_PENINJAUAN: {
    key: 'MENUNGGU_PENINJAUAN',
    order: 1,
    label: 'Menunggu Peninjauan',
    operationalMeaning: 'Laporan baru diterima dan belum diperiksa O.M',
    nextResponsible: 'Operations Manager (O.M)',
    dotColor: 'bg-amber-400',
    badgeClass: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    borderAccent: 'border-amber-500/30'
  },
  PERLU_VERIFIKASI: {
    key: 'PERLU_VERIFIKASI',
    order: 2,
    label: 'Perlu Verifikasi',
    operationalMeaning: 'O.M memerlukan pemeriksaan atau kelengkapan data tambahan',
    nextResponsible: 'Pelapor (R.E) / O.M',
    dotColor: 'bg-orange-400',
    badgeClass: 'border-orange-400/40 bg-orange-400/10 text-orange-200',
    borderAccent: 'border-orange-500/30'
  },
  BELUM_DITUGASKAN: {
    key: 'BELUM_DITUGASKAN',
    order: 3,
    label: 'Belum Ditugaskan',
    operationalMeaning: 'Laporan valid, tetapi SPK belum diterbitkan',
    nextResponsible: 'Operations Manager (O.M)',
    dotColor: 'bg-slate-400',
    badgeClass: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
    borderAccent: 'border-slate-500/30'
  },
  MENUNGGU_FE: {
    key: 'MENUNGGU_FE',
    order: 4,
    label: 'Menunggu F.E',
    operationalMeaning: 'SPK sudah diterbitkan dan petugas sudah ditentukan',
    nextResponsible: 'Field Engineer (F.E)',
    dotColor: 'bg-blue-400',
    badgeClass: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
    borderAccent: 'border-blue-500/30'
  },
  SEDANG_DIKERJAKAN: {
    key: 'SEDANG_DIKERJAKAN',
    order: 5,
    label: 'Sedang Dikerjakan',
    operationalMeaning: 'F.E sudah menerima atau memulai tugas perbaikan/inspeksi',
    nextResponsible: 'Field Engineer (F.E)',
    dotColor: 'bg-sky-400',
    badgeClass: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
    borderAccent: 'border-sky-500/30'
  },
  MENUNGGU_VERIFIKASI: {
    key: 'MENUNGGU_VERIFIKASI',
    order: 6,
    label: 'Menunggu Verifikasi',
    operationalMeaning: 'F.E telah mengirim bukti selesai kepada O.M',
    nextResponsible: 'Operations Manager (O.M)',
    dotColor: 'bg-indigo-400',
    badgeClass: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200',
    borderAccent: 'border-indigo-500/30'
  },
  PERLU_REVISI: {
    key: 'PERLU_REVISI',
    order: 7,
    label: 'Perlu Revisi',
    operationalMeaning: 'O.M menemukan pekerjaan atau bukti yang belum memenuhi persyaratan',
    nextResponsible: 'Field Engineer (F.E)',
    dotColor: 'bg-rose-400',
    badgeClass: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
    borderAccent: 'border-rose-500/30'
  },
  SELESAI: {
    key: 'SELESAI',
    order: 8,
    label: 'Selesai',
    operationalMeaning: 'O.M menyetujui bukti dan menutup pekerjaan',
    nextResponsible: 'Pelapor (R.E) menerima hasil akhir',
    dotColor: 'bg-emerald-400',
    badgeClass: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    borderAccent: 'border-emerald-500/30'
  }
};

/**
 * Determine the canonical workflow status of a case.
 */
export function canonicalStatusOf(c: ReportCase): CanonicalStatusKey {
  // 1. Selesai
  if (c.state === 'RESOLVED' || c.state === 'CLOSED') {
    return 'SELESAI';
  }

  // 2. Perlu Revisi:
  // F.E asked to rework (either reinspection or repair rework)
  const lastReview = c.inspectionReviews?.at(-1);
  const lastWorkSub = c.workOrder?.submissions?.at(-1);
  if (
    (c.state === 'FIELD_INSPECTION_REQUESTED' && lastReview?.decision === 'REINSPECTION_REQUESTED') ||
    (c.state === 'IN_PROGRESS' && c.workOrder?.status !== 'COMPLETED' && lastWorkSub?.decision === 'REWORK_REQUESTED')
  ) {
    return 'PERLU_REVISI';
  }

  // 3. Menunggu Verifikasi:
  // F.E submitted evidence and awaits O.M approval
  if (
    c.state === 'INSPECTED' ||
    (c.state === 'IN_PROGRESS' && c.workOrder?.status === 'COMPLETED')
  ) {
    return 'MENUNGGU_VERIFIKASI';
  }

  // 4. Sedang Dikerjakan:
  // In progress execution or recommendation preparation
  if (
    (c.state === 'IN_PROGRESS' && c.workOrder?.status !== 'COMPLETED') ||
    c.state === 'INSPECTION_VERIFIED' ||
    c.state === 'ACTION_RECOMMENDED' ||
    c.state === 'ACTION_APPROVED'
  ) {
    return 'SEDANG_DIKERJAKAN';
  }

  // 5. Menunggu F.E:
  // SPK issued (assignment exists), awaiting F.E to start
  if (c.state === 'FIELD_INSPECTION_REQUESTED') {
    return 'MENUNGGU_FE';
  }

  // 6. Belum Ditugaskan:
  // Report verified/accepted, SPK not yet issued
  if (c.state === 'VERIFIED') {
    return 'BELUM_DITUGASKAN';
  }

  // 7 & 8. Perlu Verifikasi vs Menunggu Peninjauan:
  if (c.state === 'SUBMITTED' || c.state === 'AI_SCREENING' || c.state === 'NEEDS_REVIEW') {
    // Check if flagged for data clarification/check in history or screening
    const needsClarification = c.history.some(
      (h) =>
        h.reason?.toLowerCase().includes('kurang') ||
        h.reason?.toLowerCase().includes('kelengkapan') ||
        h.reason?.toLowerCase().includes('perlu verifikasi')
    );
    if (needsClarification) {
      return 'PERLU_VERIFIKASI';
    }
    return 'MENUNGGU_PENINJAUAN';
  }

  return 'MENUNGGU_PENINJAUAN';
}

/**
 * Maps a citizen-facing DamageReport to its canonical status.
 */
export function canonicalStatusOfReport(r: DamageReport): CanonicalStatusKey {
  if (r.status === 'REPAIRED' || r.status === 'CLOSED') return 'SELESAI';
  if (r.repairDetails?.afterPhotoUrl && !r.repairDetails.verified) return 'MENUNGGU_VERIFIKASI';
  if (r.status === 'SCHEDULED_FOR_REPAIR') return 'SEDANG_DIKERJAKAN';
  if (r.status === 'VERIFIED_BY_ENGINEER') return 'BELUM_DITUGASKAN';
  return 'MENUNGGU_PENINJAUAN';
}
