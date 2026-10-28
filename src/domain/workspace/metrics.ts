/**
 * Validation statistics and KPIs, computed only from real records.
 */
import type { GroundTruthPoint, ValidationVerdict, Workspace } from './types';
import { latestRuns } from './rerun';

/** Tolerance for depth agreement. TARGET (team target, not a proven figure). */
export const DEPTH_TOLERANCE_MM = 3;
/** Above this the pair is a failure rather than a review case. TARGET. */
export const DEPTH_FAIL_MM = 6;

export function verdictFor(p: Pick<GroundTruthPoint, 'referenceMm' | 'systemMm'>, tolMm = DEPTH_TOLERANCE_MM, failMm = DEPTH_FAIL_MM): ValidationVerdict {
  if (p.referenceMm === null || p.systemMm === null) return 'NOT_VALIDATED';
  const d = Math.abs(p.systemMm - p.referenceMm);
  return d <= tolMm ? 'PASS' : d <= failMm ? 'REVIEW' : 'FAIL';
}

export interface ValidationStats {
  quantity: 'depth' | 'width';
  r2: number | null;
  r2Reason: string | null;
  n: number;
  objects: number;
  maeMm: number;
  rmseMm: number;
  biasMm: number;
  relErrPct: number | null;
  pass: number;
  review: number;
  fail: number;
}

/** Null when no point has both a reference and a system value — never zeros. */
/** Minimum pairs before R² is reported; with fewer, or with no spread in the reference, it is withheld. */
export const R2_MIN_PAIRS = 5;

export function validationStats(points: readonly GroundTruthPoint[], quantity: 'depth' | 'width' = 'depth'): ValidationStats | null {
  const pairs = points.filter((p) => (p.quantity ?? 'depth') === quantity && p.referenceMm !== null && p.systemMm !== null) as Array<GroundTruthPoint & { referenceMm: number; systemMm: number }>;
  if (pairs.length === 0) return null;
  const d = pairs.map((p) => p.systemMm - p.referenceMm);
  const n = pairs.length;
  const mae = d.reduce((s, x) => s + Math.abs(x), 0) / n;
  const rmse = Math.sqrt(d.reduce((s, x) => s + x * x, 0) / n);
  const bias = d.reduce((s, x) => s + x, 0) / n;
  const refs = pairs.filter((p) => p.referenceMm !== 0);
  const rel = refs.length ? (refs.reduce((s, p) => s + Math.abs(p.systemMm - p.referenceMm) / Math.abs(p.referenceMm), 0) / refs.length) * 100 : null;
  const verdicts = pairs.map((p) => verdictFor(p));
  const refMean = pairs.reduce((s, p) => s + p.referenceMm, 0) / n;
  const ssTot = pairs.reduce((s, p) => s + (p.referenceMm - refMean) ** 2, 0);
  const ssRes = d.reduce((s, x) => s + x * x, 0);
  // Coefficient of determination of system vs reference (y = x model), not a fitted regression.
  const r2 = n >= R2_MIN_PAIRS && ssTot > 1e-9 ? 1 - ssRes / ssTot : null;
  return {
    quantity,
    r2,
    r2Reason: r2 !== null ? null : n < R2_MIN_PAIRS ? `n = ${n} < ${R2_MIN_PAIRS} pasangan` : 'referensi tanpa variasi',
    n,
    objects: new Set(pairs.map((p) => p.objectId)).size,
    maeMm: mae,
    rmseMm: rmse,
    biasMm: bias,
    relErrPct: rel,
    pass: verdicts.filter((v) => v === 'PASS').length,
    review: verdicts.filter((v) => v === 'REVIEW').length,
    fail: verdicts.filter((v) => v === 'FAIL').length
  };
}

export interface WorkspaceKpi {
  detected: number | null;
  scaled3d: { scaled: number; total: number } | null;
  needsReview: number;
  validated: number | null;
}

/** KPI cards for one workspace. Null = the stage that produces it has not run. */
export function workspaceKpi(ws: Pick<Workspace, 'objects' | 'stageRuns' | 'groundTruth'>): WorkspaceKpi {
  const latest = latestRuns(ws.stageRuns);
  const real = ws.objects.filter((o) => o.class.value !== 'not_damage');
  const detected = latest.T3_detect?.status === 'completed' || latest.T3_detect?.status === 'needs_review' ? real.length : null;
  const geometryRan = latest.T5_quantify && latest.T5_quantify.status !== 'queued';
  const scaled3d = geometryRan ? { scaled: real.filter((o) => o.quality.scaleStatus === 'valid' && o.measurements.depthMaxMm.value !== null).length, total: real.length } : null;
  const needsReview = ws.stageRuns.filter((r) => !r.supersededBy && r.status === 'needs_review').length + real.filter((o) => o.class.value === 'unclassified').length;
  const validatedIds = new Set(ws.groundTruth.filter((p) => verdictFor(p) === 'PASS').map((p) => p.objectId));
  const validated = latest.T6_validate?.status === 'completed' ? real.filter((o) => validatedIds.has(o.objectId)).length : null;
  return { detected, scaled3d, needsReview, validated };
}

export interface PortfolioKpi {
  inAnalysis: number;
  needsFeReview: number;
  awaitingApproval: number;
  fieldValidated: number;
  excludedDemo: number;
}

/** Index-page KPIs across workspaces; DATA CONTOH workspaces are counted only as excluded. */
export function portfolioKpi(list: ReadonlyArray<Pick<Workspace, 'demo' | 'objects' | 'stageRuns' | 'groundTruth' | 'versions'>>): PortfolioKpi {
  const real = list.filter((w) => !w.demo);
  return {
    inAnalysis: real.filter((w) => {
      const l = latestRuns(w.stageRuns);
      return Object.values(l).some((r) => r && r.status !== 'completed') || Object.keys(l).length === 0;
    }).length,
    needsFeReview: real.filter((w) => workspaceKpi(w).needsReview > 0).length,
    awaitingApproval: real.filter((w) => w.versions.some((v) => v.status === 'pending_approval')).length,
    fieldValidated: real.filter((w) => (workspaceKpi(w).validated ?? 0) > 0).length,
    excludedDemo: list.length - real.length
  };
}
