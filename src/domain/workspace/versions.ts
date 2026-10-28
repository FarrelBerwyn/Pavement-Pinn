/**
 * Report versions and the approval guard (O5 / D-012 separation of duties).
 *
 * A version bundles F.E corrections. Only an Operations Manager approves, never the person
 * who made any correction in it (`samePerson`, D-040), and never while a stage it depends
 * on failed, went stale or has not finished rerunning.
 */
import { samePerson } from '../identity/people';
import type { Actor } from '../workflow/model';
import type { ReportVersion, StageRun, Workspace } from './types';
import { latestRuns } from './rerun';
import { STAGE_IDS } from './types';

export type GuardResult = { ok: true } | { ok: false; code: 'FORBIDDEN_ROLE' | 'SELF_APPROVAL' | 'STAGES_NOT_READY' | 'NOT_PENDING' | 'NOT_FOUND' | 'REASON_REQUIRED'; message: string };

/** Stages whose latest run is failed, stale, queued or running: a version built on them is not final. */
export function unfinishedStages(runs: readonly StageRun[]) {
  const latest = latestRuns(runs);
  return STAGE_IDS.filter((s) => {
    const st = latest[s]?.status;
    return st === 'failed' || st === 'stale' || st === 'queued' || st === 'running';
  });
}

export function correctorsOf(ws: Pick<Workspace, 'corrections'>, version: ReportVersion): string[] {
  return ws.corrections.filter((c) => version.correctionIds.includes(c.correctionId)).map((c) => c.by);
}

export function approvalGuard(ws: Pick<Workspace, 'corrections' | 'versions' | 'stageRuns'>, versionNo: number, actor: Actor, decision: 'approve' | 'reject', reason?: string): GuardResult {
  if (actor.role !== 'OPERATIONS_MANAGER') return { ok: false, code: 'FORBIDDEN_ROLE', message: 'Hanya Operations Manager yang menyetujui versi laporan.' };
  const version = ws.versions.find((v) => v.version === versionNo);
  if (!version) return { ok: false, code: 'NOT_FOUND', message: 'Versi tidak ditemukan.' };
  if (version.status !== 'pending_approval') return { ok: false, code: 'NOT_PENDING', message: 'Versi ini tidak menunggu persetujuan.' };
  if (correctorsOf(ws, version).some((by) => samePerson(by, actor.id)) || samePerson(version.createdBy, actor.id)) {
    return { ok: false, code: 'SELF_APPROVAL', message: 'Pembuat koreksi tidak boleh menyetujui versinya sendiri.' };
  }
  if (decision === 'reject') {
    return (reason ?? '').trim().length >= 5 ? { ok: true } : { ok: false, code: 'REASON_REQUIRED', message: 'Alasan penolakan wajib diisi.' };
  }
  const blocked = new Set(unfinishedStages(ws.stageRuns));
  // Every stage the version's corrections reran must have completed. T6 may stay blocked for
  // lack of field pairs: validation is not a precondition for publishing a revision (the public
  // page shows sizes only after validation, see publicTrack.ts).
  const latest = latestRuns(ws.stageRuns);
  for (const c of ws.corrections.filter((x) => version.correctionIds.includes(x.correctionId))) {
    for (const s of c.rerunStages) {
      const st = latest[s]?.status;
      if (s !== 'T6_validate' && st !== 'completed') blocked.add(s);
    }
  }
  if (blocked.size) return { ok: false, code: 'STAGES_NOT_READY', message: `Tahap belum siap: ${[...blocked].join(', ')}` };
  return { ok: true };
}

/** The version the public sees: the newest approved one. */
export function publishedVersion(ws: Pick<Workspace, 'versions'>): ReportVersion | null {
  return [...ws.versions].filter((v) => v.status === 'approved').sort((a, b) => b.version - a.version)[0] ?? null;
}

/** The working version the F.E is editing (open draft), if any. */
export function draftVersion(ws: Pick<Workspace, 'versions'>): ReportVersion | null {
  return ws.versions.find((v) => v.status === 'draft') ?? null;
}
