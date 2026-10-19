/**
 * "Hasil laporan perbaikan jalan (Before & After)" for a finished case, as opened from the
 * task boards in the reference video ("Lihat Hasil Terverifikasi" / "Lihat Hasil Transparansi
 * Mutu"). Everything comes from the server case: the citizen photo, the repair photo M.O
 * verified, and the full lifecycle from the case history (not a fixed list of steps).
 */
import React from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { ReportCase, TransitionRecord } from '../../../domain/workflow/model';
import { BeforeAfterSlider } from '../../../components/ui/BeforeAfterSlider';
import { WORKFLOW_STATE_LABEL, ROLE_SHORT } from '../workflowLabels';
import { actorName } from '../ReportWorkflowPanel';

const fmt = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Who did a step, in words: a person for staff and reporters, "Sistem" for automation. */
function who(h: TransitionRecord): string {
  if (h.actor.kind === 'SYSTEM' || h.actor.role === 'SYSTEM') return 'Sistem';
  const role = ROLE_SHORT[h.actor.role] ?? h.actor.role;
  return h.actor.kind === 'ANONYMOUS' ? `Pelapor anonim (${role})` : `${actorName(h.actor.id)} (${role})`;
}

export const RepairResult: React.FC<{ c: ReportCase; onZoom?: (src: string, alt: string) => void }> = ({ c, onZoom }) => {
  const verified = c.state === 'RESOLVED' || c.state === 'CLOSED';
  const wo = c.workOrder;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${verified && wo?.completionPhotoUrl ? 'border-status-good/50 bg-status-good/10 text-emerald-300' : 'border-line text-fg-muted'}`}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {verified && wo?.completionPhotoUrl ? 'Selesai & diverifikasi resmi M.O' : WORKFLOW_STATE_LABEL[c.state]}
        </span>
        <span className="font-mono text-xs text-brand">{c.id}</span>
      </div>

      <p className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/60 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate">{c.report.segmentName}</span>
        </span>
        <span className="shrink-0 font-mono text-xs text-fg-muted">
          {c.report.coordinates[0].toFixed(4)}, {c.report.coordinates[1].toFixed(4)}
        </span>
      </p>

      <BeforeAfterSlider
        before={c.report.photoUrl}
        after={wo?.completionPhotoUrl}
        beforeAlt="Foto sebelum perbaikan (laporan warga)"
        afterAlt="Foto sesudah perbaikan (bukti F.E)"
        afterBadge={wo?.completionPhotoUrl ? (verified ? '✓ Terverifikasi M.O' : 'Menunggu verifikasi M.O') : null}
        emptyAfterText="Foto sesudah belum tersedia: kasus ini ditutup tanpa bukti perbaikan dari F.E."
        onZoom={onZoom}
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-line bg-canvas/60 p-3 text-xs sm:grid-cols-4">
        <dt className="text-fg-subtle">Status sekarang</dt>
        <dd className="font-semibold sm:col-span-3">{WORKFLOW_STATE_LABEL[c.state]}</dd>
        {c.assignment && (
          <>
            <dt className="text-fg-subtle">SPK</dt>
            <dd className="font-mono sm:col-span-3">{c.assignment.id} · F.E {actorName(c.assignment.engineerId)}</dd>
          </>
        )}
        {wo && (
          <>
            <dt className="text-fg-subtle">Perintah kerja</dt>
            <dd className="font-mono sm:col-span-3">{wo.id}{wo.completedAt ? ` · bukti ${fmt(wo.completedAt)}` : ''}</dd>
          </>
        )}
        {c.recommendation && (
          <>
            <dt className="text-fg-subtle">Penanganan</dt>
            <dd className="sm:col-span-3">{c.recommendation.treatment}</dd>
          </>
        )}
      </dl>

      <section aria-label="Riwayat siklus laporan">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-fg-muted">Riwayat siklus laporan ({c.history.length} langkah)</h3>
        <ol className="space-y-2 border-l border-line pl-4">
          {c.history.map((h, i) => {
            const last = i === c.history.length - 1;
            return (
              <li key={h.id} className="relative">
                <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${last ? 'bg-brand' : 'bg-status-good'}`} aria-hidden="true" />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{h.publicNote}</p>
                  <span className="font-mono text-[11px] text-fg-subtle">{fmt(h.at)}</span>
                </div>
                <p className="text-xs text-fg-muted">
                  {who(h)} · {WORKFLOW_STATE_LABEL[h.to]}
                </p>
                {h.reason && h.actor.role !== 'SYSTEM' && <p className="mt-0.5 text-xs text-fg/80">“{h.reason}”</p>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
};
