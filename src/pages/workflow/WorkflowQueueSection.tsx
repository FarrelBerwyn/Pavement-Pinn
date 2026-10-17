/**
 * Role-specific workflow queue on top of the shared report cases:
 * - Operations Manager: triage, assignment, decisions, work orders, closing.
 * - Field Engineer: own assignments — inspect, recommend, verify repairs.
 * - Policy Maker: road segments ranked by risk and evidence (read-only).
 * Selecting a report opens the same ReportWorkflowPanel every role uses.
 */
import React, { useMemo, useState } from 'react';
import { useAppState } from '../../app/providers/AppStateProvider';
import { useSession } from '../../app/providers/SessionProvider';
import { useRouter } from '../../app/router';
import type { ReportCase } from '../../domain/workflow/model';
import { ReportWorkflowPanel, StateBadge } from '../../features/workflow/ReportWorkflowPanel';
import { engineerQueue, isOverdue, operationsQueue, segmentPriorities, type QueueBucket } from '../../features/workflow/queues';

const RISK_STYLE: Record<string, string> = {
  HIGH: 'bg-risk-high/15 text-rose-300 border-risk-high/40',
  WATCH: 'bg-risk-watch/15 text-orange-300 border-risk-watch/40',
  MODERATE: 'bg-risk-moderate/15 text-amber-200 border-risk-moderate/40',
  GOOD: 'bg-risk-good/15 text-emerald-300 border-risk-good/40'
};

export const WorkflowQueueSection: React.FC = () => {
  const { currentAccount } = useSession();
  const { workflow, roadSegments, selectSegment } = useAppState();
  const { navigateTo } = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const staffCases = useMemo(
    () => Object.values(workflow.views).filter((v) => v.audience === 'STAFF').map((v) => v.case as ReportCase),
    [workflow.views]
  );

  const role = currentAccount.role;
  const buckets: QueueBucket[] = role === 'OPERATIONS_MANAGER' ? operationsQueue(staffCases) : role === 'FIELD_ENGINEER' ? engineerQueue(staffCases, workflow.actor?.id ?? currentAccount.id) : [];
  const selectedView = selectedId ? workflow.views[selectedId] ?? null : null;

  const showOnMap = (c: ReportCase) => {
    const segment = roadSegments.find((s) => s.id === c.segmentId);
    if (segment) selectSegment(segment);
    navigateTo('dashboard');
  };

  const heading =
    role === 'OPERATIONS_MANAGER' ? 'Antrian operasional laporan' : role === 'FIELD_ENGINEER' ? 'Tugas inspeksi saya' : 'Prioritas ruas berbasis bukti';

  return (
    <section aria-labelledby="workflow-queue-title" className="m-3 sm:m-4 rounded-2xl border border-slate-700/60 bg-surface text-slate-100 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <h2 id="workflow-queue-title" className="text-sm font-bold">
            {heading}
          </h2>
          <p className="text-xs text-slate-400">
            Sumber: alur kerja laporan bersama ({workflow.mode === 'SERVER' ? 'tersimpan di server' : 'DEMO OFFLINE di browser ini'}). AI merekomendasikan; keputusan tetap di tangan petugas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => workflow.refresh()}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 transition-colors"
        >
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
        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 space-y-3">
            {workflow.loading && staffCases.length === 0 && <p className="text-xs text-slate-400">Memuat antrian…</p>}
            {buckets.map((b) => (
              <div key={b.key} className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <h3 className="text-xs font-semibold text-slate-100">
                    {b.title} <span className="ml-1 rounded bg-white/10 px-2 text-xs font-bold">{b.items.length}</span>
                  </h3>
                  <span className="text-xs text-slate-400">{b.hint}</span>
                </div>
                {b.items.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">Tidak ada.</p>
                ) : (
                  <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                    {b.items.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          aria-current={selectedId === c.id}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
                            selectedId === c.id ? 'border-brand/60 bg-brand/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold">{c.report.segmentName}</span>
                            <StateBadge state={c.state} />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                            <span className="font-mono">{c.id}</span>
                            <span>{c.report.damageTypeLabel}</span>
                            <span>· {c.inspection?.severity ?? c.report.severity}</span>
                            {isOverdue(c) && <span className="font-bold text-rose-300">· lewat batas</span>}
                            {c.dataStatus === 'SYNTHETIC' && <span className="text-amber-300">· contoh</span>}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div className="min-w-0 lg:sticky lg:top-3 self-start">
            {selectedView ? (
              <ReportWorkflowPanel
                view={selectedView}
                mode={workflow.mode}
                engineers={workflow.engineers}
                onRun={(command) => workflow.runTransition(selectedView.case.id, command)}
                onShowOnMap={() => showOnMap(selectedView.case as ReportCase)}
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs text-slate-400">Pilih laporan di antrian untuk melihat bukti dan tindakan yang tersedia.</p>
            )}
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
