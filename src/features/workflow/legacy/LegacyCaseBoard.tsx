/**
 * "Tim & Tugas" (M.O) and "Tugas Saya" (F.E) in the layout of the original PAVEMENT-PINN
 * screens: status tabs, report cards with one clear action, and the SPK / evidence /
 * quality-verification modals. Every button runs a command of the shared server workflow
 * (stateMachine.ts), so the old look keeps the new rules: identity-based assignment,
 * server RBAC, evidence photos, M.O verification and the audited history.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Eye, HardHat, MapPin, Navigation, RefreshCw, RotateCcw, ShieldCheck, Camera, X, Inbox, History } from 'lucide-react';
import type { ReportCase, WorkflowAction, WorkflowState } from '../../../domain/workflow/model';
import type { WorkflowCommand } from '../../../domain/workflow/stateMachine';
import type { EngineerSummary, GatewayMode, ReportView } from '../../../services/api/workflowClient';
import type { ReportMutationOutcome } from '../../../types/reports';
import { samePerson } from '../../../domain/identity/people';
import { operationsQueue } from '../queues';
import { ACTION_LABEL, WORKFLOW_STATE_LABEL } from '../workflowLabels';
import { ReportWorkflowPanel, actorName } from '../ReportWorkflowPanel';
import { clearDraft, loadDraft, saveDraft } from '../../work-orders/inspectionDraft';
import type { RoadSegment } from '../../../types';
import { TaskNavigation } from './TaskNavigation';

type Role = 'OPS' | 'FE';
type Tab = 'TODO' | 'ACTIVE' | 'DONE' | 'ALL';

const TODO_STATES: WorkflowState[] = ['NEEDS_REVIEW', 'VERIFIED'];
const DONE_STATES: WorkflowState[] = ['RESOLVED', 'CLOSED'];
const tabOf = (s: WorkflowState): Exclude<Tab, 'ALL'> => (TODO_STATES.includes(s) ? 'TODO' : DONE_STATES.includes(s) ? 'DONE' : 'ACTIVE');

const BTN = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-50';
const BTN_BRAND = `${BTN} bg-brand text-navy hover:bg-brand-hover`;
const BTN_GOOD = `${BTN} bg-status-good/90 text-white hover:bg-status-good`;
const BTN_GHOST = `${BTN} border border-line bg-elevated text-fg hover:bg-white/[0.06]`;
const BTN_DANGER = `${BTN} border border-status-heavy/50 text-rose-300 hover:bg-status-heavy/10`;
const INPUT = 'w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand/50';
const LABEL = 'block text-[11px] font-bold uppercase tracking-wide text-fg-muted mb-1.5';

const PRIORITY = { HIGH: 'Tinggi', MEDIUM: 'Sedang', LOW: 'Rendah' } as const;
const PRIORITY_OF: Record<string, keyof typeof PRIORITY> = { CRITICAL: 'HIGH', SEVERE: 'HIGH', MODERATE: 'MEDIUM', LIGHT: 'LOW' };
const fmt = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export interface LegacyCaseBoardProps {
  role: Role;
  views: ReportView[];
  /** Server actor id of this tab (F.E: whose tasks to show). */
  me: string;
  mode: GatewayMode;
  engineers: EngineerSummary[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRun: (caseId: string, command: WorkflowCommand) => Promise<ReportMutationOutcome>;
  onShowOnMap?: (c: ReportCase) => void;
  /** Road network for the task navigation map. */
  roadSegments?: RoadSegment[];
}

type Dialog = { kind: 'SPK' | 'EVIDENCE' | 'VERIFY' | 'WORK_DONE' | 'WORK_VERIFY' | 'NAV'; caseId: string } | { kind: 'PANEL'; caseId: string; action: WorkflowAction | null } | { kind: 'PHOTO'; src: string; alt: string };

export const LegacyCaseBoard: React.FC<LegacyCaseBoardProps> = ({ role, views, me, mode, engineers, loading, error, onRefresh, onRun, onShowOnMap, roadSegments = [] }) => {
  const [tab, setTab] = useState<Tab>(role === 'OPS' ? 'TODO' : 'ACTIVE');
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const staff = useMemo(() => views.filter((v): v is Extract<ReportView, { audience: 'STAFF' }> => v.audience === 'STAFF'), [views]);
  const mine = useMemo(() => (role === 'FE' ? staff.filter((v) => samePerson(v.case.assignment?.engineerId, me)) : staff), [staff, role, me]);
  const byId = useMemo(() => new Map(mine.map((v) => [v.case.id, v])), [mine]);

  // M.O keeps the operations buckets (real reports first, then urgency) as group headings.
  const groups = useMemo(() => {
    const inTab = (c: ReportCase) => tab === 'ALL' || tabOf(c.state) === tab;
    if (role === 'OPS') {
      const buckets = operationsQueue(mine.map((v) => v.case))
        .map((b) => ({ title: b.title, hint: b.hint, items: b.items.filter(inTab) }))
        .filter((b) => b.items.length > 0);
      if (tab === 'DONE' || tab === 'ALL') {
        const listed = new Set(buckets.flatMap((b) => b.items.map((c) => c.id)));
        const done = mine.map((v) => v.case).filter((c) => DONE_STATES.includes(c.state) && !listed.has(c.id));
        if (done.length) buckets.push({ title: 'Selesai / ditutup', hint: 'Riwayat lengkap tersedia di detail', items: done });
      }
      return buckets;
    }
    const items = mine.map((v) => v.case).filter(inTab).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return items.length ? [{ title: '', hint: '', items }] : [];
  }, [mine, tab, role]);

  const count = (t: Tab) => mine.filter((v) => t === 'ALL' || tabOf(v.case.state) === t).length;
  const tabs: { key: Tab; label: string; dot: string }[] = [
    { key: 'TODO', label: role === 'OPS' ? 'Belum Ditugaskan' : 'Belum Dimulai', dot: 'bg-brand' },
    { key: 'ACTIVE', label: 'Sedang Dikerjakan', dot: 'bg-info' },
    { key: 'DONE', label: 'Selesai', dot: 'bg-status-good' },
    { key: 'ALL', label: 'Semua', dot: 'bg-fg-subtle' }
  ];

  const open = dialog && 'caseId' in dialog ? byId.get(dialog.caseId) ?? null : null;
  const run = (command: WorkflowCommand) => onRun(open!.case.id, command);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-5 text-fg">
      {role === 'FE' ? (
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <ClipboardList className="h-6 w-6 text-brand" /> Tugas Saya
                <span className="rounded-full bg-status-good/15 px-2 py-0.5 text-xs font-bold text-emerald-300">{mine.length} Tugas</span>
              </h1>
              <p className="mt-1 text-sm text-fg-muted">Daftar penugasan inspeksi dari Operations Manager yang ditugaskan kepada Anda.</p>
            </div>
            <RefreshButton loading={loading} onRefresh={onRefresh} />
          </div>
          <div className="rounded-2xl border border-line bg-navy p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-brand/40 bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-bold text-brand">FIELD ENGINEER WORK ORDERS</span>
              <span className="text-xs text-fg-muted">{mode === 'SERVER' ? 'Tersinkron lewat server · dimuat ulang tiap 15 detik' : 'DEMO OFFLINE di browser ini — tidak terbagi ke akun lain'}</span>
            </div>
            <h2 className="mt-2 text-lg font-bold">Penugasan Inspeksi Kerusakan dari Operations Manager</h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">Buka tugas, periksa lokasi dan instruksi, lalu kirim hasil inspeksi beserta foto bukti. M.O memverifikasi hasil Anda sebelum penanganan diputuskan.</p>
          </div>
        </header>
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Tim &amp; Tugas</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Laporan warga dan penugasan F.E ({mode === 'SERVER' ? 'tersimpan di server, dimuat ulang tiap 15 detik' : 'DEMO OFFLINE di browser ini'}). AI hanya menyaring; keputusan tetap di tangan petugas.
            </p>
          </div>
          <RefreshButton loading={loading} onRefresh={onRefresh} />
        </header>
      )}

      <nav className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-2" aria-label="Filter status">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${tab === t.key ? 'bg-brand text-navy' : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg'}`}
          >
            <span className={`h-2 w-2 rounded-full ${tab === t.key ? 'bg-navy' : t.dot}`} />
            {t.label} ({count(t.key)})
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-lg border border-status-heavy/40 bg-status-heavy/10 px-4 py-3 text-sm text-rose-200">Gagal memuat data dari server: {error}</p>}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-fg-subtle" />
          <p className="mt-3 font-semibold">Tidak ada laporan di kategori ini</p>
          <p className="mt-1 text-sm text-fg-muted">
            {role === 'FE' ? 'Tugas baru muncul setelah M.O menugaskan inspeksi kepada Anda. Pilih tab lain untuk melihat riwayat.' : 'Pilih tab lain untuk melihat laporan pada status berbeda.'}
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title || 'list'} className="space-y-3">
            {g.title && (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold">
                  {g.title} <span className="ml-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs text-amber-200 tabular-nums">{g.items.length}</span>
                </h2>
                <span className="text-xs text-fg-muted">{g.hint}</span>
              </div>
            )}
            {g.items.map((c) => (
              <CaseCard key={c.id} c={c} role={role} actions={byId.get(c.id)?.availableActions ?? []} onDialog={setDialog} onShowOnMap={onShowOnMap} />
            ))}
          </section>
        ))
      )}

      {dialog?.kind === 'PHOTO' && (
        <Modal title={dialog.alt} onClose={() => setDialog(null)} wide>
          <img src={dialog.src} alt={dialog.alt} className="max-h-[75vh] w-full rounded-lg object-contain bg-canvas" />
        </Modal>
      )}
      {open && dialog?.kind === 'SPK' && <SpkModal c={open.case} engineers={engineers} onRun={run} onClose={() => setDialog(null)} />}
      {open && dialog?.kind === 'EVIDENCE' && <EvidenceModal c={open.case} onRun={run} onClose={() => setDialog(null)} />}
      {open && dialog?.kind === 'VERIFY' && <VerifyModal c={open.case} onRun={run} onClose={() => setDialog(null)} />}
      {open && dialog?.kind === 'WORK_DONE' && <WorkDoneModal c={open.case} onRun={run} onClose={() => setDialog(null)} />}
      {open && dialog?.kind === 'WORK_VERIFY' && <WorkVerifyModal c={open.case} onRun={run} onClose={() => setDialog(null)} />}
      {open && dialog?.kind === 'NAV' && <TaskNavigation c={open.case} roadSegments={roadSegments} onBack={() => setDialog(null)} />}
      {open && dialog?.kind === 'PANEL' && (
        <Modal title={`Detail & riwayat · ${open.case.id}`} onClose={() => setDialog(null)} wide>
          <ReportWorkflowPanel view={open} mode={mode} engineers={engineers} onRun={run} initialAction={dialog.action} onShowOnMap={onShowOnMap ? () => onShowOnMap(open.case) : undefined} />
        </Modal>
      )}
    </div>
  );
};

const RefreshButton: React.FC<{ loading: boolean; onRefresh: () => void }> = ({ loading, onRefresh }) => (
  <button type="button" onClick={onRefresh} className={BTN_GHOST}>
    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
  </button>
);

/** One report, as on the original cards: photo, status, title, location, citizen text, assignment. */
const CaseCard: React.FC<{
  c: ReportCase;
  role: Role;
  actions: WorkflowAction[];
  onDialog: (d: Dialog) => void;
  onShowOnMap?: (c: ReportCase) => void;
}> = ({ c, role, actions, onDialog, onShowOnMap }) => {
  const r = c.report;
  const can = (a: WorkflowAction) => actions.includes(a);
  const lastReview = c.inspectionReviews?.at(-1);
  const returned = c.state === 'FIELD_INSPECTION_REQUESTED' && lastReview?.decision === 'REINSPECTION_REQUESTED' ? lastReview : null;
  const done = DONE_STATES.includes(c.state);
  const lastWork = c.workOrder?.submissions?.at(-1);
  const rework = c.state === 'IN_PROGRESS' && c.workOrder?.status !== 'COMPLETED' && lastWork?.decision === 'REWORK_REQUESTED' ? lastWork : null;
  const workSent = c.state === 'IN_PROGRESS' && c.workOrder?.status === 'COMPLETED';
  const accent = c.state === 'INSPECTED' || returned ? 'border-brand/60' : done ? 'border-status-good/40' : 'border-line';

  // The one primary action for this role and state; other allowed actions open the detail form.
  let primary: React.ReactNode = null;
  if (role === 'OPS' && (can('REQUEST_INSPECTION') || can('REVIEW_ACCEPT'))) {
    primary = <button type="button" className={BTN_BRAND} onClick={() => onDialog({ kind: 'SPK', caseId: c.id })}><HardHat className="h-4 w-4" /> + Beri Tugas ke F.E (Terbitkan SPK)</button>;
  } else if (role === 'OPS' && can('RESOLVE')) {
    primary = <button type="button" className={BTN_BRAND} onClick={() => onDialog({ kind: 'WORK_VERIFY', caseId: c.id })}><ShieldCheck className="h-4 w-4" /> Verifikasi Pekerjaan (Before vs After)</button>;
  } else if (role === 'FE' && can('COMPLETE_WORK_ORDER')) {
    primary = <button type="button" className={BTN_GOOD} onClick={() => onDialog({ kind: 'WORK_DONE', caseId: c.id })}><CheckCircle2 className="h-4 w-4" /> {rework ? 'Perbaiki & Kirim Ulang Bukti' : 'Sudah Selesai (Kirim Bukti Perbaikan)'}</button>;
  } else if (role === 'OPS' && can('VERIFY_INSPECTION')) {
    primary = <button type="button" className={BTN_BRAND} onClick={() => onDialog({ kind: 'VERIFY', caseId: c.id })}><ShieldCheck className="h-4 w-4" /> Verifikasi Mutu (Before vs After)</button>;
  } else if (role === 'FE' && can('SUBMIT_INSPECTION')) {
    primary = <button type="button" className={BTN_GOOD} onClick={() => onDialog({ kind: 'EVIDENCE', caseId: c.id })}><CheckCircle2 className="h-4 w-4" /> {returned ? 'Perbaiki & Kirim Ulang ke M.O' : 'Kirim Hasil Inspeksi & Bukti ke M.O'}</button>;
  } else {
    const next = actions.find((a) => !['REVIEW_ACCEPT', 'CLOSE_INVALID', 'REQUEST_INSPECTION', 'VERIFY_INSPECTION', 'REQUEST_REINSPECTION', 'SUBMIT_INSPECTION', 'COMPLETE_WORK_ORDER', 'RESOLVE', 'REQUEST_REWORK'].includes(a));
    if (next) primary = <button type="button" className={BTN_BRAND} onClick={() => onDialog({ kind: 'PANEL', caseId: c.id, action: next })}>{ACTION_LABEL[next]}</button>;
  }
  const waiting =
    !primary && !done
      ? role === 'FE'
        ? c.state === 'INSPECTED'
          ? 'Hasil inspeksi terkirim · menunggu verifikasi M.O'
          : workSent
            ? 'Bukti perbaikan berhasil dikirim · menunggu verifikasi M.O'
          : c.state === 'ACTION_RECOMMENDED'
            ? 'Menunggu keputusan penanganan M.O'
            : 'Menunggu tindakan peran lain'
        : 'Menunggu tindakan peran lain'
      : null;

  return (
    <article className={`rounded-2xl border ${accent} bg-surface p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 md:flex-row">
        <button type="button" onClick={() => r.photoUrl && onDialog({ kind: 'PHOTO', src: r.photoUrl, alt: `Foto laporan warga ${c.id}` })} className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-line bg-canvas md:w-32" title="Perbesar foto">
          {r.photoUrl ? <img src={r.photoUrl} alt={`Foto laporan ${c.id}`} className="h-full w-full object-cover" /> : <span className="text-xs text-fg-subtle">Tanpa foto</span>}
          <span className="absolute left-1.5 top-1.5 max-w-[90%] truncate rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{c.id}</span>
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {WORKFLOW_STATE_LABEL[c.state]}
            </span>
            <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">{r.damageType}</span>
            <span className="text-[11px] font-semibold text-fg-muted">· {r.severity}</span>
            {c.dataStatus === 'SYNTHETIC' && <span className="rounded border border-amber-500/30 px-1.5 text-[10px] text-amber-200">data contoh</span>}
          </div>
          <h3 className="text-base font-bold leading-snug">{r.damageTypeLabel} — {r.segmentName}</h3>
          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {r.corridor}
            <span className="font-mono">({r.coordinates[0].toFixed(4)}, {r.coordinates[1].toFixed(4)})</span>
          </p>
          <p className="line-clamp-2 text-sm text-fg/90">“{r.description}”</p>

          {c.assignment && (
            <div className="mt-2 rounded-lg border border-line bg-canvas/60 p-3 text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <span>
                  <b>Penugasan {c.assignment.id}</b> · F.E: {actorName(c.assignment.engineerId)} · Prioritas:{' '}
                  <b className="text-amber-300">{PRIORITY[PRIORITY_OF[r.severity] ?? 'MEDIUM']}</b>
                </span>
                <span className="text-fg-muted">Tenggat: {fmt(c.assignment.dueAt)}</span>
              </div>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">Instruksi dari Operations Manager</p>
              <p className="text-fg/90">{c.assignment.instructions}</p>
            </div>
          )}
          {rework && (
            <p role="status" className="rounded-lg border border-status-heavy/40 bg-status-heavy/10 p-2.5 text-xs text-rose-100">
              <b>M.O meminta perbaikan ulang:</b> {rework.reason}
            </p>
          )}
          {done && c.workOrder?.completionPhotoUrl && <p className="text-xs font-semibold text-emerald-300">✓ Selesai &amp; terverifikasi M.O</p>}
          {returned && (
            <p role="status" className="rounded-lg border border-brand/40 bg-brand/10 p-2.5 text-xs text-amber-100">
              <b>M.O meminta inspeksi ulang:</b> {returned.reason}
            </p>
          )}
          <p className="text-[11px] text-fg-subtle">
            Pelapor: <span className="text-fg-muted">{r.reporterName}</span> · {fmt(c.createdAt)} · v{c.version}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-64">
          {primary}
          {waiting && <p className="rounded-lg border border-line bg-elevated px-3 py-2.5 text-center text-xs text-fg-muted">{waiting}</p>}
          {role === 'FE' && !done && (
            <button type="button" className={BTN_GHOST} onClick={() => onDialog({ kind: 'NAV', caseId: c.id })}><Navigation className="h-4 w-4" /> Navigasi ke Lokasi</button>
          )}
          <button type="button" className={BTN_GHOST} onClick={() => onDialog({ kind: 'PANEL', caseId: c.id, action: null })}>
            {done ? <Eye className="h-4 w-4" /> : <History className="h-4 w-4" />} {done ? 'Lihat Hasil & Riwayat' : 'Detail & Riwayat'}
          </button>
        </div>
      </div>
    </article>
  );
};

const Modal: React.FC<{ title: string; subtitle?: React.ReactNode; icon?: React.ReactNode; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ title, subtitle, icon, onClose, wide, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`max-h-[92vh] w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} overflow-y-auto rounded-2xl border border-line bg-surface p-5 text-fg shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start gap-3 border-b border-line pb-4">
          {icon && <span className="rounded-xl border border-brand/40 bg-brand/10 p-2.5 text-brand">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
            {subtitle && <p className="mt-0.5 font-mono text-[11px] text-fg-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-fg-muted hover:bg-white/[0.06] hover:text-fg" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Summary: React.FC<{ c: ReportCase }> = ({ c }) => (
  <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 rounded-xl border border-line bg-canvas/60 p-3 text-xs">
    <dt className="font-mono text-fg-subtle">JENIS KERUSAKAN</dt><dd className="text-right font-semibold text-brand">{c.report.damageTypeLabel}</dd>
    <dt className="font-mono text-fg-subtle">LOKASI</dt><dd className="truncate text-right">{c.report.segmentName} ({c.report.coordinates[0].toFixed(4)}, {c.report.coordinates[1].toFixed(4)})</dd>
    <dt className="font-mono text-fg-subtle">DESKRIPSI WARGA</dt><dd className="truncate text-right italic">“{c.report.description}”</dd>
  </dl>
);

const useSubmit = (onClose: () => void) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (steps: (() => Promise<ReportMutationOutcome>)[], after?: () => void) => {
    setBusy(true);
    setErr(null);
    for (const step of steps) {
      const out = await step();
      if (out.ok === false) {
        setErr(out.error);
        setBusy(false);
        return;
      }
    }
    after?.();
    setBusy(false);
    onClose();
  };
  return { busy, err, submit };
};

const Footer: React.FC<{ err: string | null; children: React.ReactNode; onClose: () => void }> = ({ err, children, onClose }) => (
  <>
    {err && <p role="alert" className="mt-3 rounded-lg border border-status-heavy/40 bg-status-heavy/10 px-3 py-2 text-xs text-rose-200">{err}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
      <button type="button" className={BTN_GHOST} onClick={onClose}>Batal</button>
      {children}
    </div>
  </>
);

/** M.O: accept the report (if still in review) and assign the field inspection — two audited steps. */
const SpkModal: React.FC<{ c: ReportCase; engineers: EngineerSummary[]; onRun: (cmd: WorkflowCommand) => Promise<ReportMutationOutcome>; onClose: () => void }> = ({ c, engineers, onRun, onClose }) => {
  const [priority, setPriority] = useState<keyof typeof PRIORITY>(PRIORITY_OF[c.report.severity] ?? 'MEDIUM');
  const [taskType, setTaskType] = useState('Survei Kerusakan');
  const [method, setMethod] = useState('Visual + Instrumen');
  const [due, setDue] = useState(() => new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
  const [engineerId, setEngineerId] = useState(engineers[0]?.id ?? '');
  const [instructions, setInstructions] = useState('');
  const [reason, setReason] = useState('');
  const { busy, err, submit } = useSubmit(onClose);
  const ready = engineerId && instructions.trim() && reason.trim() && due;

  const go = () => {
    const steps: (() => Promise<ReportMutationOutcome>)[] = [];
    if (c.state === 'NEEDS_REVIEW') steps.push(() => onRun({ action: 'REVIEW_ACCEPT', reason: reason.trim() }));
    steps.push(() =>
      onRun({
        action: 'REQUEST_INSPECTION',
        reason: reason.trim(),
        engineerId,
        dueAt: new Date(`${due}T23:59:00`).toISOString(),
        instructions: `[${taskType} · ${method} · Prioritas ${PRIORITY[priority]}] ${instructions.trim()}`
      })
    );
    void submit(steps);
  };

  return (
    <Modal title="Terbitkan Surat Perintah Kerja (SPK)" subtitle={<>Disposisi laporan: <span className="text-brand">{c.id}</span></>} icon={<HardHat className="h-5 w-5" />} onClose={onClose}>
      <div className="space-y-4">
        <Summary c={c} />
        {c.state === 'NEEDS_REVIEW' && <p className="text-xs text-fg-muted">Laporan ini akan <b>diterima</b> lalu <b>ditugaskan</b>; keduanya tercatat di riwayat dengan alasan di bawah.</p>}
        <div>
          <span className={LABEL}>Tingkat prioritas</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PRIORITY) as (keyof typeof PRIORITY)[]).map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)} aria-pressed={priority === p} className={`rounded-lg border px-3 py-2 text-xs font-bold ${priority === p ? 'border-brand bg-brand/15 text-brand' : 'border-line bg-canvas text-fg-muted'}`}>
                {PRIORITY[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className={LABEL}>Jenis tugas</span>
            <select className={INPUT} value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              <option>Survei Kerusakan</option><option>Pengukuran Detail</option><option>Uji Defleksi (FWD)</option>
            </select>
          </label>
          <label className="block"><span className={LABEL}>Metode</span>
            <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Visual + Instrumen</option><option>Visual</option><option>Instrumen</option>
            </select>
          </label>
          <label className="block"><span className={LABEL}>Batas waktu inspeksi</span>
            <input type="date" className={INPUT} value={due} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="block"><span className={LABEL}>Petugas Field Engineer (F.E)</span>
            <select className={INPUT} value={engineerId} onChange={(e) => setEngineerId(e.target.value)}>
              {engineers.length === 0 && <option value="">Tidak ada F.E terdaftar</option>}
              {engineers.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.title}</option>)}
            </select>
          </label>
        </div>
        <label className="block"><span className={LABEL}>Instruksi teknis &amp; catatan lapangan</span>
          <textarea className={INPUT} rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Contoh: ukur kedalaman dan luas, foto tepi lubang." />
        </label>
        <label className="block"><span className={LABEL}>Alasan penugasan (tercatat di riwayat)</span>
          <input className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: foto dan lokasi jelas, koridor prioritas." />
        </label>
      </div>
      <Footer err={err} onClose={onClose}>
        <button type="button" className={BTN_BRAND} disabled={!ready || busy} onClick={go}><HardHat className="h-4 w-4" /> {busy ? 'Mengirim…' : 'Terbitkan SPK & Tugaskan'}</button>
      </Footer>
    </Modal>
  );
};

const BeforeAfter: React.FC<{ before?: string | null; after?: string | null; afterSlot?: React.ReactNode; afterAlt?: string }> = ({ before, after, afterSlot, afterAlt = 'Foto bukti inspeksi (F.E)' }) => (
  <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-canvas/60 p-3">
    <figure>
      <figcaption className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-rose-300"><span className="h-2 w-2 rounded-full bg-status-heavy" /> Foto sebelum (warga)</figcaption>
      {before ? <img src={before} alt="Foto laporan warga (R.E)" className="h-36 w-full rounded-lg border border-line object-cover" /> : <div className="grid h-36 place-items-center rounded-lg border border-line text-xs text-fg-subtle">Tanpa foto</div>}
    </figure>
    <figure>
      <figcaption className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-300"><span className="h-2 w-2 rounded-full bg-status-good" /> Foto bukti F.E</figcaption>
      {afterSlot ?? (after ? <img src={after} alt={afterAlt} className="h-36 w-full rounded-lg border border-line object-cover" /> : <div className="grid h-36 place-items-center rounded-lg border border-line text-xs text-fg-subtle">Belum ada foto bukti dari F.E.</div>)}
    </figure>
  </div>
);

/** F.E: inspection result + evidence photo, sent to M.O for verification (not a final status). */
const EvidenceModal: React.FC<{ c: ReportCase; onRun: (cmd: WorkflowCommand) => Promise<ReportMutationOutcome>; onClose: () => void }> = ({ c, onRun, onClose }) => {
  const draft = loadDraft(c);
  const [verdict, setVerdict] = useState(draft?.verdict ?? 'CONFIRMED');
  const [depth, setDepth] = useState(draft?.depth ?? '');
  const [area, setArea] = useState(draft?.area ?? '');
  const [severity, setSeverity] = useState(draft?.severity ?? c.inspection?.severity ?? c.report.severity);
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [photo, setPhoto] = useState<string | null>(draft?.evidencePhotoUrl ?? null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(draft?.savedAt ?? null);
  const { busy, err, submit } = useSubmit(onClose);

  useEffect(() => {
    if (!(depth || area || notes || photo || verdict !== 'CONFIRMED')) return;
    const at = new Date().toISOString();
    saveDraft(c.id, { version: c.version, savedAt: at, verdict, cvAccepted: true, correctedClass: '', depth, area, severity, notes, evidencePhotoUrl: photo });
    setSavedAt(at);
  }, [c.id, c.version, verdict, depth, area, severity, notes, photo]);

  const pick = (file?: File) => {
    setPhotoErr(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setPhotoErr('Gunakan foto JPEG, PNG atau WebP.');
    if (file.size > 5 * 1024 * 1024) return setPhotoErr('Foto lebih dari 5 MB.');
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.onerror = () => setPhotoErr('Foto tidak dapat dibaca.');
    reader.readAsDataURL(file);
  };
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const ready = notes.trim() && photo;

  return (
    <Modal title="Kirim hasil inspeksi & bukti" subtitle={<>Dikirim ke <span className="text-brand">Operations Manager</span> untuk diverifikasi · {c.id}</>} icon={<Camera className="h-5 w-5" />} onClose={onClose}>
      <div className="space-y-4">
        <BeforeAfter
          before={c.report.photoUrl}
          afterSlot={
            <label htmlFor={`ev-${c.id}`} className="grid h-36 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-brand/50 text-center text-xs text-amber-200 hover:bg-brand/5">
              {photo ? <img src={photo} alt="Pratinjau foto bukti inspeksi" className="h-full w-full object-cover" /> : <span><Camera className="mx-auto mb-1 h-5 w-5" /> Wajib lampirkan foto<br /><span className="text-fg-muted">Klik untuk kamera / unggah</span></span>}
            </label>
          }
        />
        <input id={`ev-${c.id}`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label="Foto bukti inspeksi" onChange={(e) => pick(e.target.files?.[0])} />
        <div className="flex items-center justify-between text-xs">
          <span className={photo ? 'text-emerald-300' : 'text-rose-300'}>{photo ? '✓ Foto terlampir' : '⚠ Foto belum diunggah'}</span>
          {photo && <button type="button" className="text-fg-muted underline" onClick={() => setPhoto(null)}>Ganti / hapus foto</button>}
        </div>
        {photoErr && <p role="alert" className="text-xs text-rose-300">{photoErr}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className={LABEL}>Hasil pemeriksaan</span>
            <select className={INPUT} value={verdict} onChange={(e) => setVerdict(e.target.value as typeof verdict)}>
              <option value="CONFIRMED">Kerusakan terkonfirmasi</option><option value="NOT_CONFIRMED">Tidak ditemukan kerusakan</option>
            </select>
          </label>
          <label className="block"><span className={LABEL}>Tingkat keparahan</span>
            <select className={INPUT} value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              <option value="LIGHT">Ringan</option><option value="MODERATE">Sedang</option><option value="SEVERE">Berat</option><option value="CRITICAL">Kritis</option>
            </select>
          </label>
          <label className="block"><span className={LABEL}>Kedalaman terukur (cm)</span><input type="number" min="0" step="0.1" className={INPUT} value={depth} onChange={(e) => setDepth(e.target.value)} /></label>
          <label className="block"><span className={LABEL}>Luas terukur (m²)</span><input type="number" min="0" step="0.1" className={INPUT} value={area} onChange={(e) => setArea(e.target.value)} /></label>
        </div>
        <label className="block"><span className={LABEL}>Catatan inspeksi lapangan</span>
          <textarea className={INPUT} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Apa yang Anda temukan dan bagaimana mengukurnya." />
        </label>
        <p className="font-mono text-[11px] text-fg-muted">
          Lokasi laporan: {c.report.coordinates[0].toFixed(4)}, {c.report.coordinates[1].toFixed(4)}
          {savedAt && <> · Draf tersimpan di perangkat ini {new Date(savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. Belum terkirim ke M.O.</>}
        </p>
      </div>
      <Footer err={err} onClose={onClose}>
        <button
          type="button"
          className={BTN_GOOD}
          disabled={!ready || busy}
          onClick={() =>
            void submit(
              [() => onRun({ action: 'SUBMIT_INSPECTION', verdict, cvReview: { accepted: true, correctedClass: null }, measuredDepthCm: num(depth), measuredAreaM2: num(area), severity, notes: notes.trim(), evidencePhotoUrl: photo })],
              () => clearDraft(c.id)
            )
          }
        >
          {busy ? 'Mengirim…' : 'Kirim Bukti ke Operations Manager'}
        </button>
      </Footer>
    </Modal>
  );
};

/** M.O: compare citizen photo with F.E evidence, then verify or send back with a reason. */
const VerifyModal: React.FC<{ c: ReportCase; onRun: (cmd: WorkflowCommand) => Promise<ReportMutationOutcome>; onClose: () => void }> = ({ c, onRun, onClose }) => {
  const [reason, setReason] = useState('');
  const { busy, err, submit } = useSubmit(onClose);
  const i = c.inspection;
  return (
    <Modal title="Verifikasi mutu hasil inspeksi oleh M.O" subtitle={<>Laporan: <span className="text-brand">{c.id}</span>{c.assignment && <> · Penugasan {c.assignment.id}</>}</>} icon={<ShieldCheck className="h-5 w-5" />} onClose={onClose} wide>
      <div className="space-y-4">
        <BeforeAfter before={c.report.photoUrl} after={i?.evidencePhotoUrl} />
        {i && (
          <div className="space-y-2 rounded-xl border border-line bg-canvas/60 p-3 text-xs">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono text-fg-subtle">FIELD ENGINEER PELAKSANA</span>
              <span className="font-semibold text-emerald-300">● {actorName(i.engineerId)}</span>
            </div>
            <p>
              Hasil: <b>{i.verdict === 'CONFIRMED' ? 'Kerusakan terkonfirmasi' : 'Tidak ditemukan kerusakan'}</b> · Keparahan <b>{i.severity}</b> · Kedalaman <b>{i.measuredDepthCm ?? '—'} cm</b> · Luas <b>{i.measuredAreaM2 ?? '—'} m²</b>
            </p>
            <p className="rounded-lg bg-surface p-2.5 italic">“{i.notes}”</p>
            <p className="text-fg-muted">Dikirim {fmt(i.inspectedAt)}</p>
          </div>
        )}
        <label className="block"><span className={LABEL}>Alasan keputusan (wajib, tercatat di riwayat)</span>
          <textarea className={INPUT} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: foto dan ukuran lengkap / ukur ulang luas, foto tepi kurang jelas." />
        </label>
      </div>
      <Footer err={err} onClose={onClose}>
        <button type="button" className={BTN_DANGER} disabled={!reason.trim() || busy} onClick={() => void submit([() => onRun({ action: 'REQUEST_REINSPECTION', reason: reason.trim() })])}>
          <RotateCcw className="h-4 w-4" /> Minta Inspeksi Ulang
        </button>
        <button type="button" className={BTN_GOOD} disabled={!reason.trim() || busy} onClick={() => void submit([() => onRun({ action: 'VERIFY_INSPECTION', reason: reason.trim() })])}>
          <ShieldCheck className="h-4 w-4" /> Verifikasi Hasil Inspeksi
        </button>
      </Footer>
    </Modal>
  );
};

const usePhoto = () => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pick = (file?: File) => {
    setErr(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setErr('Gunakan foto JPEG, PNG atau WebP.');
    if (file.size > 5 * 1024 * 1024) return setErr('Foto lebih dari 5 MB.');
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.onerror = () => setErr('Foto tidak dapat dibaca.');
    reader.readAsDataURL(file);
  };
  return { photo, setPhoto, err, pick };
};

/** F.E: repair finished — a new "after" photo and notes go to M.O; the case stays open until M.O verifies. */
const WorkDoneModal: React.FC<{ c: ReportCase; onRun: (cmd: WorkflowCommand) => Promise<ReportMutationOutcome>; onClose: () => void }> = ({ c, onRun, onClose }) => {
  const { photo, setPhoto, err: photoErr, pick } = usePhoto();
  const [note, setNote] = useState('');
  const { busy, err, submit } = useSubmit(onClose);
  const sameAsBefore = !!photo && photo === c.report.photoUrl;
  const last = c.workOrder?.submissions?.at(-1);
  const rework = last?.decision === 'REWORK_REQUESTED' ? last : null;
  return (
    <Modal title="Kirim bukti perbaikan selesai" subtitle={<>Dikirim ke <span className="text-brand">Operations Manager</span> untuk diverifikasi · {c.id}{c.workOrder && ` · ${c.workOrder.id}`}</>} icon={<Camera className="h-5 w-5" />} onClose={onClose}>
      <div className="space-y-4">
        {rework && <p className="rounded-lg border border-status-heavy/40 bg-status-heavy/10 p-2.5 text-xs text-rose-100"><b>Alasan perbaikan ulang dari M.O:</b> {rework.reason}</p>}
        <BeforeAfter
          before={c.report.photoUrl}
          afterSlot={
            <label htmlFor={`wd-${c.id}`} className="grid h-36 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-brand/50 text-center text-xs text-amber-200 hover:bg-brand/5">
              {photo ? <img src={photo} alt="Pratinjau foto sesudah perbaikan" className="h-full w-full object-cover" /> : <span><Camera className="mx-auto mb-1 h-5 w-5" /> Wajib lampirkan foto sesudah<br /><span className="text-fg-muted">Klik untuk kamera / unggah</span></span>}
            </label>
          }
        />
        <input id={`wd-${c.id}`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label="Foto sesudah perbaikan" onChange={(e) => pick(e.target.files?.[0])} />
        <div className="flex items-center justify-between text-xs">
          <span className={photo && !sameAsBefore ? 'text-emerald-300' : 'text-rose-300'}>{sameAsBefore ? '⚠ Ini foto laporan warga, bukan foto sesudah' : photo ? '✓ Foto sesudah terlampir' : '⚠ Foto sesudah belum diunggah'}</span>
          {photo && <button type="button" className="text-fg-muted underline" onClick={() => setPhoto(null)}>Ganti / hapus foto</button>}
        </div>
        {photoErr && <p role="alert" className="text-xs text-rose-300">{photoErr}</p>}
        <label className="block"><span className={LABEL}>Catatan penyelesaian &amp; spesifikasi perbaikan</span>
          <textarea className={INPUT} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: patching AC-WC 5 cm, dipadatkan, tepi dirapikan." />
        </label>
        <p className="font-mono text-[11px] text-fg-muted">
          Lokasi laporan: {c.report.coordinates[0].toFixed(5)}, {c.report.coordinates[1].toFixed(5)} · Waktu kirim dicatat server. Lokasi foto tidak diverifikasi otomatis.
        </p>
      </div>
      <Footer err={err} onClose={onClose}>
        <button type="button" className={BTN_GOOD} disabled={!photo || sameAsBefore || !note.trim() || busy} onClick={() => void submit([() => onRun({ action: 'COMPLETE_WORK_ORDER', reason: note.trim(), completionPhotoUrl: photo! })])}>
          {busy ? 'Mengirim…' : 'Kirim Bukti Perbaikan ke M.O'}
        </button>
      </Footer>
    </Modal>
  );
};

/** M.O: compare before with the F.E repair photo, then verify (final) or ask for rework. */
const WorkVerifyModal: React.FC<{ c: ReportCase; onRun: (cmd: WorkflowCommand) => Promise<ReportMutationOutcome>; onClose: () => void }> = ({ c, onRun, onClose }) => {
  const [reason, setReason] = useState('');
  const { busy, err, submit } = useSubmit(onClose);
  const wo = c.workOrder;
  const subs = wo?.submissions ?? [];
  return (
    <Modal title="Verifikasi mutu perbaikan oleh M.O" subtitle={<>Laporan: <span className="text-brand">{c.id}</span>{wo && <> · Perintah kerja {wo.id}</>}</>} icon={<ShieldCheck className="h-5 w-5" />} onClose={onClose} wide>
      <div className="space-y-4">
        <BeforeAfter before={c.report.photoUrl} after={wo?.completionPhotoUrl} afterAlt="Foto sesudah perbaikan (F.E)" />
        <div className="space-y-2 rounded-xl border border-line bg-canvas/60 p-3 text-xs">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-mono text-fg-subtle">FIELD ENGINEER PELAKSANA</span>
            <span className="font-semibold text-emerald-300">● {wo?.completedBy ? actorName(wo.completedBy) : '—'}</span>
          </div>
          <p className="rounded-lg bg-surface p-2.5 italic">“{wo?.completionNote ?? '—'}”</p>
          <p className="text-fg-muted">Bukti dikirim {wo?.completedAt ? fmt(wo.completedAt) : '—'} · Lokasi laporan {c.report.coordinates[0].toFixed(5)}, {c.report.coordinates[1].toFixed(5)}</p>
          {c.recommendation && <p>Penanganan disetujui: <b>{c.recommendation.treatment}</b></p>}
          {c.assignment && <p className="text-fg-muted">Instruksi awal: {c.assignment.instructions}</p>}
        </div>
        {subs.length > 1 && (
          <details className="rounded-xl border border-line p-3 text-xs">
            <summary className="cursor-pointer font-semibold">Riwayat bukti ({subs.length} pengiriman)</summary>
            <ol className="mt-2 space-y-2">
              {subs.map((s, i) => (
                <li key={s.at} className="flex gap-3">
                  <img src={s.photoUrl} alt={`Bukti perbaikan ke-${i + 1}`} className="h-12 w-16 rounded object-cover" />
                  <span>
                    {fmt(s.at)} · {s.decision === 'REWORK_REQUESTED' ? `diminta ulang: ${s.reason}` : s.decision === 'VERIFIED' ? 'terverifikasi' : 'menunggu keputusan'}
                    <br />
                    <span className="text-fg-muted">{s.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
        <label className="block"><span className={LABEL}>Alasan keputusan (wajib, tercatat di riwayat)</span>
          <textarea className={INPUT} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: permukaan rata dan tepi rapi / tepi tambalan belum rata." />
        </label>
      </div>
      <Footer err={err} onClose={onClose}>
        <button type="button" className={BTN_DANGER} disabled={!reason.trim() || busy} onClick={() => void submit([() => onRun({ action: 'REQUEST_REWORK', reason: reason.trim() })])}>
          <RotateCcw className="h-4 w-4" /> Minta Perbaikan Ulang
        </button>
        <button type="button" className={BTN_GOOD} disabled={!reason.trim() || busy} onClick={() => void submit([() => onRun({ action: 'RESOLVE', reason: reason.trim() })])}>
          <ShieldCheck className="h-4 w-4" /> Setujui &amp; Verifikasi Perbaikan
        </button>
      </Footer>
    </Modal>
  );
};
