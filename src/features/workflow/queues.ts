/**
 * Role queues over the shared report cases — pure functions, so every screen and test
 * agrees on what "my queue" means.
 */
import type { ReportCase, WorkflowState } from '../../domain/workflow/model';
import type { RoadSegment } from '../../types';
import { assessSegment, RiskLevel } from '../../domain/intelligence/assessment';

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, SEVERE: 3, MODERATE: 2, LIGHT: 1 };

export interface QueueBucket {
  key: string;
  title: string;
  hint: string;
  items: ReportCase[];
}

export function isOverdue(c: ReportCase, nowMs = Date.now()): boolean {
  return c.state === 'FIELD_INSPECTION_REQUESTED' && !!c.assignment && Date.parse(c.assignment.dueAt) < nowMs;
}

/** Most urgent first: overdue, then severity, then oldest. */
export function byUrgency(a: ReportCase, b: ReportCase, nowMs = Date.now()): number {
  const overdue = Number(isOverdue(b, nowMs)) - Number(isOverdue(a, nowMs));
  if (overdue !== 0) return overdue;
  const sev = (SEVERITY_RANK[b.inspection?.severity ?? b.report.severity] ?? 0) - (SEVERITY_RANK[a.inspection?.severity ?? a.report.severity] ?? 0);
  if (sev !== 0) return sev;
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

function bucket(key: string, title: string, hint: string, cases: ReportCase[], states: WorkflowState[], extra?: (c: ReportCase) => boolean): QueueBucket {
  return { key, title, hint, items: cases.filter((c) => states.includes(c.state) && (!extra || extra(c))).sort((a, b) => byUrgency(a, b)) };
}

export function operationsQueue(cases: ReportCase[]): QueueBucket[] {
  return [
    bucket('review', 'Perlu ditinjau', 'Laporan baru yang belum diperiksa petugas', cases, ['NEEDS_REVIEW']),
    bucket('assign', 'Siap ditugaskan', 'Tugaskan insinyur untuk inspeksi lapangan', cases, ['VERIFIED']),
    bucket('inspecting', 'Menunggu inspeksi', 'Sudah ditugaskan; perhatikan batas waktu', cases, ['FIELD_INSPECTION_REQUESTED']),
    bucket('verify', 'Verifikasi hasil inspeksi F.E', 'Periksa temuan dan bukti F.E: verifikasi atau minta inspeksi ulang', cases, ['INSPECTED']),
    bucket('decide', 'Perlu keputusan penanganan', 'Setujui atau kembalikan rekomendasi F.E; tutup jika inspeksi terverifikasi tidak menemukan kerusakan', cases, ['ACTION_RECOMMENDED', 'INSPECTION_VERIFIED'], (c) => c.state === 'ACTION_RECOMMENDED' || c.inspection?.verdict === 'NOT_CONFIRMED'),
    bucket('ready', 'Siap dikerjakan', 'Penanganan disetujui, terbitkan perintah kerja', cases, ['ACTION_APPROVED']),
    bucket('work', 'Dalam pengerjaan', 'Pantau perintah kerja yang berjalan', cases, ['IN_PROGRESS']),
    bucket('close', 'Siap ditutup', 'Perbaikan sudah diverifikasi insinyur', cases, ['RESOLVED'])
  ];
}

export function engineerQueue(cases: ReportCase[], engineerId: string): QueueBucket[] {
  const mine = cases.filter((c) => c.assignment?.engineerId === engineerId);
  return [
    bucket('inspect', 'Inspeksi yang ditugaskan', 'Periksa lokasi dan kirim hasil inspeksi', mine, ['FIELD_INSPECTION_REQUESTED']),
    bucket('recommend', 'Susun rekomendasi', 'Inspeksi terverifikasi M.O; ajukan penanganan', mine, ['INSPECTION_VERIFIED'], (c) => c.inspection?.verdict === 'CONFIRMED'),
    bucket('awaiting', 'Menunggu M.O', 'Inspeksi atau rekomendasi Anda sedang ditinjau Operasional', mine, ['INSPECTED', 'ACTION_RECOMMENDED', 'ACTION_APPROVED']),
    bucket('verify', 'Verifikasi perbaikan', 'Perintah kerja selesai; cek hasil di lapangan', mine, ['IN_PROGRESS'], (c) => c.workOrder?.status === 'COMPLETED')
  ];
}

export interface SegmentPriority {
  segment: RoadSegment;
  risk: RiskLevel;
  conditionScorePrototype: number;
  openReports: number;
  confirmed: number;
  pendingDecisions: number;
  approvedInterventions: number;
  completed: number;
}

const RISK_RANK: Record<RiskLevel, number> = { HIGH: 4, WATCH: 3, MODERATE: 2, GOOD: 1 };

/** Policy view: segments ranked by risk, then confirmed damage, then open reports. */
export function segmentPriorities(segments: RoadSegment[], cases: ReportCase[], now: string): SegmentPriority[] {
  return segments
    .map((segment) => {
      const mine = cases.filter((c) => c.segmentId === segment.id);
      const open = mine.filter((c) => c.state !== 'CLOSED' && c.state !== 'RESOLVED');
      const a = assessSegment(segment, { now, cases });
      return {
        segment,
        risk: a.risk,
        conditionScorePrototype: a.outputs.conditionScorePrototype,
        openReports: open.length,
        confirmed: open.filter((c) => c.inspection?.verdict === 'CONFIRMED').length,
        pendingDecisions: mine.filter((c) => c.state === 'ACTION_RECOMMENDED').length,
        approvedInterventions: mine.filter((c) => c.state === 'ACTION_APPROVED' || c.state === 'IN_PROGRESS').length,
        completed: mine.filter((c) => c.history.some((h) => h.action === 'RESOLVE')).length
      };
    })
    .sort((x, y) => RISK_RANK[y.risk] - RISK_RANK[x.risk] || y.confirmed - x.confirmed || y.openReports - x.openReports);
}
