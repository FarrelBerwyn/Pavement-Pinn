/**
 * Rerun matrix (contract §5) and stage dependency locks.
 */
import type { CorrectionKind, StageId, StageRun } from './types';
import { STAGE_IDS } from './types';

const range = (from: StageId, to: StageId): StageId[] => STAGE_IDS.slice(STAGE_IDS.indexOf(from), STAGE_IDS.indexOf(to) + 1);

export const RERUN_MATRIX: Readonly<Record<CorrectionKind, readonly StageId[]>> = {
  frame_accept: range('T0_capture', 'T8_finalize'),
  extra_photo: range('T0_capture', 'T8_finalize'),
  scale_marker: range('T1_reconstruct', 'T7_structural'),
  class: [...range('T3_detect', 'T6_validate'), 'T8_finalize'],
  mask: [...range('T3_detect', 'T6_validate'), 'T8_finalize'],
  merge: [...range('T3_detect', 'T6_validate'), 'T8_finalize'],
  split: [...range('T3_detect', 'T6_validate'), 'T8_finalize'],
  reference_plane: range('T4_surface', 'T6_validate'),
  contour: range('T4_surface', 'T6_validate'),
  ground_truth: ['T6_validate'],
  layers: ['T7_structural'],
  load: ['T7_structural'],
  criterion: ['T7_structural'],
  severity: ['T8_finalize'],
  recommendation: ['T8_finalize'],
  after_photo: ['T8_finalize']
};

/** Kinds a Field Engineer may submit; the Ops Manager may only request photos (not a correction). */
export const GEOMETRY_KINDS: ReadonlySet<CorrectionKind> = new Set(['mask', 'contour', 'reference_plane', 'merge', 'split', 'class', 'scale_marker', 'layers']);

export function rerunStagesFor(kind: CorrectionKind): StageId[] {
  return [...RERUN_MATRIX[kind]];
}

/**
 * Stages whose output a stage consumes before it can run. T7 (MLET on the layer model) runs
 * without geometry; whether it may *use* geometry is the separate GEOMETRY_GATE below.
 */
export const STAGE_DEPENDENCIES: Readonly<Record<StageId, readonly StageId[]>> = {
  T0_capture: [],
  T1_reconstruct: ['T0_capture'],
  T2_preprocess: ['T1_reconstruct'],
  T3_detect: ['T0_capture'],
  T4_surface: ['T2_preprocess', 'T3_detect'],
  T5_quantify: ['T4_surface'],
  T6_validate: ['T5_quantify'],
  T7_structural: [],
  T8_finalize: ['T3_detect']
};

/** Latest (non-superseded) run per stage. */
export function latestRuns(runs: readonly StageRun[]): Partial<Record<StageId, StageRun>> {
  const out: Partial<Record<StageId, StageRun>> = {};
  for (const run of runs) {
    if (run.supersededBy) continue;
    const prev = out[run.stage];
    if (!prev || prev.createdAt <= run.createdAt) out[run.stage] = run;
  }
  return out;
}

/** T7 may consume geometry (e.g. a reduced section at the pothole) only after T5 and T6 pass. */
export const GEOMETRY_GATE: readonly StageId[] = ['T5_quantify', 'T6_validate'];

export function structuralMayUseGeometry(runs: readonly StageRun[]): boolean {
  const latest = latestRuns(runs);
  return GEOMETRY_GATE.every((s) => latest[s]?.status === 'completed');
}

/** A dependency is satisfied when it completed, or awaits review (downstream is then provisional). */
export const SATISFIED: ReadonlySet<string> = new Set(['completed', 'needs_review']);

/** Stages that block approval of a version: any latest run that failed or is stale. */
export function blockingStages(runs: readonly StageRun[]): StageId[] {
  const latest = latestRuns(runs);
  return STAGE_IDS.filter((s) => latest[s]?.status === 'failed' || latest[s]?.status === 'stale');
}
