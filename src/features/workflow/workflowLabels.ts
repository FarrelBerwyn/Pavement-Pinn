import type { WorkflowAction, WorkflowState } from '../../domain/workflow/model';

export { WORKFLOW_STATE_LABEL } from '../../domain/workflow/projections';

/** Button text for each workflow action (Indonesian UI). */
export const ACTION_LABEL: Record<WorkflowAction, string> = {
  SUBMIT: 'Kirim laporan',
  BEGIN_SCREENING: 'Mulai penyaringan',
  SCREENING_PASSED: 'Lolos penyaringan',
  SCREENING_NEEDS_REVIEW: 'Perlu peninjauan',
  REVIEW_ACCEPT: 'Terima untuk ditindaklanjuti',
  CLOSE_INVALID: 'Tutup: tidak valid / duplikat',
  REQUEST_INSPECTION: 'Tugaskan inspeksi lapangan',
  SUBMIT_INSPECTION: 'Kirim hasil inspeksi',
  RECOMMEND_ACTION: 'Ajukan rekomendasi penanganan',
  CLOSE_NO_ACTION: 'Tutup tanpa penanganan',
  APPROVE_ACTION: 'Setujui penanganan',
  REJECT_ACTION: 'Kembalikan rekomendasi',
  START_WORK: 'Terbitkan perintah kerja internal',
  COMPLETE_WORK_ORDER: 'Tandai pekerjaan selesai',
  RESOLVE: 'Verifikasi hasil perbaikan',
  CLOSE_RESOLVED: 'Tutup laporan',
  SEED_IMPORT: 'Impor data contoh'
};

/** Visual tone per state: text label is always shown too (never colour alone). */
export function stateTone(state: WorkflowState | string): 'neutral' | 'review' | 'active' | 'done' | 'closed' {
  switch (state) {
    case 'SUBMITTED':
    case 'AI_SCREENING':
    case 'NEEDS_REVIEW':
      return 'review';
    case 'VERIFIED':
    case 'FIELD_INSPECTION_REQUESTED':
    case 'INSPECTED':
    case 'ACTION_RECOMMENDED':
    case 'ACTION_APPROVED':
    case 'IN_PROGRESS':
      return 'active';
    case 'RESOLVED':
      return 'done';
    case 'CLOSED':
      return 'closed';
    default:
      return 'neutral';
  }
}

export const TONE_CLASS: Record<ReturnType<typeof stateTone>, string> = {
  neutral: 'bg-slate-700/40 text-slate-200 border-slate-500/40',
  review: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
  active: 'bg-sky-500/15 text-sky-200 border-sky-500/40',
  done: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40',
  closed: 'bg-slate-700/40 text-slate-300 border-slate-500/40'
};
