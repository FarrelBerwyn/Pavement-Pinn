/**
 * The report's workflow, as each role should see it: current state, the evidence that
 * matters for the next decision, the history, and only the actions this actor may take.
 * Every action goes to the workflow store and the panel shows success only after the
 * store saved it. Staff see the full case; citizens see public notes only.
 */
import React, { useMemo, useState } from 'react';
import type { WorkflowAction, WorkflowState, ReportCase } from '../../domain/workflow/model';
import type { PublicReportView } from '../../domain/workflow/projections';
import type { WorkflowCommand } from '../../domain/workflow/stateMachine';
import type { EngineerSummary, GatewayMode, ReportView } from '../../services/api/workflowClient';
import type { ReportMutationOutcome } from '../../types';
import { ACTION_LABEL, stateTone, TONE_CLASS, WORKFLOW_STATE_LABEL } from './workflowLabels';

export interface ReportWorkflowPanelProps {
  view: ReportView | null;
  mode: GatewayMode;
  engineers: EngineerSummary[];
  onRun: (command: WorkflowCommand) => Promise<ReportMutationOutcome>;
  /** Optional: jump to the report's road on the map. */
  onShowOnMap?: () => void;
  /** Smaller paddings for use inside the map bottom sheet. */
  compact?: boolean;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
};

export const StateBadge: React.FC<{ state: WorkflowState | string }> = ({ state }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${TONE_CLASS[stateTone(state)]}`}>
    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
    {WORKFLOW_STATE_LABEL[state as WorkflowState] ?? state}
  </span>
);

const DataTag: React.FC<{ children: React.ReactNode; tone?: 'demo' | 'observed' | 'neutral' }> = ({ children, tone = 'neutral' }) => (
  <span
    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide border ${
      tone === 'demo' ? 'border-amber-500/40 text-amber-200 bg-amber-500/10' : tone === 'observed' ? 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10' : 'border-slate-500/40 text-slate-300 bg-slate-700/30'
    }`}
  >
    {children}
  </span>
);

const Field: React.FC<{ label: string; htmlFor: string; children: React.ReactNode; hint?: string }> = ({ label, htmlFor, children, hint }) => (
  <div className="space-y-1">
    <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-slate-300">
      {label}
    </label>
    {children}
    {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
  </div>
);

const inputClass =
  'w-full rounded-lg bg-slate-900/80 border border-white/15 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 transition-shadow';

/** Inline form for one action; builds the command and calls onRun. */
const ActionForm: React.FC<{
  action: WorkflowAction;
  engineers: EngineerSummary[];
  caseData: ReportCase;
  busy: boolean;
  onSubmit: (command: WorkflowCommand) => void;
  onCancel: () => void;
}> = ({ action, engineers, caseData, busy, onSubmit, onCancel }) => {
  const id = (name: string) => `wf-${caseData.id}-${action}-${name}`;
  const [reason, setReason] = useState('');
  const [engineerId, setEngineerId] = useState(engineers[0]?.id ?? '');
  const [dueAt, setDueAt] = useState(inDays(3));
  const [instructions, setInstructions] = useState('');
  const [verdict, setVerdict] = useState<'CONFIRMED' | 'NOT_CONFIRMED'>('CONFIRMED');
  const [cvAccepted, setCvAccepted] = useState(true);
  const [correctedClass, setCorrectedClass] = useState('');
  const [depth, setDepth] = useState('');
  const [area, setArea] = useState('');
  const [severity, setSeverity] = useState<'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL'>(caseData.report.severity);
  const [notes, setNotes] = useState('');
  const [treatment, setTreatment] = useState('');
  const [urgency, setUrgency] = useState<'ROUTINE' | 'PRIORITY' | 'URGENT'>('PRIORITY');
  const [rationale, setRationale] = useState('');
  const [contractorNote, setContractorNote] = useState('');

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    switch (action) {
      case 'REQUEST_INSPECTION':
        return onSubmit({ action, reason, engineerId, dueAt: new Date(`${dueAt}T17:00:00`).toISOString(), instructions });
      case 'SUBMIT_INSPECTION':
        return onSubmit({
          action,
          verdict,
          cvReview: { accepted: cvAccepted, correctedClass: cvAccepted ? null : correctedClass },
          measuredDepthCm: num(depth),
          measuredAreaM2: num(area),
          severity,
          notes
        });
      case 'RECOMMEND_ACTION':
        return onSubmit({ action, treatment, urgency, rationale, assessmentId: null });
      case 'START_WORK':
        return onSubmit({ action, reason, contractorNote });
      default:
        return onSubmit({ action, reason } as WorkflowCommand);
    }
  };

  const needsReason = !['SUBMIT_INSPECTION', 'RECOMMEND_ACTION'].includes(action);

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <p className="text-[11px] font-bold text-slate-100">{ACTION_LABEL[action]}</p>

      {action === 'REQUEST_INSPECTION' && (
        <>
          <Field label="Insinyur lapangan" htmlFor={id('eng')}>
            <select id={id('eng')} className={inputClass} value={engineerId} onChange={(e) => setEngineerId(e.target.value)} required>
              {engineers.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.name} — {en.agencyCode} ({en.id})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Batas waktu inspeksi" htmlFor={id('due')}>
            <input id={id('due')} type="date" className={inputClass} value={dueAt} min={inDays(1)} onChange={(e) => setDueAt(e.target.value)} required />
          </Field>
          <Field label="Instruksi" htmlFor={id('ins')}>
            <textarea id={id('ins')} className={inputClass} rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Mis. ukur kedalaman & luas, foto tepi lubang" />
          </Field>
        </>
      )}

      {action === 'SUBMIT_INSPECTION' && (
        <>
          <Field label="Hasil pemeriksaan" htmlFor={id('verdict')}>
            <select id={id('verdict')} className={inputClass} value={verdict} onChange={(e) => setVerdict(e.target.value as typeof verdict)}>
              <option value="CONFIRMED">Kerusakan terkonfirmasi</option>
              <option value="NOT_CONFIRMED">Tidak ditemukan kerusakan</option>
            </select>
          </Field>
          <div className="flex items-center gap-2">
            <input id={id('cv')} type="checkbox" checked={cvAccepted} onChange={(e) => setCvAccepted(e.target.checked)} className="accent-sky-400" />
            <label htmlFor={id('cv')} className="text-[11px] text-slate-300">
              Jenis kerusakan pada laporan sudah benar ({caseData.report.damageTypeLabel})
            </label>
          </div>
          {!cvAccepted && (
            <Field label="Koreksi jenis kerusakan" htmlFor={id('cls')}>
              <input id={id('cls')} className={inputClass} value={correctedClass} onChange={(e) => setCorrectedClass(e.target.value)} required placeholder="Mis. ALLIGATOR_CRACK" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Kedalaman terukur (cm)" htmlFor={id('depth')}>
              <input id={id('depth')} type="number" min={0} step="0.1" inputMode="decimal" className={inputClass} value={depth} onChange={(e) => setDepth(e.target.value)} />
            </Field>
            <Field label="Luas terukur (m²)" htmlFor={id('area')}>
              <input id={id('area')} type="number" min={0} step="0.1" inputMode="decimal" className={inputClass} value={area} onChange={(e) => setArea(e.target.value)} />
            </Field>
          </div>
          <Field label="Tingkat keparahan" htmlFor={id('sev')}>
            <select id={id('sev')} className={inputClass} value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              <option value="LIGHT">Ringan</option>
              <option value="MODERATE">Sedang</option>
              <option value="SEVERE">Berat</option>
              <option value="CRITICAL">Kritis</option>
            </select>
          </Field>
          <Field label="Catatan inspeksi" htmlFor={id('notes')}>
            <textarea id={id('notes')} className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} required placeholder="Kondisi yang diamati di lapangan" />
          </Field>
        </>
      )}

      {action === 'RECOMMEND_ACTION' && (
        <>
          <Field label="Penanganan yang direkomendasikan" htmlFor={id('tr')}>
            <input id={id('tr')} className={inputClass} value={treatment} onChange={(e) => setTreatment(e.target.value)} required placeholder="Mis. patching + overlay tipis AC-WC" />
          </Field>
          <Field label="Urgensi" htmlFor={id('urg')}>
            <select id={id('urg')} className={inputClass} value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)}>
              <option value="ROUTINE">Rutin</option>
              <option value="PRIORITY">Prioritas</option>
              <option value="URGENT">Mendesak</option>
            </select>
          </Field>
          <Field label="Alasan teknis" htmlFor={id('rat')} hint="Penilaian rekayasa (RULE_BASED, belum tervalidasi) dilampirkan otomatis oleh server.">
            <textarea id={id('rat')} className={inputClass} rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} required />
          </Field>
        </>
      )}

      {action === 'START_WORK' && (
        <Field label="Catatan pelaksana" htmlFor={id('con')} hint="Perintah kerja internal sistem — bukan dokumen SPK resmi.">
          <input id={id('con')} className={inputClass} value={contractorNote} onChange={(e) => setContractorNote(e.target.value)} placeholder="Mis. tim swakelola BBPJN" />
        </Field>
      )}

      {needsReason && (
        <Field label="Alasan (tercatat di audit trail)" htmlFor={id('reason')}>
          <textarea id={id('reason')} className={inputClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </Field>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={busy} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 transition-colors">
          Batal
        </button>
        <button type="submit" disabled={busy} aria-busy={busy} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 transition-colors">
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  );
};

export const ReportWorkflowPanel: React.FC<ReportWorkflowPanelProps> = ({ view, mode, engineers, onRun, onShowOnMap, compact }) => {
  const [openAction, setOpenAction] = useState<WorkflowAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const engineerName = useMemo(() => new Map(engineers.map((e) => [e.id, e.name])), [engineers]);

  if (!view) {
    return <p className="text-[11px] text-slate-400">Status alur kerja belum dimuat.</p>;
  }

  const isStaff = view.audience === 'STAFF';
  const staffCase = isStaff ? (view.case as ReportCase) : null;
  const publicCase = !isStaff ? (view.case as PublicReportView) : null;
  const state = view.case.state;

  const run = async (command: WorkflowCommand) => {
    setBusy(true);
    setMessage(null);
    const outcome = await onRun(command);
    setBusy(false);
    if (outcome.ok === false) {
      const failure = outcome as { error: string; code: string };
      setMessage({ tone: 'error', text: failure.code === 'VERSION_CONFLICT' ? 'Laporan baru saja diubah orang lain; data sudah dimuat ulang. Periksa lalu ulangi.' : failure.error });
      return;
    }
    setOpenAction(null);
    setMessage({ tone: 'ok', text: `${ACTION_LABEL[command.action as WorkflowAction]} — tersimpan.` });
  };

  const assignmentOverdue = staffCase?.assignment && state === 'FIELD_INSPECTION_REQUESTED' && Date.parse(staffCase.assignment.dueAt) < Date.now();

  return (
    <section aria-label="Status alur kerja laporan" className={`rounded-2xl border border-white/10 bg-slate-900/60 ${compact ? 'p-2.5' : 'p-3.5'} space-y-3 text-slate-200`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge state={state} />
          <span className="text-[10px] font-mono text-slate-400">{view.case.id}</span>
          {mode === 'OFFLINE_DEMO' && <DataTag tone="demo">DEMO OFFLINE — tidak tersimpan di server</DataTag>}
          {staffCase && staffCase.dataStatus === 'SYNTHETIC' && <DataTag tone="demo">DATA CONTOH (SYNTHETIC)</DataTag>}
        </div>
        {onShowOnMap && (
          <button type="button" onClick={onShowOnMap} className="text-[11px] font-semibold text-sky-300 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded px-1">
            Lihat di peta
          </button>
        )}
      </header>

      {staffCase && (
        <div className="grid gap-2 text-[11px]">
          {staffCase.screening && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100">Penyaringan otomatis</span>
                <DataTag tone={staffCase.screening.modelStatus === 'REAL' ? 'observed' : 'demo'}>{staffCase.screening.modelStatus}</DataTag>
              </div>
              <p className="text-slate-300">
                {staffCase.screening.detectedClass ? `Kelas: ${staffCase.screening.detectedClass}` : 'Tidak ada keluaran model'}
                {staffCase.screening.confidence !== null && ` · kepercayaan ${(staffCase.screening.confidence * 100).toFixed(0)}% (${staffCase.screening.modelStatus})`}
              </p>
              <ul className="list-disc pl-4 text-slate-400 space-y-0.5">
                {staffCase.screening.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {staffCase.assignment && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
              <span className="font-semibold text-slate-100">Penugasan inspeksi</span>
              <p className="text-slate-300">
                {engineerName.get(staffCase.assignment.engineerId) ?? staffCase.assignment.engineerId} · batas {fmt(staffCase.assignment.dueAt)}
                {assignmentOverdue && <span className="ml-1 font-bold text-rose-300">(lewat batas waktu)</span>}
              </p>
              {staffCase.assignment.instructions && <p className="text-slate-400">{staffCase.assignment.instructions}</p>}
            </div>
          )}
          {staffCase.inspection && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100">Hasil inspeksi lapangan</span>
                <DataTag tone="observed">OBSERVED</DataTag>
              </div>
              <p className="text-slate-300">
                {staffCase.inspection.verdict === 'CONFIRMED' ? 'Terkonfirmasi' : 'Tidak terkonfirmasi'} · {staffCase.inspection.severity}
                {staffCase.inspection.measuredDepthCm !== null && ` · ${staffCase.inspection.measuredDepthCm} cm`}
                {staffCase.inspection.measuredAreaM2 !== null && ` · ${staffCase.inspection.measuredAreaM2} m²`}
              </p>
              <p className="text-slate-400">
                Klasifikasi laporan {staffCase.inspection.cvReview.accepted ? 'diterima' : `dikoreksi menjadi ${staffCase.inspection.cvReview.correctedClass}`}. {staffCase.inspection.notes}
              </p>
            </div>
          )}
          {staffCase.recommendation && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 space-y-0.5">
              <span className="font-semibold text-slate-100">Rekomendasi penanganan</span>
              <p className="text-slate-300">
                {staffCase.recommendation.treatment} · {staffCase.recommendation.urgency}
              </p>
              <p className="text-slate-400">{staffCase.recommendation.rationale}</p>
              {staffCase.recommendation.assessment && (
                <p className="text-slate-400">
                  Penilaian: risiko {staffCase.recommendation.assessment.risk}, skor kondisi prototipe {staffCase.recommendation.assessment.conditionScorePrototype}{' '}
                  <DataTag tone="demo">{staffCase.recommendation.assessment.engine}</DataTag> <DataTag>{staffCase.recommendation.assessment.validationStatus}</DataTag>
                </p>
              )}
            </div>
          )}
          {staffCase.approvals.length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
              <span className="font-semibold text-slate-100">Keputusan</span>
              <ul className="mt-0.5 space-y-0.5">
                {staffCase.approvals.map((a) => (
                  <li key={a.id} className="text-slate-300">
                    {a.decision === 'APPROVED' ? 'Disetujui' : 'Dikembalikan'} oleh {a.decidedBy} · {fmt(a.decidedAt)} — <span className="text-slate-400">{a.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {staffCase.workOrder && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
              <span className="font-semibold text-slate-100">Perintah kerja internal {staffCase.workOrder.id}</span>
              <p className="text-slate-300">
                Status: {staffCase.workOrder.status === 'COMPLETED' ? `selesai ${fmt(staffCase.workOrder.completedAt!)}` : 'diterbitkan'}
                {staffCase.workOrder.contractorNote && ` · ${staffCase.workOrder.contractorNote}`}
              </p>
              <p className="text-[10px] text-amber-200">Catatan sistem, bukan dokumen SPK resmi pemerintah.</p>
            </div>
          )}
        </div>
      )}

      {view.availableActions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tindakan Anda</p>
          <div className="flex flex-wrap gap-1.5">
            {view.availableActions.map((action) => (
              <button
                key={action}
                type="button"
                aria-expanded={openAction === action}
                onClick={() => {
                  setMessage(null);
                  setOpenAction(openAction === action ? null : action);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                  openAction === action ? 'bg-sky-500/20 border-sky-400/60 text-sky-100' : 'bg-white/[0.04] border-white/15 text-slate-100 hover:bg-white/[0.08]'
                }`}
              >
                {ACTION_LABEL[action]}
              </button>
            ))}
          </div>
          {openAction && staffCase && (
            <ActionForm action={openAction} engineers={engineers} caseData={staffCase} busy={busy} onSubmit={run} onCancel={() => setOpenAction(null)} />
          )}
        </div>
      )}

      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-[11px] rounded-lg px-2.5 py-1.5 border ${message.tone === 'error' ? 'text-rose-200 bg-rose-500/10 border-rose-500/30' : 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30'}`}>
          {message.text}
        </p>
      )}

      <details className="group" open={!compact}>
        <summary className="cursor-pointer text-[11px] font-semibold text-slate-300 hover:text-slate-100 select-none">Riwayat status</summary>
        <ol className="mt-2 space-y-1.5 border-l border-white/10 pl-3">
          {(staffCase
            ? [...staffCase.history].reverse().map((h) => ({ key: h.id, at: h.at, state: h.to, text: `${ACTION_LABEL[h.action]} · ${h.actor.role === 'SYSTEM' ? 'sistem' : h.actor.id}${h.reason ? ` — ${h.reason}` : ''}` }))
            : [...(publicCase?.timeline ?? [])].reverse().map((t, i) => ({ key: `${t.at}-${i}`, at: t.at, state: t.state, text: t.note }))
          ).map((entry) => (
            <li key={entry.key} className="text-[11px]">
              <span className="text-slate-400 font-mono">{fmt(entry.at)}</span>
              <span className="ml-1.5">
                <StateBadge state={entry.state} />
              </span>
              <p className="text-slate-300 mt-0.5">{entry.text}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
};
