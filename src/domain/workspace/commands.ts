/**
 * Workspace commands: F.E corrections, ground truth, version submission and approval.
 * Pure: (workspace, input, actor, clock) -> next workspace or a refusal. The server is the
 * authority; the same functions back the unit tests.
 */
import type { Actor } from '../workflow/model';
import type { Correction, CorrectionInput, GroundTruthPoint, ReportVersion, Workspace } from './types';
import { CorrectionInputSchema, GroundTruthPointSchema } from './types';
import { rerunStagesFor } from './rerun';
import { inputHash, submitStageRun, type Clock } from './orchestrator';
import { approvalGuard, draftVersion } from './versions';
import { verdictFor } from './metrics';
import { toPublicTrack } from './publicTrack';

export type CommandOutcome = { ok: true; workspace: Workspace; detail?: unknown } | { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string };

const deny = (status: 400 | 403 | 404 | 409, code: string, message: string): CommandOutcome => ({ ok: false, status, code, message });

/** Read a dotted path (`measurements.depthMaxMm.value`, `layers.0.thicknessMm.value`). */
export function readPath(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), root);
}

function writePath<T>(root: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const clone: any = Array.isArray(root) ? [...(root as unknown[])] : { ...(root as object) };
  clone[head] = rest.length ? writePath(clone[head] ?? {}, rest.join('.'), value) : value;
  return clone;
}

/** Fields a correction may write, per kind. Anything else is refused (no arbitrary writes). */
const WRITABLE: Record<string, RegExp> = {
  class: /^class\.value$/,
  mask: /^geometryRefs\.masks\.[A-Za-z0-9_-]+$/,
  contour: /^contour$/,
  reference_plane: /^quality\.referencePlane$/,
  severity: /^severity\.feOverride$/,
  layers: /^layers\.[0-3]\.(thicknessMm|modulusMPa|poisson)\.value$/,
  frame_accept: /^frames\.[A-Za-z0-9_-]+\.accepted$/,
  merge: /^mergeWith$/,
  split: /^splitAt$/,
  scale_marker: /^quality\.scaleMarker$/,
  load: /^load$/,
  criterion: /^criterion$/,
  recommendation: /^publicInfo\.action$/,
  extra_photo: /^frames$/,
  after_photo: /^publicInfo\.afterPhotoUri$/,
  ground_truth: /^groundTruth$/
};

export function applyCorrection(ws: Workspace, raw: unknown, actor: Actor, clock: Clock): CommandOutcome {
  if (actor.role !== 'FIELD_ENGINEER') return deny(403, 'FE_ONLY', 'Hanya Field Engineer yang dapat mengoreksi hasil analisis.');
  const parsed = CorrectionInputSchema.safeParse(raw);
  if (!parsed.success) return deny(400, 'INVALID', parsed.error.issues.map((i) => i.message).join('; '));
  const input: CorrectionInput = parsed.data;
  if (!WRITABLE[input.kind]?.test(input.field)) return deny(400, 'FIELD_NOT_WRITABLE', `Field ${input.field} tidak dapat dikoreksi lewat ${input.kind}.`);

  let next: Workspace = { ...ws };
  let oldValue: unknown;
  if (input.kind === 'layers') {
    oldValue = readPath(ws, input.field);
    const idx = Number(input.field.split('.')[1]);
    const prop = input.field.split('.')[2] as 'thicknessMm' | 'modulusMPa' | 'poisson';
    const value = Number(input.newValue);
    if (!Number.isFinite(value) || value <= 0) return deny(400, 'INVALID', 'Nilai lapisan harus angka positif.');
    next.layers = ws.layers.map((l, i) => (i === idx ? { ...l, [prop]: { ...l[prop], value, provenance: 'manually_measured', reasonUnavailable: undefined, source: { ...l[prop].source, method: `core/DCP (${input.evidence.join(', ') || 'tanpa bukti'})` } }, source: 'MEASURED' } : l));
  } else if (input.kind === 'frame_accept') {
    const frameId = input.field.split('.')[1];
    const frame = ws.frames.find((f) => f.frameId === frameId);
    if (!frame) return deny(404, 'NOT_FOUND', 'Frame tidak ditemukan.');
    oldValue = frame.accepted;
    next.frames = ws.frames.map((f) => (f.frameId === frameId ? { ...f, accepted: Boolean(input.newValue), rejectReason: input.newValue ? undefined : input.reason } : f));
  } else if (input.kind === 'load' || input.kind === 'criterion') {
    // Structural run inputs: the latest correction of the kind is the input T7 uses.
    const prev = [...ws.corrections].reverse().find((c) => c.kind === input.kind);
    oldValue = prev ? prev.newValue : null;
    if (input.kind === 'load') {
      const v = input.newValue as { axleT?: unknown } | null;
      if (!v || !Number.isFinite(Number(v.axleT)) || Number(v.axleT) < 1 || Number(v.axleT) > 30) return deny(400, 'INVALID', 'Beban sumbu harus 1–30 t.');
    } else if (input.newValue !== 'AI' && input.newValue !== 'AUS') return deny(400, 'INVALID', 'Kriteria harus AI atau AUS.');
  } else if (input.kind === 'recommendation' || input.kind === 'after_photo') {
    oldValue = readPath(ws, input.field);
    next = writePath(next, input.field, input.newValue);
  } else {
    const object = ws.objects.find((o) => o.objectId === input.objectId);
    if (!object) return deny(404, 'NOT_FOUND', 'Objek tidak ditemukan.');
    if (input.kind === 'contour') {
      const surface = ws.surfaces.find((s) => s.objectId === object.objectId);
      oldValue = surface?.contour ?? null;
      if (!Array.isArray(input.newValue) || input.newValue.length < 3) return deny(400, 'INVALID', 'Kontur membutuhkan minimal 3 titik.');
      next.surfaces = ws.surfaces.map((s) => (s.objectId === object.objectId ? { ...s, contour: input.newValue as Array<[number, number]> } : s));
    } else if (input.kind === 'class') {
      oldValue = object.class.value;
      next.objects = ws.objects.map((o) => (o.objectId === object.objectId ? { ...o, class: { ...o.class, value: input.newValue as any, correctedBy: actor.id } } : o));
    } else {
      oldValue = readPath(object, input.field);
      next.objects = ws.objects.map((o) => (o.objectId === object.objectId ? writePath(o, input.field, input.newValue) : o));
    }
  }

  const rerunStages = rerunStagesFor(input.kind);
  let runs = next.stageRuns;
  const resultingRunIds: string[] = [];
  for (const stage of rerunStages) {
    const r = submitStageRun(runs, ws.reportId, stage, inputHash({ stage, kind: input.kind, field: input.field, value: input.newValue, objectId: input.objectId ?? null }), clock);
    runs = r.runs;
    resultingRunIds.push(r.run.runId);
  }
  // A structural input change makes earlier structural runs stale.
  const structuralRuns = rerunStages.includes('T7_structural') ? next.structuralRuns.map((s) => (s.status === 'completed' ? { ...s, status: 'stale' as const } : s)) : next.structuralRuns;

  const draft = draftVersion(ws);
  const versionNo = draft?.version ?? Math.max(0, ...ws.versions.map((v) => v.version)) + 1;
  const correction: Correction = { ...input, correctionId: clock.id('cor'), reportId: ws.reportId, oldValue, by: actor.id, at: clock.now(), rerunStages, resultingRunIds, version: versionNo };
  const versions: ReportVersion[] = draft
    ? ws.versions.map((v) => (v.version === draft.version ? { ...v, correctionIds: [...v.correctionIds, correction.correctionId] } : v))
    : [...ws.versions, { version: versionNo, createdAt: clock.now(), createdBy: actor.id, correctionIds: [correction.correctionId], changeSummaryPublic: '', changeSummaryTechnical: '', status: 'draft' }];

  next = {
    ...next,
    stageRuns: runs,
    structuralRuns,
    corrections: [...ws.corrections, correction],
    versions,
    audit: [...ws.audit, { at: clock.now(), by: actor.id, role: actor.role, action: `correction:${input.kind}`, version: versionNo, reason: input.reason, detail: input.field }]
  };
  return { ok: true, workspace: next, detail: correction };
}

export function addGroundTruth(ws: Workspace, raw: unknown, actor: Actor, clock: Clock): CommandOutcome {
  if (actor.role !== 'FIELD_ENGINEER') return deny(403, 'FE_ONLY', 'Titik ukur lapangan dicatat oleh Field Engineer.');
  const parsed = GroundTruthPointSchema.omit({ pointId: true, measuredBy: true, measuredAt: true, systemMm: true }).safeParse(raw);
  if (!parsed.success) return deny(400, 'INVALID', parsed.error.issues.map((i) => i.message).join('; '));
  const object = ws.objects.find((o) => o.objectId === parsed.data.objectId);
  if (!object) return deny(404, 'NOT_FOUND', 'Objek tidak ditemukan.');
  // The system value is read from the stored surface here, never taken from the client.
  const point: GroundTruthPoint = { ...parsed.data, systemMm: systemDepthAt(ws, object.objectId, parsed.data.xMm, parsed.data.yMm), pointId: clock.id('gt'), measuredBy: actor.id, measuredAt: clock.now() };
  const r = submitStageRun(ws.stageRuns, ws.reportId, 'T6_validate', inputHash({ points: [...ws.groundTruth, point].map((p) => [p.objectId, p.referenceMm, p.systemMm]) }), clock);
  return {
    ok: true,
    detail: { point, verdict: verdictFor(point) },
    workspace: {
      ...ws,
      groundTruth: [...ws.groundTruth, point],
      stageRuns: r.runs,
      audit: [...ws.audit, { at: clock.now(), by: actor.id, role: actor.role, action: 'ground_truth', version: null, detail: `${point.objectId} ${point.tool}` }]
    }
  };
}

/** Depth of the stored surface at (x, y) mm, or null without a metric surface or outside it. */
export function systemDepthAt(ws: Pick<Workspace, 'surfaces' | 'objects'>, objectId: string, xMm: number, yMm: number): number | null {
  const s = ws.surfaces.find((g) => g.objectId === objectId);
  const o = ws.objects.find((g) => g.objectId === objectId);
  if (!s || s.unit !== 'mm' || o?.quality.scaleStatus !== 'valid') return null;
  const c = Math.floor(xMm / s.cellSize);
  const r = Math.floor(yMm / s.cellSize);
  if (r < 0 || c < 0 || r >= s.rows || c >= s.cols) return null;
  const d = s.depth[r][c];
  return d === null ? null : Math.round(d * 10) / 10;
}

/** F.E closes the draft and asks for approval, with a plain-language summary for the public. */
export function submitVersion(ws: Workspace, raw: { changeSummaryPublic?: unknown; changeSummaryTechnical?: unknown }, actor: Actor, clock: Clock): CommandOutcome {
  if (actor.role !== 'FIELD_ENGINEER') return deny(403, 'FE_ONLY', 'Versi diajukan oleh Field Engineer.');
  const draft = draftVersion(ws);
  if (!draft) return deny(409, 'NO_DRAFT', 'Tidak ada koreksi yang menunggu diajukan.');
  const pub = String(raw.changeSummaryPublic ?? '').trim();
  if (pub.length < 10) return deny(400, 'SUMMARY_REQUIRED', 'Ringkasan perubahan untuk warga wajib diisi.');
  const tech = String(raw.changeSummaryTechnical ?? '').trim() || ws.corrections.filter((c) => draft.correctionIds.includes(c.correctionId)).map((c) => `${c.kind} ${c.field}`).join('; ');
  return {
    ok: true,
    workspace: {
      ...ws,
      versions: ws.versions.map((v) => (v.version === draft.version ? { ...v, status: 'pending_approval', changeSummaryPublic: pub, changeSummaryTechnical: tech } : v)),
      audit: [...ws.audit, { at: clock.now(), by: actor.id, role: actor.role, action: 'version_submitted', version: draft.version }]
    }
  };
}

export function decideVersion(ws: Workspace, versionNo: number, decision: 'approve' | 'reject', reason: string | undefined, actor: Actor, clock: Clock): CommandOutcome {
  const guard = approvalGuard(ws, versionNo, actor, decision, reason);
  if ('code' in guard) return deny(guard.code === 'NOT_FOUND' ? 404 : guard.code === 'FORBIDDEN_ROLE' || guard.code === 'SELF_APPROVAL' ? 403 : guard.code === 'REASON_REQUIRED' ? 400 : 409, guard.code, guard.message);
  const at = clock.now();
  let next: Workspace = {
    ...ws,
    versions: ws.versions.map((v) =>
      v.version !== versionNo ? v : decision === 'approve' ? { ...v, status: 'approved', approvedBy: actor.id, approvedAt: at } : { ...v, status: 'rejected', rejectedBy: actor.id, rejectionReason: reason }
    ),
    audit: [...ws.audit, { at, by: actor.id, role: actor.role, action: decision === 'approve' ? 'version_approved' : 'version_rejected', version: versionNo, reason }]
  };
  if (decision === 'approve') {
    const snapshot = toPublicTrack(next);
    next = { ...next, versions: next.versions.map((v) => (v.version === versionNo ? { ...v, publicSnapshot: snapshot } : v)) };
  }
  return { ok: true, workspace: next };
}
