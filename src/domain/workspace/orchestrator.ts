/**
 * Stage-run bookkeeping for the T0–T8 pipeline. Pure: callers pass `now` and an id
 * factory; executing a stage (Python geometry, MLET) happens in server/services.
 *
 * - One StageRun per (reportId, stage, inputHash): resubmitting the same input returns the
 *   existing run (idempotent) unless that run failed, which allows a safe retry.
 * - A new input supersedes the previous run: it becomes `stale` with `supersededBy`.
 */
import type { StageId, StageRun, StageStatus, Workspace } from './types';
import { SATISFIED, STAGE_DEPENDENCIES, latestRuns } from './rerun';

export interface Clock {
  now: () => string;
  id: (prefix: string) => string;
}

export interface SubmitResult {
  runs: StageRun[];
  run: StageRun;
  reused: boolean;
}

export function submitStageRun(runs: readonly StageRun[], reportId: string, stage: StageId, inputHash: string, clock: Clock): SubmitResult {
  const current = latestRuns(runs)[stage];
  if (current && current.inputHash === inputHash && current.status !== 'failed' && current.status !== 'stale') {
    return { runs: [...runs], run: current, reused: true };
  }
  const attempt = current && current.inputHash === inputHash ? current.attempt + 1 : 1;
  const run: StageRun = { runId: clock.id(`run-${stage}`), reportId, stage, status: 'queued', inputHash, createdAt: clock.now(), attempt };
  const next = runs.map((r) => (current && r.runId === current.runId ? { ...r, status: (r.status === 'failed' ? 'failed' : 'stale') as StageStatus, supersededBy: run.runId } : r));
  return { runs: [...next, run], run, reused: false };
}

export function updateRun(runs: readonly StageRun[], runId: string, patch: Partial<StageRun>): StageRun[] {
  return runs.map((r) => (r.runId === runId ? { ...r, ...patch } : r));
}

/**
 * A stage may start only when every dependency's latest run completed (or awaits review, which
 * makes the result provisional). Otherwise it is `blocked` with the stages it waits for.
 */
export function dependencyBlock(runs: readonly StageRun[], stage: StageId): string | null {
  const latest = latestRuns(runs);
  const missing = STAGE_DEPENDENCIES[stage].filter((s) => !SATISFIED.has(latest[s]?.status ?? ''));
  return missing.length ? `Menunggu ${missing.join(', ')} selesai` : null;
}

/** Overall pipeline label for the header: the first stage that is not completed. */
export function pipelineHeadline(ws: Pick<Workspace, 'stageRuns'>): { stage: StageId | null; status: StageStatus | 'not_started'; done: number; total: number } {
  const latest = latestRuns(ws.stageRuns);
  const order: StageId[] = ['T0_capture', 'T1_reconstruct', 'T2_preprocess', 'T3_detect', 'T4_surface', 'T5_quantify', 'T6_validate', 'T7_structural'];
  const done = order.filter((s) => latest[s]?.status === 'completed').length;
  const first = order.find((s) => latest[s]?.status !== 'completed') ?? null;
  if (!first) return { stage: null, status: 'completed', done, total: order.length };
  return { stage: first, status: latest[first]?.status ?? 'not_started', done, total: order.length };
}

/** Deterministic short hash for stage inputs (FNV-1a over canonical JSON). */
export function inputHash(value: unknown): string {
  const json = canonicalJson(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}
