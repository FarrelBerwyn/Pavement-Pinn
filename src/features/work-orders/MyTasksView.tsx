/**
 * "Tugas Saya" for the Field Engineer (F.E): every task is a shared report case that an
 * Operations Manager (M.O) assigned to this account. "Mulai Tugas" opens the inspection
 * form of that case; saving it runs the workflow transition, so the M.O queue, the
 * reporter's (R.E) timeline and the Decision Maker's (D.M) priorities read the same record.
 * Nothing on this page is local-only state.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, Clock, Hourglass, MapPin, Play, RefreshCw, Search, Sliders, X } from 'lucide-react';
import type { ReportCase, WorkflowAction } from '../../domain/workflow/model';
import type { WorkflowCommand } from '../../domain/workflow/stateMachine';
import type { EngineerSummary, GatewayMode, ReportView } from '../../services/api/workflowClient';
import type { ReportMutationOutcome } from '../../types';
import { ReportWorkflowPanel, StateBadge, actorName } from '../workflow/ReportWorkflowPanel';
import { fieldTasks, flowStep, RANK, type FieldTask, type Filter, type Priority, type Stage } from './fieldTasks';

const PRIORITY_LABEL: Record<Priority, string> = { HIGH: 'Prioritas tinggi', MEDIUM: 'Prioritas sedang', LOW: 'Prioritas rendah' };
const PRIORITY_CLASS: Record<Priority, string> = {
  HIGH: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  MEDIUM: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  LOW: 'bg-elevated text-slate-300 border-line'
};
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70';

const fmtDate = (iso: string | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const FLOW = [
  { short: 'R.E', label: 'Laporan warga' },
  { short: 'M.O', label: 'Verifikasi & penugasan' },
  { short: 'F.E', label: 'Inspeksi & rekomendasi' },
  { short: 'D.M', label: 'Keputusan & pantauan' }
];

const FlowTrack: React.FC<{ c: ReportCase }> = ({ c }) => {
  const step = flowStep(c);
  return (
    <ol aria-label="Posisi laporan dalam alur" className="flex items-center gap-1 text-[11px] font-semibold">
      {FLOW.map((f, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li key={f.short} className="flex items-center gap-1" aria-current={state === 'current' ? 'step' : undefined} title={f.label}>
            <span
              className={`rounded px-1.5 py-0.5 border ${
                state === 'done' ? 'bg-elevated text-slate-300 border-line' : state === 'current' ? 'bg-amber-400/10 text-amber-300 border-amber-400' : 'bg-surface text-slate-400 border-line'
              }`}
            >
              {f.short}
            </span>
            {i < FLOW.length - 1 && <ChevronRight aria-hidden="true" className="w-3 h-3 text-slate-300" />}
          </li>
        );
      })}
    </ol>
  );
};

export interface MyTasksViewProps {
  /** Shared workflow views (the page passes the app's workflow store). */
  views: Record<string, ReportView>;
  /** Account id of the signed-in engineer; tasks are cases assigned to it. */
  engineerId: string;
  mode: GatewayMode;
  engineers: EngineerSummary[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRun: (reportId: string, command: WorkflowCommand) => Promise<ReportMutationOutcome>;
  onShowOnMap: (c: ReportCase) => void;
  /** Absent when the case's road segment is not in the simulator. */
  onOpenSimulation?: (c: ReportCase) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({ views, engineerId: me, mode, engineers, loading, error, onRefresh, onRun, onShowOnMap, onOpenSimulation }) => {
  const workflow = { views, mode, engineers, loading, error, refresh: onRefresh, runTransition: onRun };

  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'DUE' | 'PRIORITY' | 'NEWEST'>('DUE');
  const [open, setOpen] = useState<{ id: string; action: WorkflowAction | null } | null>(null);

  const tasks = useMemo(() => fieldTasks(Object.values(workflow.views), me), [workflow.views, me]);

  const counts = useMemo(
    () => ({
      ALL: tasks.length,
      TODO: tasks.filter((t) => t.stage === 'TODO').length,
      WAITING: tasks.filter((t) => t.stage === 'WAITING').length,
      DONE: tasks.filter((t) => t.stage === 'DONE').length,
      HIGH: tasks.filter((t) => t.priority === 'HIGH' && t.stage !== 'DONE').length,
      overdue: tasks.filter((t) => t.overdue).length
    }),
    [tasks]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => (filter === 'ALL' ? true : filter === 'HIGH' ? t.priority === 'HIGH' && t.stage !== 'DONE' : t.stage === filter))
      .filter((t) => !q || [t.c.id, t.c.report.segmentName, t.c.report.corridor, t.c.report.damageTypeLabel, t.title].some((s) => s?.toLowerCase().includes(q)))
      .sort((a, b) => {
        // Work that is the engineer's turn always comes first.
        const stage = Number(b.stage === 'TODO') - Number(a.stage === 'TODO');
        if (stage !== 0) return stage;
        if (sort === 'PRIORITY') return RANK[b.priority] - RANK[a.priority];
        if (sort === 'NEWEST') return Date.parse(b.c.assignment?.assignedAt ?? b.c.createdAt) - Date.parse(a.c.assignment?.assignedAt ?? a.c.createdAt);
        return Date.parse(a.c.assignment?.dueAt ?? '') - Date.parse(b.c.assignment?.dueAt ?? '') || RANK[b.priority] - RANK[a.priority];
      });
  }, [tasks, filter, query, sort]);

  const openView = open ? workflow.views[open.id] ?? null : null;
  const openCase = openView ? (openView.case as ReportCase) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const showOnMap = onShowOnMap;

  const chips: { key: Filter; label: string; dot: string }[] = [
    { key: 'ALL', label: 'Semua', dot: '' },
    { key: 'TODO', label: 'Perlu dikerjakan', dot: 'bg-amber-500' },
    { key: 'WAITING', label: 'Menunggu M.O', dot: 'bg-slate-400' },
    { key: 'HIGH', label: 'Prioritas tinggi', dot: 'bg-rose-500' },
    { key: 'DONE', label: 'Selesai', dot: 'bg-emerald-500' }
  ];

  return (
    <div className="w-full min-h-full bg-canvas text-slate-100 antialiased">
      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-amber-400 shrink-0" aria-hidden="true" />
              Tugas Saya
              <span className="text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-md">{counts.ALL} tugas</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Inspeksi yang ditugaskan Manajer Operasional kepada akun Anda. Hasil yang Anda kirim langsung tampil di antrian M.O, linimasa pelapor, dan prioritas D.M.</p>
          </div>
          <button
            type="button"
            onClick={() => workflow.refresh()}
            className={`self-start sm:self-auto whitespace-nowrap shrink-0 inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-line bg-surface text-xs font-semibold text-slate-200 hover:bg-canvas transition-colors ${FOCUS}`}
          >
            <RefreshCw className={`w-4 h-4 ${workflow.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Muat ulang
          </button>
        </header>

        {workflow.error && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            Data tugas tidak dapat dimuat: {workflow.error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-line">
          <div role="group" aria-label="Saring status" className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => {
              const on = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(chip.key)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold border inline-flex items-center gap-2 transition-colors ${FOCUS} ${
                    on ? 'bg-navy text-white border-navy' : 'bg-surface text-slate-300 border-line hover:bg-canvas'
                  }`}
                >
                  {chip.dot && <span aria-hidden="true" className={`w-2 h-2 rounded-full ${chip.dot}`} />}
                  {chip.label} ({counts[chip.key]})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="relative flex-1 sm:w-64">
              <span className="sr-only">Cari tugas</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari ruas, ID laporan, jenis kerusakan…"
                className={`w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-surface text-xs text-slate-100 placeholder:text-slate-400 ${FOCUS}`}
              />
            </label>
            <label className="relative">
              <span className="sr-only">Urutkan</span>
              <Sliders className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={`h-9 pl-9 pr-3 rounded-lg border border-line bg-surface text-xs font-semibold text-slate-200 ${FOCUS}`}>
                <option value="DUE">Batas waktu</option>
                <option value="PRIORITY">Prioritas</option>
                <option value="NEWEST">Terbaru ditugaskan</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
          <section aria-label="Daftar tugas" className="space-y-3 min-w-0">
            {workflow.loading && tasks.length === 0 && <p className="text-sm text-slate-400">Memuat tugas…</p>}

            {!workflow.loading && tasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
                <ClipboardList className="w-8 h-8 mx-auto text-slate-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-100">Belum ada tugas untuk akun ini</p>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Tugas muncul setelah Manajer Operasional memverifikasi laporan warga lalu memilih <strong>Tugaskan inspeksi lapangan</strong> untuk akun Anda ({me}).
                </p>
              </div>
            )}

            {tasks.length > 0 && visible.length === 0 && <p className="rounded-xl border border-line bg-surface p-6 text-center text-xs text-slate-400">Tidak ada tugas yang cocok dengan saringan ini.</p>}

            {visible.map((t) => {
              const r = t.c.report;
              return (
                <article key={t.c.id} className={`rounded-xl border bg-surface p-4 sm:p-5 transition-colors ${t.stage === 'TODO' ? 'border-line' : 'border-line'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div
                      aria-hidden="true"
                      className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${
                        t.stage === 'DONE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : t.stage === 'WAITING' ? 'bg-canvas border-line text-slate-400' : 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                      }`}
                    >
                      {t.stage === 'DONE' ? <CheckCircle2 className="w-5 h-5" /> : t.stage === 'WAITING' ? <Hourglass className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${PRIORITY_CLASS[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                        <StateBadge state={t.c.state} tone="light" />
                        {t.overdue && <span className="text-xs font-semibold px-2 py-0.5 rounded-md border bg-rose-500/10 text-rose-300 border-rose-500/30">Lewat batas waktu</span>}
                        {t.c.dataStatus === 'SYNTHETIC' && <span className="text-xs font-semibold px-2 py-0.5 rounded-md border bg-elevated text-slate-300 border-line">Data contoh</span>}
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-white">
                          {t.title} · {r.damageTypeLabel}
                        </h2>
                        <p className="text-sm text-slate-300 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {r.segmentName}
                            {r.corridor ? ` · ${r.corridor}` : ''}
                          </span>
                        </p>
                      </div>
                      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <dt className="text-slate-400">ID laporan</dt>
                          <dd className="font-mono text-slate-100">{t.c.id}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Ditugaskan oleh</dt>
                          <dd className="text-slate-100 truncate">{t.c.assignment ? actorName(t.c.assignment.assignedBy) : '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Batas waktu</dt>
                          <dd className={`flex items-center gap-1 ${t.overdue ? 'text-rose-300 font-semibold' : 'text-slate-100'}`}>
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            {fmtDate(t.c.assignment?.dueAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Estimasi pelapor</dt>
                          <dd className="text-slate-100">
                            {r.estimatedDepthCm} cm · {r.estimatedAreaM2} m²
                          </dd>
                        </div>
                      </dl>
                      {t.c.assignment?.instructions && <p className="text-xs text-slate-300 bg-canvas border border-line rounded-lg px-3 py-2">Instruksi M.O: {t.c.assignment.instructions}</p>}
                    </div>

                    <div className="flex lg:flex-col items-stretch gap-2 lg:w-44 shrink-0">
                      {t.cta ? (
                        <button
                          type="button"
                          onClick={() => setOpen({ id: t.c.id, action: t.cta!.action })}
                          className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-brand text-navy text-sm font-semibold hover:bg-brand-hover active:bg-brand-press transition-colors ${FOCUS}`}
                        >
                          <Play className="w-4 h-4" aria-hidden="true" />
                          {t.cta.label}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setOpen({ id: t.c.id, action: null })}
                        className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-line bg-surface text-sm font-semibold text-slate-200 hover:bg-canvas transition-colors ${FOCUS}`}
                      >
                        Lihat detail
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                    <FlowTrack c={t.c} />
                    <p className="text-xs text-slate-400">{t.next}</p>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 xl:sticky xl:top-4">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-white">Ringkasan</h2>
              <dl className="mt-3 space-y-2 text-xs">
                {[
                  { label: 'Perlu dikerjakan', value: counts.TODO, dot: 'bg-amber-500' },
                  { label: 'Menunggu keputusan M.O', value: counts.WAITING, dot: 'bg-slate-400' },
                  { label: 'Selesai', value: counts.DONE, dot: 'bg-emerald-500' },
                  { label: 'Lewat batas waktu', value: counts.overdue, dot: 'bg-rose-500' }
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-slate-300">
                      <span aria-hidden="true" className={`w-2 h-2 rounded-full ${row.dot}`} />
                      {row.label}
                    </dt>
                    <dd className="font-semibold text-white tabular-nums">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {counts.ALL > 0 && (
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-elevated" aria-hidden="true">
                  <span className="bg-amber-500" style={{ width: `${(counts.TODO / counts.ALL) * 100}%` }} />
                  <span className="bg-slate-400" style={{ width: `${(counts.WAITING / counts.ALL) * 100}%` }} />
                  <span className="bg-emerald-500" style={{ width: `${(counts.DONE / counts.ALL) * 100}%` }} />
                </div>
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-white">Alur laporan</h2>
              <ol className="mt-3 space-y-2 text-xs text-slate-300">
                <li>
                  <strong className="text-white">R.E</strong> — warga mengirim laporan kerusakan.
                </li>
                <li>
                  <strong className="text-white">M.O</strong> — meninjau, lalu menugaskan inspeksi ke F.E.
                </li>
                <li>
                  <strong className="text-white">F.E</strong> — Anda: inspeksi, kirim hasil, ajukan penanganan, verifikasi perbaikan.
                </li>
                <li>
                  <strong className="text-white">D.M</strong> — melihat rekomendasi dan penanganan per ruas untuk prioritas kebijakan. Persetujuan tetap oleh M.O.
                </li>
              </ol>
              <p className="mt-3 text-xs text-slate-400">
                Sumber: {workflow.mode === 'SERVER' ? 'alur kerja bersama di server, dimuat ulang tiap 15 detik' : 'DEMO OFFLINE di browser ini — tidak terbagi ke akun lain'}.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {open && openView && openCase && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Tutup detail tugas" onClick={() => setOpen(null)} className="absolute inset-0 bg-slate-950/40" />
          <div role="dialog" aria-modal="true" aria-labelledby="task-drawer-title" className="relative w-full max-w-xl h-full overflow-y-auto bg-canvas shadow-xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-mono text-slate-400">{openCase.id}</p>
                <h2 id="task-drawer-title" className="text-base font-semibold text-white truncate">
                  {openCase.report.damageTypeLabel} · {openCase.report.segmentName}
                </h2>
                <div className="mt-2">
                  <FlowTrack c={openCase} />
                </div>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Tutup" className={`w-9 h-9 rounded-lg border border-line text-slate-400 hover:bg-canvas flex items-center justify-center shrink-0 ${FOCUS}`}>
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-5 space-y-3">
              {openCase.report.photoUrl && <img src={openCase.report.photoUrl} alt={`Foto laporan ${openCase.report.damageTypeLabel}`} className="w-full max-h-56 object-cover rounded-xl border border-line bg-elevated" />}
              <ReportWorkflowPanel
                key={`${openCase.id}-${open.action ?? 'view'}`}
                view={openView}
                mode={workflow.mode}
                engineers={workflow.engineers}
                tone="light"
                initialAction={open.action}
                onRun={(command) => workflow.runTransition(openCase.id, command)}
                onShowOnMap={() => showOnMap(openCase)}
              />
              {onOpenSimulation && (
                <button
                  type="button"
                  onClick={() => onOpenSimulation(openCase)}
                  className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-line bg-surface text-sm font-semibold text-slate-200 hover:bg-canvas transition-colors ${FOCUS}`}
                >
                  Buka simulator ruas ini
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
