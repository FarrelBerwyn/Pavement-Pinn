/**
 * The report's workflow, as each role should see it: current state, the evidence that
 * matters for the next decision, the history, and only the actions this actor may take.
 * Every action goes to the workflow store and the panel shows success only after the
 * store saved it. Staff see the full case; citizens see public notes only.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadDraft, saveDraft } from '../work-orders/inspectionDraft';
import type { WorkflowAction, WorkflowState, ReportCase } from '../../domain/workflow/model';
import type { PublicReportView } from '../../domain/workflow/projections';
import type { WorkflowCommand } from '../../domain/workflow/stateMachine';
import type { EngineerSummary, GatewayMode, ReportView } from '../../services/api/workflowClient';
import type { ReportMutationOutcome } from '../../types';
import { USER_ACCOUNTS } from '../../data/reference/demoAccounts';
import { ACTION_LABEL, ROLE_SHORT, stateTone, TONE_CLASS, TONE_CLASS_LIGHT, WORKFLOW_STATE_LABEL } from './workflowLabels';

export type PanelTone = 'dark' | 'light';

export interface ReportWorkflowPanelProps {
  view: ReportView | null;
  mode: GatewayMode;
  engineers: EngineerSummary[];
  onRun: (command: WorkflowCommand) => Promise<ReportMutationOutcome>;
  /** Optional: jump to the report's road on the map. */
  onShowOnMap?: () => void;
  /** Smaller paddings for use inside the map bottom sheet. */
  compact?: boolean;
  /** Surface the panel sits on. Dark by default (map sheets, queues). */
  tone?: PanelTone;
  /** Open this action's form immediately (e.g. "Mulai Tugas" opens the inspection form). */
  initialAction?: WorkflowAction | null;
}

/** One class set per surface, so both themes use the same brand yellow and muted status colours. */
const SKIN = {
  dark: {
    section: 'border-white/10 bg-slate-900/60 text-slate-200',
    card: 'bg-white/[0.03] border-white/10',
    strong: 'text-slate-100',
    body: 'text-slate-300',
    muted: 'text-slate-400',
    label: 'text-slate-300',
    form: 'border-white/10 bg-slate-950/50',
    input: 'bg-slate-900/80 border-white/15 text-slate-100 placeholder:text-slate-500',
    ghost: 'text-slate-300 hover:bg-white/5',
    chip: 'bg-white/[0.04] border-white/15 text-slate-100 hover:bg-white/[0.08]',
    chipOn: 'bg-brand/15 border-brand/60 text-brand-hover',
    link: 'text-brand hover:text-brand-hover',
    line: 'border-white/10',
    ok: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30',
    err: 'text-rose-200 bg-rose-500/10 border-rose-500/30',
    tagDemo: 'border-amber-500/40 text-amber-200 bg-amber-500/10',
    tagObserved: 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10',
    tagNeutral: 'border-slate-500/40 text-slate-300 bg-slate-700/30',
    note: 'text-amber-200'
  },
  light: {
    section: 'border-slate-200 bg-white text-slate-700',
    card: 'bg-slate-50 border-slate-200',
    strong: 'text-slate-900',
    body: 'text-slate-700',
    muted: 'text-slate-500',
    label: 'text-slate-600',
    form: 'border-slate-200 bg-slate-50',
    input: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100',
    chip: 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50',
    chipOn: 'bg-amber-50 border-amber-500 text-amber-800',
    link: 'text-amber-700 hover:text-amber-800',
    line: 'border-slate-200',
    ok: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    err: 'text-rose-800 bg-rose-50 border-rose-200',
    tagDemo: 'border-amber-300 text-amber-800 bg-amber-50',
    tagObserved: 'border-emerald-200 text-emerald-800 bg-emerald-50',
    tagNeutral: 'border-slate-300 text-slate-600 bg-slate-100',
    note: 'text-amber-800'
  }
} as const;
type Skin = (typeof SKIN)[PanelTone];

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70';

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
};

/** Display name for an actor id, with the role in short form (R.E, M.O, F.E, D.M). */
export function actorName(id: string): string {
  if (id.startsWith('system')) return 'Sistem';
  const account = USER_ACCOUNTS.find((a) => a.id === id);
  return account ? `${account.name} (${ROLE_SHORT[account.role] ?? account.role})` : id;
}

export const StateBadge: React.FC<{ state: WorkflowState | string; tone?: PanelTone }> = ({ state, tone = 'dark' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-semibold ${(tone === 'light' ? TONE_CLASS_LIGHT : TONE_CLASS)[stateTone(state)]}`}>
    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-current opacity-80" />
    {WORKFLOW_STATE_LABEL[state as WorkflowState] ?? state}
  </span>
);

const DataTag: React.FC<{ children: React.ReactNode; tone?: 'demo' | 'observed' | 'neutral'; skin: Skin }> = ({ children, tone = 'neutral', skin }) => (
  <span className={`inline-block px-2 py-1 rounded text-xs font-bold tracking-wide border ${tone === 'demo' ? skin.tagDemo : tone === 'observed' ? skin.tagObserved : skin.tagNeutral}`}>{children}</span>
);

const Field: React.FC<{ label: string; htmlFor: string; children: React.ReactNode; hint?: string; skin: Skin }> = ({ label, htmlFor, children, hint, skin }) => (
  <div className="space-y-1">
    <label htmlFor={htmlFor} className={`block text-xs font-semibold ${skin.label}`}>
      {label}
    </label>
    {children}
    {hint && <p className={`text-xs ${skin.muted}`}>{hint}</p>}
  </div>
);

/** Inline form for one action; builds the command and calls onRun. */
const ActionForm: React.FC<{
  action: WorkflowAction;
  engineers: EngineerSummary[];
  caseData: ReportCase;
  busy: boolean;
  skin: Skin;
  onSubmit: (command: WorkflowCommand) => void;
  onCancel: () => void;
}> = ({ action, engineers, caseData, busy, skin, onSubmit, onCancel }) => {
  const id = (name: string) => `wf-${caseData.id}-${action}-${name}`;
  const inputClass = `w-full rounded-lg border px-3 py-2 text-xs transition-shadow ${skin.input} ${FOCUS}`;
  const [reason, setReason] = useState('');
  const [engineerId, setEngineerId] = useState(engineers[0]?.id ?? '');
  const [dueAt, setDueAt] = useState(inDays(3));
  const [instructions, setInstructions] = useState('');
  // Inspection progress is restored from this browser after a refresh (see inspectionDraft.ts).
  const [draft] = useState(() => (action === 'SUBMIT_INSPECTION' ? loadDraft(caseData) : null));
  const [verdict, setVerdict] = useState<'CONFIRMED' | 'NOT_CONFIRMED'>(draft?.verdict ?? 'CONFIRMED');
  const [cvAccepted, setCvAccepted] = useState(draft?.cvAccepted ?? true);
  const [correctedClass, setCorrectedClass] = useState(draft?.correctedClass ?? '');
  const [depth, setDepth] = useState(draft?.depth ?? '');
  const [area, setArea] = useState(draft?.area ?? '');
  const [severity, setSeverity] = useState<'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL'>(draft?.severity ?? caseData.inspection?.severity ?? caseData.report.severity);
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [savedAt, setSavedAt] = useState<string | null>(draft?.savedAt ?? null);
  useEffect(() => {
    if (action !== 'SUBMIT_INSPECTION' || caseData.state !== 'FIELD_INSPECTION_REQUESTED') return;
    const touched = depth || area || notes || correctedClass || verdict !== 'CONFIRMED' || !cvAccepted;
    if (!touched) return;
    const at = new Date().toISOString();
    saveDraft(caseData.id, { version: caseData.version, savedAt: at, verdict, cvAccepted, correctedClass, depth, area, severity, notes });
    setSavedAt(at);
  }, [action, caseData.id, caseData.version, caseData.state, verdict, cvAccepted, correctedClass, depth, area, severity, notes]);
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
    <form onSubmit={submit} className={`mt-2 space-y-2 rounded-xl border p-3 ${skin.form}`}>
      <p className={`text-xs font-bold ${skin.strong}`}>{ACTION_LABEL[action]}</p>

      {action === 'REQUEST_INSPECTION' && (
        <>
          <Field skin={skin} label="Insinyur lapangan (F.E)" htmlFor={id('eng')}>
            <select id={id('eng')} className={inputClass} value={engineerId} onChange={(e) => setEngineerId(e.target.value)} required>
              {engineers.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.name} — {en.agencyCode} ({en.id})
                </option>
              ))}
            </select>
          </Field>
          <Field skin={skin} label="Batas waktu inspeksi" htmlFor={id('due')}>
            <input id={id('due')} type="date" className={inputClass} value={dueAt} min={inDays(1)} onChange={(e) => setDueAt(e.target.value)} required />
          </Field>
          <Field skin={skin} label="Instruksi untuk insinyur" htmlFor={id('ins')}>
            <textarea id={id('ins')} className={inputClass} rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Mis. ukur kedalaman & luas, foto tepi lubang" />
          </Field>
        </>
      )}

      {action === 'SUBMIT_INSPECTION' && (
        <>
          <Field skin={skin} label="Hasil pemeriksaan" htmlFor={id('verdict')}>
            <select id={id('verdict')} className={inputClass} value={verdict} onChange={(e) => setVerdict(e.target.value as typeof verdict)}>
              <option value="CONFIRMED">Kerusakan terkonfirmasi</option>
              <option value="NOT_CONFIRMED">Tidak ditemukan kerusakan</option>
            </select>
          </Field>
          <div className="flex items-center gap-2">
            <input id={id('cv')} type="checkbox" checked={cvAccepted} onChange={(e) => setCvAccepted(e.target.checked)} className="accent-amber-500" />
            <label htmlFor={id('cv')} className={`text-xs ${skin.label}`}>
              Jenis kerusakan pada laporan sudah benar ({caseData.report.damageTypeLabel})
            </label>
          </div>
          {!cvAccepted && (
            <Field skin={skin} label="Koreksi jenis kerusakan" htmlFor={id('cls')}>
              <input id={id('cls')} className={inputClass} value={correctedClass} onChange={(e) => setCorrectedClass(e.target.value)} required placeholder="Mis. ALLIGATOR_CRACK" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field skin={skin} label="Kedalaman terukur (cm)" htmlFor={id('depth')}>
              <input id={id('depth')} type="number" min={0} step="0.1" inputMode="decimal" className={inputClass} value={depth} onChange={(e) => setDepth(e.target.value)} placeholder={`laporan: ${caseData.report.estimatedDepthCm}`} />
            </Field>
            <Field skin={skin} label="Luas terukur (m²)" htmlFor={id('area')}>
              <input id={id('area')} type="number" min={0} step="0.1" inputMode="decimal" className={inputClass} value={area} onChange={(e) => setArea(e.target.value)} placeholder={`laporan: ${caseData.report.estimatedAreaM2}`} />
            </Field>
          </div>
          <Field skin={skin} label="Tingkat keparahan" htmlFor={id('sev')}>
            <select id={id('sev')} className={inputClass} value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              <option value="LIGHT">Ringan</option>
              <option value="MODERATE">Sedang</option>
              <option value="SEVERE">Berat</option>
              <option value="CRITICAL">Kritis</option>
            </select>
          </Field>
          <Field skin={skin} label="Catatan inspeksi" htmlFor={id('notes')}>
            <textarea id={id('notes')} className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} required placeholder="Kondisi yang diamati di lapangan" />
          </Field>
          <p className={`text-xs ${skin.muted}`} role="status">
            {savedAt
              ? `Draf tersimpan di perangkat ini · ${new Date(savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. Belum terkirim ke M.O.`
              : 'Isian disimpan otomatis sebagai draf di perangkat ini sampai Anda mengirimnya.'}
          </p>
        </>
      )}

      {action === 'RECOMMEND_ACTION' && (
        <>
          <Field skin={skin} label="Penanganan yang direkomendasikan" htmlFor={id('tr')}>
            <input id={id('tr')} className={inputClass} value={treatment} onChange={(e) => setTreatment(e.target.value)} required placeholder="Mis. patching + overlay tipis AC-WC" />
          </Field>
          <Field skin={skin} label="Urgensi" htmlFor={id('urg')}>
            <select id={id('urg')} className={inputClass} value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)}>
              <option value="ROUTINE">Rutin</option>
              <option value="PRIORITY">Prioritas</option>
              <option value="URGENT">Mendesak</option>
            </select>
          </Field>
          <Field skin={skin} label="Alasan teknis" htmlFor={id('rat')} hint="Penilaian ruas (RULE_BASED, belum tervalidasi) dilampirkan otomatis saat disimpan, lalu terlihat oleh M.O dan D.M.">
            <textarea id={id('rat')} className={inputClass} rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} required />
          </Field>
        </>
      )}

      {action === 'START_WORK' && (
        <Field skin={skin} label="Catatan pelaksana" htmlFor={id('con')} hint="Perintah kerja internal sistem — bukan dokumen SPK resmi.">
          <input id={id('con')} className={inputClass} value={contractorNote} onChange={(e) => setContractorNote(e.target.value)} placeholder="Mis. tim swakelola BBPJN" />
        </Field>
      )}

      {needsReason && (
        <Field skin={skin} label="Alasan (tercatat di audit trail)" htmlFor={id('reason')}>
          <textarea id={id('reason')} className={inputClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </Field>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={busy} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${skin.ghost} ${FOCUS}`}>
          Batal
        </button>
        <button type="submit" disabled={busy} aria-busy={busy} className={`px-3 py-2 rounded-lg text-xs font-bold bg-brand text-navy hover:bg-brand-hover active:bg-brand-press disabled:opacity-60 disabled:cursor-wait transition-colors ${FOCUS}`}>
          {busy ? 'Menyimpan…' : 'Simpan & kirim'}
        </button>
      </div>
    </form>
  );
};

export const ReportWorkflowPanel: React.FC<ReportWorkflowPanelProps> = ({ view, mode, engineers, onRun, onShowOnMap, compact, tone = 'dark', initialAction = null }) => {
  const skin = SKIN[tone];
  const [openAction, setOpenAction] = useState<WorkflowAction | null>(initialAction && view?.availableActions.includes(initialAction) ? initialAction : null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const engineerName = useMemo(() => new Map(engineers.map((e) => [e.id, e.name])), [engineers]);

  if (!view) {
    return <p className={`text-xs ${skin.muted}`}>Status alur kerja belum dimuat.</p>;
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
    setMessage({ tone: 'ok', text: `${ACTION_LABEL[command.action as WorkflowAction]} — tersimpan dan terkirim ke peran berikutnya.` });
  };

  const assignmentOverdue = staffCase?.assignment && state === 'FIELD_INSPECTION_REQUESTED' && Date.parse(staffCase.assignment.dueAt) < Date.now();
  const card = `rounded-xl border p-3 ${skin.card}`;

  return (
    <section aria-label="Status alur kerja laporan" className={`rounded-2xl border ${skin.section} ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge state={state} tone={tone} />
          <span className={`text-xs font-mono ${skin.muted}`}>{view.case.id}</span>
          {mode === 'OFFLINE_DEMO' && (
            <DataTag skin={skin} tone="demo">
              DEMO OFFLINE — tidak tersimpan di server
            </DataTag>
          )}
          {staffCase && staffCase.dataStatus === 'SYNTHETIC' && (
            <DataTag skin={skin} tone="demo">
              DATA CONTOH (SYNTHETIC)
            </DataTag>
          )}
        </div>
        {onShowOnMap && (
          <button type="button" onClick={onShowOnMap} className={`text-xs font-semibold rounded px-1 ${skin.link} ${FOCUS}`}>
            Lihat di peta
          </button>
        )}
      </header>

      {staffCase && (
        <div className="grid gap-2 text-xs">
          <div className={`${card} space-y-1`}>
            <span className={`font-semibold ${skin.strong}`}>Laporan warga (R.E)</span>
            <p className={skin.body}>
              {staffCase.report.damageTypeLabel} · {staffCase.report.segmentName} · estimasi {staffCase.report.estimatedDepthCm} cm / {staffCase.report.estimatedAreaM2} m²
            </p>
            {staffCase.report.description && <p className={skin.muted}>{staffCase.report.description}</p>}
          </div>
          {staffCase.screening && (
            <div className={`${card} space-y-1`}>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${skin.strong}`}>Penyaringan otomatis</span>
                <DataTag skin={skin} tone={staffCase.screening.modelStatus === 'REAL' ? 'observed' : 'demo'}>
                  {staffCase.screening.modelStatus}
                </DataTag>
              </div>
              <p className={skin.body}>
                {staffCase.screening.detectedClass ? `Kelas: ${staffCase.screening.detectedClass}` : 'Tidak ada keluaran model'}
                {staffCase.screening.confidence !== null && ` · kepercayaan ${(staffCase.screening.confidence * 100).toFixed(0)}% (${staffCase.screening.modelStatus})`}
              </p>
              <ul className={`list-disc pl-4 space-y-1 ${skin.muted}`}>
                {staffCase.screening.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {staffCase.assignment && (
            <div className={card}>
              <span className={`font-semibold ${skin.strong}`}>Penugasan inspeksi (M.O → F.E)</span>
              <p className={skin.body}>
                {engineerName.get(staffCase.assignment.engineerId) ?? actorName(staffCase.assignment.engineerId)} · batas {fmt(staffCase.assignment.dueAt)}
                {assignmentOverdue && <span className="ml-1 font-bold text-rose-600">(lewat batas waktu)</span>}
              </p>
              <p className={skin.muted}>Ditugaskan oleh {actorName(staffCase.assignment.assignedBy)}</p>
              {staffCase.assignment.instructions && <p className={skin.muted}>Instruksi: {staffCase.assignment.instructions}</p>}
            </div>
          )}
          {staffCase.inspection && (
            <div className={`${card} space-y-1`}>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${skin.strong}`}>Hasil inspeksi lapangan (F.E)</span>
                <DataTag skin={skin} tone="observed">
                  OBSERVED
                </DataTag>
              </div>
              <p className={skin.body}>
                {staffCase.inspection.verdict === 'CONFIRMED' ? 'Terkonfirmasi' : 'Tidak terkonfirmasi'} · {staffCase.inspection.severity}
                {staffCase.inspection.measuredDepthCm !== null && ` · ${staffCase.inspection.measuredDepthCm} cm`}
                {staffCase.inspection.measuredAreaM2 !== null && ` · ${staffCase.inspection.measuredAreaM2} m²`}
              </p>
              <p className={skin.muted}>
                Klasifikasi laporan {staffCase.inspection.cvReview.accepted ? 'diterima' : `dikoreksi menjadi ${staffCase.inspection.cvReview.correctedClass}`}. {staffCase.inspection.notes}
              </p>
            </div>
          )}
          {(staffCase.inspectionReviews ?? []).length > 0 && (
            <div className={card}>
              <span className={`font-semibold ${skin.strong}`}>Verifikasi inspeksi (M.O)</span>
              <ul className="mt-1 space-y-1">
                {(staffCase.inspectionReviews ?? []).map((r) => (
                  <li key={r.id} className={skin.body}>
                    {r.decision === 'VERIFIED' ? 'Diverifikasi' : 'Inspeksi ulang diminta'} oleh {actorName(r.decidedBy)} · {fmt(r.decidedAt)} — <span className={skin.muted}>{r.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {staffCase.recommendation && (
            <div className={`${card} space-y-1`}>
              <span className={`font-semibold ${skin.strong}`}>Rekomendasi penanganan (F.E)</span>
              <p className={skin.body}>
                {staffCase.recommendation.treatment} · {staffCase.recommendation.urgency}
              </p>
              <p className={skin.muted}>{staffCase.recommendation.rationale}</p>
              {staffCase.recommendation.assessment ? (
                <p className={skin.muted}>
                  Penilaian: risiko {staffCase.recommendation.assessment.risk}, skor kondisi prototipe {staffCase.recommendation.assessment.conditionScorePrototype}{' '}
                  <DataTag skin={skin} tone="demo">
                    {staffCase.recommendation.assessment.engine}
                  </DataTag>{' '}
                  <DataTag skin={skin}>{staffCase.recommendation.assessment.validationStatus}</DataTag>
                </p>
              ) : (
                <p className={skin.muted}>Tanpa lampiran penilaian ruas.</p>
              )}
            </div>
          )}
          {staffCase.approvals.length > 0 && (
            <div className={card}>
              <span className={`font-semibold ${skin.strong}`}>Keputusan penanganan (M.O)</span>
              <ul className="mt-1 space-y-1">
                {staffCase.approvals.map((a) => (
                  <li key={a.id} className={skin.body}>
                    {a.decision === 'APPROVED' ? 'Disetujui' : 'Dikembalikan'} oleh {actorName(a.decidedBy)} · {fmt(a.decidedAt)} — <span className={skin.muted}>{a.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {staffCase.workOrder && (
            <div className={card}>
              <span className={`font-semibold ${skin.strong}`}>Perintah kerja internal {staffCase.workOrder.id}</span>
              <p className={skin.body}>
                Status: {staffCase.workOrder.status === 'COMPLETED' ? `selesai ${fmt(staffCase.workOrder.completedAt!)}` : 'diterbitkan'}
                {staffCase.workOrder.contractorNote && ` · ${staffCase.workOrder.contractorNote}`}
              </p>
              <p className={`text-xs ${skin.note}`}>Catatan sistem, bukan dokumen SPK resmi pemerintah.</p>
            </div>
          )}
        </div>
      )}

      {view.availableActions.length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs font-bold uppercase tracking-wider ${skin.muted}`}>Tindakan Anda</p>
          <div className="flex flex-wrap gap-2">
            {view.availableActions.map((action) => (
              <button
                key={action}
                type="button"
                aria-expanded={openAction === action}
                onClick={() => {
                  setMessage(null);
                  setOpenAction(openAction === action ? null : action);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${FOCUS} ${openAction === action ? skin.chipOn : skin.chip}`}
              >
                {ACTION_LABEL[action]}
              </button>
            ))}
          </div>
          {openAction && staffCase && (
            <ActionForm key={openAction} action={openAction} engineers={engineers} caseData={staffCase} busy={busy} skin={skin} onSubmit={run} onCancel={() => setOpenAction(null)} />
          )}
        </div>
      )}

      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-xs rounded-lg px-3 py-2 border ${message.tone === 'error' ? skin.err : skin.ok}`}>
          {message.text}
        </p>
      )}

      <details className="group" open={!compact}>
        <summary className={`cursor-pointer text-xs font-semibold select-none ${skin.label}`}>Riwayat status</summary>
        <ol className={`mt-2 space-y-2 border-l pl-3 ${skin.line}`}>
          {(staffCase
            ? [...staffCase.history].reverse().map((h) => ({ key: h.id, at: h.at, state: h.to, text: `${ACTION_LABEL[h.action]} · ${h.actor.role === 'SYSTEM' ? 'sistem' : actorName(h.actor.id)}${h.reason ? ` — ${h.reason}` : ''}` }))
            : [...(publicCase?.timeline ?? [])].reverse().map((t, i) => ({ key: `${t.at}-${i}`, at: t.at, state: t.state, text: t.note }))
          ).map((entry) => (
            <li key={entry.key} className="text-xs">
              <span className={`font-mono ${skin.muted}`}>{fmt(entry.at)}</span>
              <span className="ml-2">
                <StateBadge state={entry.state} tone={tone} />
              </span>
              <p className={`mt-1 ${skin.body}`}>{entry.text}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
};
