/**
 * Role-specific workflow queue on top of the shared report cases:
 * - Operations Manager: triage, assignment, verification, decisions, work orders, closing.
 * - Field Engineer: own assignments — inspect, recommend, verify repairs.
 * - Policy Maker: road segments ranked by risk and evidence (read-only).
 *
 * Layout (M.O / F.E): report cards grouped by workflow step on the left, the selected
 * report's evidence and the actions allowed now on the right. Counts, states and actions
 * all come from the shared workflow views; nothing here changes state on its own.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, ImageOff, Inbox, MapPin, RefreshCw } from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateProvider';
import { useSession } from '../../app/providers/SessionProvider';
import { useRouter } from '../../app/router';
import type { ReportCase, WorkflowAction } from '../../domain/workflow/model';
import { ReportWorkflowPanel, StateBadge, actorName } from '../../features/workflow/ReportWorkflowPanel';
import { ACTION_LABEL } from '../../features/workflow/workflowLabels';
import { engineerQueue, isOverdue, operationsQueue, segmentPriorities, type QueueBucket } from '../../features/workflow/queues';

const RISK_STYLE: Record<string, string> = {
  HIGH: 'bg-risk-high/15 text-rose-300 border-risk-high/40',
  WATCH: 'bg-risk-watch/15 text-orange-300 border-risk-watch/40',
  MODERATE: 'bg-risk-moderate/15 text-amber-200 border-risk-moderate/40',
  GOOD: 'bg-risk-good/15 text-emerald-300 border-risk-good/40'
};

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70';

/** Buckets where the M.O must act; the others wait on the field engineer or the contractor. */
const MO_ACTION_KEYS = ['review', 'assign', 'verify', 'decide', 'ready', 'close'];

/** Forward step first: the card's main button is the action that moves the report on. */
const PRIMARY_ORDER: string[] = ['REVIEW_ACCEPT', 'REQUEST_INSPECTION', 'VERIFY_INSPECTION', 'APPROVE_ACTION', 'START_WORK', 'COMPLETE_WORK_ORDER', 'CLOSE_RESOLVED', 'SUBMIT_INSPECTION', 'RECOMMEND_ACTION', 'RESOLVE'];
const rank = (a: string) => (PRIMARY_ORDER.indexOf(a) === -1 ? 99 : PRIMARY_ORDER.indexOf(a));
const byPrimary = (actions: WorkflowAction[]) => [...actions].sort((x, y) => rank(x) - rank(y));

/** What a workflow action does to the case and to the other roles (shown before acting). */
const CONSEQUENCE: Partial<Record<string, string>> = {
  REVIEW_ACCEPT: 'Laporan dinyatakan layak ditindaklanjuti dan pindah ke "Siap ditugaskan". Pelapor melihat status baru.',
  CLOSE_INVALID: 'Laporan ditutup sebagai tidak valid atau duplikat. Alasan tercatat di audit trail dan pelapor melihat statusnya.',
  REQUEST_INSPECTION: 'F.E yang dipilih menerima tugas di "Tugas Saya" beserta instruksi dan batas waktu Anda.',
  VERIFY_INSPECTION: 'Hasil F.E dinyatakan terverifikasi. Jika kerusakan terkonfirmasi, F.E diminta menyusun rekomendasi.',
  REQUEST_REINSPECTION: 'Tugas kembali ke F.E untuk inspeksi ulang dengan alasan Anda. Hasil sebelumnya tetap tercatat.',
  APPROVE_ACTION: 'Penanganan disetujui. F.E dan D.M menerima pemberitahuan; langkah berikutnya menerbitkan perintah kerja.',
  REJECT_ACTION: 'Rekomendasi dikembalikan ke F.E untuk disusun ulang, dengan alasan Anda.',
  CLOSE_NO_ACTION: 'Laporan ditutup tanpa penanganan karena inspeksi terverifikasi tidak menemukan kerusakan.',
  START_WORK: 'Perintah kerja internal diterbitkan (bukan dokumen SPK resmi). Status menjadi "Dalam pengerjaan".',
  COMPLETE_WORK_ORDER: 'Pekerjaan ditandai selesai. F.E diminta memverifikasi hasil perbaikan di lapangan.',
  CLOSE_RESOLVED: 'Laporan ditutup. Pelapor melihat bahwa perbaikan sudah selesai.'
};

const fmtWhen = (iso: string | undefined, fallback: string) => {
  if (!iso) return fallback;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

/** Photo with an honest placeholder when it is missing or fails to load. */
const ReportPhoto: React.FC<{ c: ReportCase; className: string; showId?: boolean }> = ({ c, className, showId }) => {
  const [failed, setFailed] = useState(false);
  const has = !!c.report.photoUrl && !failed;
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-elevated ${className}`}>
      {has ? (
        <img src={c.report.photoUrl} alt={`Foto laporan ${c.id}: ${c.report.damageTypeLabel}`} loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-500">
          <ImageOff className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px]">{c.report.photoUrl ? 'Foto gagal dimuat' : 'Tanpa foto'}</span>
        </div>
      )}
      {showId && <span title={c.id} className="absolute left-1 top-1 max-w-[calc(100%-0.5rem)] truncate rounded-md bg-canvas/85 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-100">{c.id}</span>}
    </div>
  );
};

export const WorkflowQueueSection: React.FC = () => {
  const { currentAccount } = useSession();
  const { workflow, roadSegments, selectSegment } = useAppState();
  const { navigateTo } = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openAction, setOpenAction] = useState<WorkflowAction | null>(null);
  const [filter, setFilter] = useState<'ACT' | 'WAIT' | 'DONE' | 'ALL'>('ACT');
  const detailRef = useRef<HTMLDivElement>(null);

  const staffCases = useMemo(
    () => Object.values(workflow.views).filter((v) => v.audience === 'STAFF').map((v) => v.case as ReportCase),
    [workflow.views]
  );
  const actionsOf = (id: string): WorkflowAction[] => byPrimary(workflow.views[id]?.availableActions ?? []);

  const role = currentAccount.role;
  const isOps = role === 'OPERATIONS_MANAGER';
  const allBuckets: QueueBucket[] = isOps ? operationsQueue(staffCases) : role === 'FIELD_ENGINEER' ? engineerQueue(staffCases, workflow.actor?.id ?? currentAccount.id) : [];
  const closed = staffCases.filter((c) => c.state === 'CLOSED');
  const actBuckets = allBuckets.filter((b) => !isOps || MO_ACTION_KEYS.includes(b.key));
  const waitBuckets = isOps ? allBuckets.filter((b) => !MO_ACTION_KEYS.includes(b.key)) : [];
  const count = (bs: QueueBucket[]) => bs.reduce((n, b) => n + b.items.length, 0);
  const doneBucket: QueueBucket = { key: 'done', title: 'Selesai', hint: 'Laporan yang sudah ditutup', items: closed };
  const shown = filter === 'ACT' ? actBuckets : filter === 'WAIT' ? waitBuckets : filter === 'DONE' ? [doneBucket] : [...allBuckets, doneBucket];
  const filled = shown.filter((b) => b.items.length > 0);
  const empty = shown.filter((b) => b.items.length === 0);

  // Selection survives refreshes while the record exists; it is cleared only if the record is gone.
  const selectedView = selectedId ? workflow.views[selectedId] ?? null : null;
  useEffect(() => {
    if (selectedId && !workflow.loading && !workflow.views[selectedId]) setSelectedId(null);
  }, [selectedId, workflow.views, workflow.loading]);

  const select = (id: string, action: WorkflowAction | null) => {
    setSelectedId(id);
    setOpenAction(action);
    // On narrow screens the detail sits below the list: bring it into view.
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const showOnMap = (c: ReportCase) => {
    const segment = roadSegments.find((s) => s.id === c.segmentId);
    if (segment) selectSegment(segment);
    navigateTo('dashboard');
  };

  const heading = isOps ? 'Antrean operasional laporan' : role === 'FIELD_ENGINEER' ? 'Tugas inspeksi saya' : 'Prioritas ruas berbasis bukti';
  const pills = [
    { key: 'ACT' as const, label: isOps ? 'Perlu tindakan Anda' : 'Tugas saya', n: count(actBuckets), dot: 'bg-brand' },
    ...(isOps ? [{ key: 'WAIT' as const, label: 'Menunggu F.E / pelaksana', n: count(waitBuckets), dot: 'bg-sky-400' }] : []),
    { key: 'DONE' as const, label: 'Selesai', n: closed.length, dot: 'bg-emerald-400' },
    { key: 'ALL' as const, label: 'Semua', n: count(allBuckets) + closed.length, dot: 'bg-slate-400' }
  ];
  const sel = selectedView && selectedView.audience === 'STAFF' ? (selectedView.case as ReportCase) : null;

  return (
    <section aria-labelledby="workflow-queue-title" className="mx-4 sm:mx-5 my-3 rounded-card border border-line-subtle bg-panel text-ink">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 id="workflow-queue-title" className="text-base font-semibold">
            {heading}
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Sumber: alur kerja laporan bersama ({workflow.mode === 'SERVER' ? 'tersimpan di server, dimuat ulang tiap 15 detik' : 'DEMO OFFLINE di browser ini — tidak terbagi ke akun lain'}). AI hanya menyaring dan merekomendasikan; keputusan tetap di tangan petugas.
          </p>
        </div>
        <button type="button" onClick={() => workflow.refresh()} className={`inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] transition-colors ${FOCUS}`}>
          <RefreshCw className={`w-4 h-4 ${workflow.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Muat ulang
        </button>
      </header>

      {workflow.error && (
        <p role="alert" className="mx-4 mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          Data alur kerja tidak dapat dimuat: {workflow.error}
        </p>
      )}

      {role === 'POLICY_MAKER' ? (
        <PolicyPriorities cases={staffCases} onOpen={setSelectedId} selectedId={selectedId} />
      ) : (
        <div className="p-4 space-y-3">
          <div role="group" aria-label="Saring antrean" className="flex flex-wrap gap-2">
            {pills.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={filter === p.key}
                onClick={() => setFilter(p.key)}
                className={`inline-flex items-center gap-2 h-9 px-3 rounded-full border text-xs font-semibold transition-colors ${FOCUS} ${
                  filter === p.key ? 'bg-brand text-navy border-brand' : 'bg-white/[0.03] text-slate-200 border-white/10 hover:bg-white/[0.06]'
                }`}
              >
                <span aria-hidden="true" className={`w-2 h-2 rounded-full ${filter === p.key ? 'bg-navy' : p.dot}`} />
                {p.label} ({p.n})
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,1fr)] items-start">
            {/* Left: report cards grouped by workflow step */}
            <div className="@container min-w-0 space-y-4">
              {workflow.loading && staffCases.length === 0 && <p className="text-xs text-slate-400">Memuat antrean…</p>}
              {!workflow.loading && filled.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/15 p-6 text-center">
                  <Inbox className="w-6 h-6 mx-auto text-slate-500" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-slate-200">Tidak ada laporan di bagian ini</p>
                  <p className="mt-1 text-xs text-slate-400">Pilih saringan lain di atas, atau muat ulang untuk melihat laporan terbaru.</p>
                </div>
              )}
              {filled.map((b) => (
                <div key={b.key} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {b.title} <span className="ml-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-bold text-amber-200 tabular-nums">{b.items.length}</span>
                    </h3>
                    <span className="text-xs text-slate-400">{b.hint}</span>
                  </div>
                  <ul className="space-y-2">
                    {b.items.map((c) => {
                      const next = actionsOf(c.id)[0] ?? null;
                      const selected = selectedId === c.id;
                      return (
                        <li key={c.id}>
                          <article className={`rounded-xl border p-3 transition-colors ${selected ? 'border-brand/70 bg-brand/[0.06]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                            <div className="flex flex-col @2xl:flex-row gap-3">
                              <div className="flex gap-3 flex-1 min-w-0">
                              <button type="button" onClick={() => select(c.id, null)} aria-label={`Lihat detail ${c.id}`} className={`shrink-0 self-start rounded-xl ${FOCUS}`}>
                                <ReportPhoto c={c} showId className="w-24 h-24 @lg:w-32" />
                              </button>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StateBadge state={c.state} />
                                  <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-slate-300">{c.report.damageType}</span>
                                  <span className="text-[11px] font-semibold text-slate-300">· {c.inspection?.severity ?? c.report.severity}</span>
                                  {isOverdue(c) && <span className="text-[11px] font-bold text-rose-300">· lewat batas waktu</span>}
                                  {c.dataStatus === 'SYNTHETIC' && <span className="rounded-md border border-amber-500/30 px-1.5 text-[11px] text-amber-200">data contoh</span>}
                                </div>
                                <button type="button" onClick={() => select(c.id, null)} className={`block text-left text-sm font-semibold text-white hover:text-amber-200 rounded ${FOCUS}`}>
                                  {c.report.damageTypeLabel}
                                </button>
                                <p className="flex items-center gap-1 text-xs text-slate-300 min-w-0">
                                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                                  <span className="min-w-0 truncate" title={c.report.segmentName}>{c.report.segmentName}</span>
                                  <span className="hidden @xl:inline shrink-0 text-slate-500 tabular-nums">
                                    ({c.report.coordinates[0].toFixed(4)}, {c.report.coordinates[1].toFixed(4)})
                                  </span>
                                </p>
                                {c.report.description && <p className="text-xs text-slate-400 line-clamp-2">“{c.report.description}”</p>}
                                <p className="text-[11px] text-slate-500">
                                  <span className="font-mono text-slate-400">{c.id}</span> · Pelapor: <span className="text-slate-300">{c.report.reporterName || 'Anonim'}</span> · {fmtWhen(c.createdAt, c.report.timestamp)}
                                  {c.assignment && (
                                    <>
                                      {' '}
                                      · F.E: <span className="text-slate-300">{actorName(c.assignment.engineerId)}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                              </div>
                              <div className="@2xl:self-center shrink-0">
                                {next ? (
                                  <button
                                    type="button"
                                    onClick={() => select(c.id, next)}
                                    className={`w-full @2xl:w-auto inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-brand text-navy text-xs font-semibold hover:bg-brand-hover active:bg-brand-press transition-colors ${FOCUS}`}
                                  >
                                    {ACTION_LABEL[next] ?? next}
                                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                    {c.state === 'CLOSED' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" /> : <Clock className="w-4 h-4" aria-hidden="true" />}
                                    {c.state === 'CLOSED' ? 'Selesai' : 'Menunggu peran lain'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {empty.length > 0 && filled.length > 0 && <p className="text-xs text-slate-500">Tidak ada laporan di: {empty.map((b) => b.title).join(' · ')}.</p>}
            </div>

            {/* Right: selected report detail, sticky on desktop */}
            <div ref={detailRef} className="min-w-0 lg:sticky lg:top-3 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto custom-scrollbar rounded-2xl">
              {selectedView && sel ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                    <ReportPhoto key={sel.id} c={sel} className="w-full h-48" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-300">{sel.id}</span>
                      <StateBadge state={sel.state} />
                      <span className="text-xs text-slate-300">
                        {sel.report.damageTypeLabel} · {sel.inspection?.severity ?? sel.report.severity}
                      </span>
                    </div>
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-slate-500">Lokasi</dt>
                      <dd className="text-slate-200">
                        {sel.report.segmentName}
                        <span className="block text-slate-500 tabular-nums">
                          {sel.report.coordinates[0].toFixed(5)}, {sel.report.coordinates[1].toFixed(5)}
                        </span>
                      </dd>
                      <dt className="text-slate-500">Pelapor</dt>
                      <dd className="text-slate-200">
                        {sel.report.reporterName || 'Anonim'} · {fmtWhen(sel.createdAt, sel.report.timestamp)}
                      </dd>
                    </dl>
                    <div className="rounded-xl border border-brand/30 bg-brand/[0.06] p-3 text-xs">
                      <p className="font-semibold text-amber-200">Langkah berikutnya</p>
                      {selectedView.availableActions.length > 0 ? (
                        <ul className="mt-1 space-y-1 text-slate-200">
                          {byPrimary(selectedView.availableActions).map((a) => (
                            <li key={a}>
                              <strong>{ACTION_LABEL[a] ?? a}</strong>
                              {CONSEQUENCE[a] && <span className="text-slate-400"> — {CONSEQUENCE[a]}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-slate-300">Tidak ada tindakan untuk Anda pada status ini; laporan menunggu peran lain atau sudah selesai.</p>
                      )}
                    </div>
                  </div>
                  <ReportWorkflowPanel
                    key={`${sel.id}-${openAction ?? 'view'}`}
                    view={selectedView}
                    mode={workflow.mode}
                    engineers={workflow.engineers}
                    initialAction={openAction}
                    onRun={(command) => workflow.runTransition(sel.id, command)}
                    onShowOnMap={() => showOnMap(sel)}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
                  <Inbox className="w-7 h-7 mx-auto text-slate-500" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-slate-200">Pilih laporan untuk melihat bukti dan tindakan yang tersedia</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {isOps
                      ? 'Tinjau laporan warga, tugaskan inspeksi kepada F.E (Field Engineer), lalu verifikasi hasilnya sebelum memutuskan penanganan.'
                      : 'Buka tugas untuk melihat konteks laporan dan mengirim hasil inspeksi.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const PolicyPriorities: React.FC<{ cases: ReportCase[]; onOpen: (id: string) => void; selectedId: string | null }> = ({ cases, onOpen, selectedId }) => {
  const { workflow, roadSegments } = useAppState();
  const pilot = roadSegments.filter((s) => s.pilot);
  const others = roadSegments.filter((s) => !s.pilot && cases.some((c) => c.segmentId === s.id));
  const rows = segmentPriorities([...pilot, ...others], cases, new Date().toISOString());
  const selectedView = selectedId ? workflow.views[selectedId] ?? null : null;

  return (
    <div className="space-y-3 p-4">
      <p className="text-xs text-slate-400">
        Peringkat memakai estimasi RULE_BASED (belum tervalidasi) dan laporan yang terverifikasi. Tidak ada angka penghematan atau anggaran yang ditampilkan tanpa model ekonomi tervalidasi.
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-white/[0.04] text-slate-300">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Ruas</th>
              <th scope="col" className="px-3 py-2 font-semibold">Risiko (estimasi)</th>
              <th scope="col" className="px-3 py-2 font-semibold">Laporan terbuka</th>
              <th scope="col" className="px-3 py-2 font-semibold">Terkonfirmasi</th>
              <th scope="col" className="px-3 py-2 font-semibold">Menunggu keputusan</th>
              <th scope="col" className="px-3 py-2 font-semibold">Penanganan disetujui</th>
              <th scope="col" className="px-3 py-2 font-semibold">Selesai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.segment.id} className="border-t border-white/5">
                <th scope="row" className="px-3 py-2 font-medium text-slate-100">
                  {r.segment.name}
                  {r.segment.pilot && <span className="ml-1 text-xs text-amber-300">pilot</span>}
                </th>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded border px-2 py-1 font-bold ${RISK_STYLE[r.risk]}`}>{r.risk}</span>
                  <span className="ml-1 text-slate-400">skor {r.conditionScorePrototype}</span>
                </td>
                <td className="px-3 py-2">{r.openReports}</td>
                <td className="px-3 py-2">{r.confirmed}</td>
                <td className="px-3 py-2">{r.pendingDecisions}</td>
                <td className="px-3 py-2">{r.approvedInterventions}</td>
                <td className="px-3 py-2">{r.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="text-xs font-semibold">Rekomendasi yang menunggu atau sudah disetujui</h3>
        <ul className="mt-2 space-y-1">
          {cases
            .filter((c) => ['ACTION_RECOMMENDED', 'ACTION_APPROVED', 'IN_PROGRESS'].includes(c.state))
            .map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
                >
                  <span className="text-xs font-semibold">{c.report.segmentName}</span>
                  <span className="ml-2 text-xs text-slate-400">{c.recommendation?.treatment ?? '—'}</span>
                  <span className="ml-2">
                    <StateBadge state={c.state} />
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </div>
      {selectedView && <ReportWorkflowPanel view={selectedView} mode={workflow.mode} engineers={workflow.engineers} onRun={(command) => workflow.runTransition(selectedView.case.id, command)} />}
    </div>
  );
};
