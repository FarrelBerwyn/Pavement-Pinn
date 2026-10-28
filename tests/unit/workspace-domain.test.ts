/**
 * Analysis Workspace domain (handoff U1/U2/U6): honest values, URL selection, rerun matrix,
 * approval guard (O5), validation statistics and the public projection.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Actor } from '../../src/domain/workflow/model';
import type { Workspace } from '../../src/domain/workspace/types';
import { MeasuredSchema, WorkspaceSchema } from '../../src/domain/workspace/types';
import { displayState, enforceScale, REASON } from '../../src/domain/workspace/measured';
import { parseSelection, serializeSelection } from '../../src/domain/workspace/url';
import { RERUN_MATRIX, latestRuns } from '../../src/domain/workspace/rerun';
import { dependencyBlock, inputHash, submitStageRun, updateRun, type Clock } from '../../src/domain/workspace/orchestrator';
import { addGroundTruth, applyCorrection, decideVersion, submitVersion } from '../../src/domain/workspace/commands';
import { portfolioKpi, validationStats, verdictFor, workspaceKpi } from '../../src/domain/workspace/metrics';
import { toPublicTrack } from '../../src/domain/workspace/publicTrack';
import { buildDemoWorkspace } from '../../src/domain/workspace/demo';
import { sectionProfile } from '../../src/domain/workspace/section';

const FE: Actor = { id: 'USR-006', role: 'FIELD_ENGINEER', kind: 'DEMO_ACCOUNT' };
const FE_OTHER_ACCOUNT: Actor = { id: 'USR-001', role: 'FIELD_ENGINEER', kind: 'DEMO_ACCOUNT' }; // same person as USR-006 (D-040)
const MO: Actor = { id: 'USR-008', role: 'OPERATIONS_MANAGER', kind: 'DEMO_ACCOUNT' };
const PM: Actor = { id: 'USR-007', role: 'POLICY_MAKER', kind: 'DEMO_ACCOUNT' };

function clock(): Clock {
  let t = Date.parse('2026-10-27T08:00:00Z');
  let n = 0;
  return { now: () => new Date((t += 1000)).toISOString(), id: (p) => `${p}-${++n}` };
}

const ok = (r: any): Workspace => {
  assert.ok(!('status' in r), JSON.stringify(r));
  return r.workspace;
};

/** Mark every queued run completed, as the server executor would after a successful rerun. */
const completeQueued = (ws: Workspace): Workspace => ({ ...ws, stageRuns: ws.stageRuns.map((r) => (r.status === 'queued' ? { ...r, status: 'completed' as const } : r)) });

test('the demo workspace satisfies the contract schema and is flagged DATA CONTOH', () => {
  const ws = buildDemoWorkspace();
  assert.equal(WorkspaceSchema.safeParse(ws).success, true);
  assert.equal(ws.demo, true);
});

test('a null measured value needs a reason; MeasuredValue renders the reason, never 0', () => {
  assert.equal(MeasuredSchema.safeParse({ value: null, unit: 'mm', provenance: 'not_available', source: { stage: 'T5_quantify', method: 'x' } }).success, false);
  const s = displayState({ value: null, unit: 'mm', provenance: 'not_available', source: { stage: 'T5_quantify', method: 'x' }, reasonUnavailable: REASON.notMeasured });
  assert.deepEqual(s, { kind: 'unavailable', reason: 'belum diukur' });
  assert.deepEqual(displayState(undefined), { kind: 'unavailable', reason: 'belum diukur' });
});

test('no mm, L or m² without a valid metric scale', () => {
  const ws = buildDemoWorkspace();
  const pothole = ws.objects.find((o) => o.objectId === 'POTHOLE-024')!;
  assert.notEqual(pothole.measurements.depthMaxMm.value, null);
  const relative = enforceScale({ ...pothole, quality: { ...pothole.quality, scaleStatus: 'relative_only' } });
  for (const [key, m] of Object.entries(relative.measurements)) {
    if (!['mm', 'L', 'm2'].includes(m.unit)) continue;
    assert.equal(m.value, null, key);
    // Values that existed are withheld as "Relative geometry"; already-missing ones keep their own reason.
    if ((pothole.measurements as any)[key].value !== null) assert.equal(m.reasonUnavailable, REASON.relativeGeometry, key);
  }
  assert.deepEqual(displayState(pothole.measurements.depthMaxMm, 'missing'), { kind: 'unavailable', reason: REASON.relativeGeometry });
});

test('URL <-> selection round-trips and rejects junk', () => {
  const sel = parseSelection('?obj=POTHOLE-024&tab=3d&v=2&foo=1');
  assert.deepEqual(sel, { objectId: 'POTHOLE-024', tab: '3d', version: 2 });
  assert.equal(serializeSelection(sel, '?foo=1'), '?foo=1&obj=POTHOLE-024&tab=3d&v=2');
  assert.deepEqual(parseSelection('?obj=<script>&tab=evil&v=-3'), { objectId: null, tab: 'overview', version: null });
  assert.equal(serializeSelection({ objectId: null, tab: 'overview', version: null }), '');
});

test('rerun matrix follows contract §5', () => {
  assert.deepEqual(RERUN_MATRIX.contour, ['T4_surface', 'T5_quantify', 'T6_validate']);
  assert.deepEqual(RERUN_MATRIX.mask, ['T3_detect', 'T4_surface', 'T5_quantify', 'T6_validate', 'T8_finalize']);
  assert.deepEqual(RERUN_MATRIX.scale_marker, ['T1_reconstruct', 'T2_preprocess', 'T3_detect', 'T4_surface', 'T5_quantify', 'T6_validate', 'T7_structural']);
  assert.deepEqual(RERUN_MATRIX.ground_truth, ['T6_validate']);
  assert.deepEqual(RERUN_MATRIX.layers, ['T7_structural']);
  assert.equal(RERUN_MATRIX.frame_accept.length, 9);
  assert.deepEqual(RERUN_MATRIX.after_photo, ['T8_finalize']);
});

test('stage runs are idempotent per input hash; a new input makes the old run stale', () => {
  const c = clock();
  const a = submitStageRun([], 'R', 'T5_quantify', 'h1', c);
  const again = submitStageRun(a.runs, 'R', 'T5_quantify', 'h1', c);
  assert.equal(again.reused, true);
  assert.equal(again.runs.length, 1);
  const b = submitStageRun(a.runs, 'R', 'T5_quantify', 'h2', c);
  assert.equal(b.runs.find((r) => r.runId === a.run.runId)!.status, 'stale');
  assert.equal(b.runs.find((r) => r.runId === a.run.runId)!.supersededBy, b.run.runId);
  // A failed run may be retried with the same input (attempt counter rises).
  const failed = updateRun(b.runs, b.run.runId, { status: 'failed' });
  const retry = submitStageRun(failed, 'R', 'T5_quantify', 'h2', c);
  assert.equal(retry.reused, false);
  assert.equal(retry.run.attempt, 2);
  assert.equal(inputHash({ b: 1, a: [1, 2] }), inputHash({ a: [1, 2], b: 1 }));
});

test('dependency lock: T4 waits for T2; needs_review upstream allows a provisional result', () => {
  const ws = buildDemoWorkspace();
  assert.equal(dependencyBlock(ws.stageRuns, 'T4_surface'), null); // T3 needs_review is enough
  const noT2 = ws.stageRuns.map((r) => (r.stage === 'T2_preprocess' ? { ...r, status: 'blocked' as const } : r));
  assert.match(dependencyBlock(noT2, 'T4_surface') ?? '', /T2_preprocess/);
});

test('only a Field Engineer corrects; reason is mandatory; reruns are queued and old runs go stale', () => {
  const c = clock();
  const ws = buildDemoWorkspace();
  const contour = [[100, 100], [600, 100], [600, 600], [100, 600]];
  const body = { kind: 'contour', objectId: 'POTHOLE-024', field: 'contour', newValue: contour, reason: 'Batas lubang di sisi utara terlalu sempit', evidence: ['F02'] };
  const denied = applyCorrection(ws, body, MO, c) as any;
  assert.equal(denied.status, 403);
  assert.equal((applyCorrection(ws, { ...body, reason: '' }, FE, c) as any).status, 400);
  assert.equal((applyCorrection(ws, { ...body, field: 'measurements.depthMaxMm.value' }, FE, c) as any).status, 400);
  const next = ok(applyCorrection(ws, body, FE, c));
  const latest = latestRuns(next.stageRuns);
  assert.equal(latest.T4_surface!.status, 'queued');
  assert.equal(latest.T6_validate!.status, 'queued');
  assert.equal(next.stageRuns.find((r) => r.runId === 'demo-run-T5')!.status, 'stale');
  assert.equal(next.versions[0].status, 'draft');
  assert.equal(next.corrections[0].oldValue !== null, true);
  assert.equal(next.audit.at(-1)!.action, 'correction:contour');
});

test('approval: M.O only, never the corrector (same person on another account), never with unfinished stages', () => {
  const c = clock();
  let ws = ok(applyCorrection(buildDemoWorkspace(), { kind: 'contour', objectId: 'POTHOLE-024', field: 'contour', newValue: [[1, 1], [9, 1], [9, 9]], reason: 'Kontur diperbaiki di lapangan' }, FE, c));
  assert.equal((submitVersion(ws, { changeSummaryPublic: 'pendek' }, FE, c) as any).status, 400);
  ws = ok(submitVersion(ws, { changeSummaryPublic: 'Petugas memperbaiki batas lubang.' }, FE, c));
  assert.equal((decideVersion(ws, 1, 'approve', undefined, MO, c) as any).code, 'STAGES_NOT_READY');
  const done = completeQueued(ws);
  assert.equal((decideVersion(done, 1, 'approve', undefined, PM, c) as any).code, 'FORBIDDEN_ROLE');
  assert.equal((decideVersion(done, 1, 'approve', undefined, FE, c) as any).code, 'FORBIDDEN_ROLE');
  const selfAsMo: Actor = { ...MO, id: FE_OTHER_ACCOUNT.id }; // a corrector can never approve, whatever the role
  assert.equal((decideVersion({ ...done, corrections: done.corrections.map((x) => ({ ...x, by: FE_OTHER_ACCOUNT.id })) }, 1, 'approve', undefined, selfAsMo, c) as any).code, 'SELF_APPROVAL');
  assert.equal((decideVersion(done, 1, 'reject', '', MO, c) as any).code, 'REASON_REQUIRED');
  const approved = ok(decideVersion(done, 1, 'approve', undefined, MO, c));
  assert.equal(approved.versions[0].status, 'approved');
  assert.equal(approved.versions[0].approvedBy, MO.id);
  assert.ok(approved.versions[0].publicSnapshot);
  assert.equal((decideVersion(approved, 1, 'approve', undefined, MO, c) as any).code, 'NOT_PENDING');
});

test('validation statistics come only from real pairs; none -> null, not zeros', () => {
  assert.equal(validationStats([]), null);
  const base = { objectId: 'P', xMm: 0, yMm: 0, tool: 'jangka sorong', measuredBy: 'FE', measuredAt: 'x' };
  const pts = [
    { ...base, pointId: '1', referenceMm: 30, systemMm: 31 },
    { ...base, pointId: '2', referenceMm: 20, systemMm: 24 },
    { ...base, pointId: '3', referenceMm: null, systemMm: 18 }
  ];
  const s = validationStats(pts)!;
  assert.equal(s.n, 2);
  assert.equal(s.maeMm, 2.5);
  assert.equal(s.rmseMm, Math.sqrt((1 + 16) / 2));
  assert.equal(s.biasMm, 2.5);
  assert.equal(verdictFor(pts[0]), 'PASS');
  assert.equal(verdictFor(pts[1]), 'REVIEW');
  assert.equal(verdictFor(pts[2]), 'NOT_VALIDATED');
});

test('ground truth is F.E only and queues T6', () => {
  const c = clock();
  const body = { objectId: 'POTHOLE-024', xMm: 300, yMm: 400, referenceMm: 30, systemMm: 31.2, tool: 'jangka sorong + mistar' };
  assert.equal((addGroundTruth(buildDemoWorkspace(), body, MO, c) as any).status, 403);
  const demo = buildDemoWorkspace();
  const ws = ok(addGroundTruth(demo, body, FE, c));
  assert.equal(ws.groundTruth.length, 1);
  // The system value comes from the stored surface, not from the client's 31.2.
  const s = demo.surfaces[0];
  assert.equal(ws.groundTruth[0].systemMm, Math.round(s.depth[Math.floor(400 / s.cellSize)][Math.floor(300 / s.cellSize)]! * 10) / 10);
  assert.notEqual(ws.groundTruth[0].systemMm, 31.2);
  assert.equal(latestRuns(ws.stageRuns).T6_validate!.status, 'queued');
});

test('KPIs exclude DATA CONTOH workspaces and report null for stages that have not run', () => {
  const demo = buildDemoWorkspace();
  const k = workspaceKpi(demo);
  assert.equal(k.validated, null); // T6 blocked: "Validasi belum tersedia", not 0
  assert.equal(k.detected, demo.objects.length);
  const p = portfolioKpi([demo]);
  assert.deepEqual(p, { inAnalysis: 0, needsFeReview: 0, awaitingApproval: 0, fieldValidated: 0, excludedDemo: 1 });
});

test('public projection: no personal data, no unvalidated sizes, revision visible after approval', () => {
  const c = clock();
  let ws = buildDemoWorkspace();
  const before = toPublicTrack(ws);
  assert.equal(before.sizeCm, null);
  assert.equal(before.severity, null);
  assert.equal(before.status, 'received');
  ws = ok(applyCorrection(ws, { kind: 'contour', objectId: 'POTHOLE-024', field: 'contour', newValue: [[1, 1], [9, 1], [9, 9]], reason: 'Kontur diperbaiki di lapangan' }, FE, c));
  ws = ok(submitVersion(ws, { changeSummaryPublic: 'Petugas memperbaiki batas lubang.' }, FE, c));
  ws = ok(decideVersion(completeQueued(ws), 1, 'approve', undefined, MO, c));
  const after = toPublicTrack(ws);
  assert.equal(after.status, 'verified');
  assert.equal(after.currentVersion, 1);
  assert.equal(after.changeSummary, 'Petugas memperbaiki batas lubang.');
  assert.equal(after.sizeCm, null); // still no field validation
  const text = JSON.stringify(after);
  for (const forbidden of ['USR-', 'Ahmad', 'Hendra', 'reporter', 'measuredBy', 'approvedBy', 'createdBy', 'epsT', 'modelVersion', 'confidence']) {
    assert.ok(!text.includes(forbidden), `public view leaks ${forbidden}`);
  }
});

test('section profile follows the deepest row of the stored grid', () => {
  const surface = buildDemoWorkspace().surfaces[0];
  const p = sectionProfile(surface, 'x')!;
  assert.equal(p.depth.length, surface.cols);
  const max = Math.max(...(p.depth.filter((d) => d !== null) as number[]));
  const gridMax = Math.max(...surface.depth.flat().filter((d): d is number => d !== null));
  assert.equal(max, gridMax);
});

test('completed sample ROAD-2026-002: valid contract, real stats, public page shows the finished revision', async () => {
  const { buildCompletedWorkspace } = await import('../../src/domain/workspace/demoCompleted');
  const ws = buildCompletedWorkspace();
  assert.equal(WorkspaceSchema.safeParse(ws).success, true);
  assert.equal(ws.demo, true);
  const s = validationStats(ws.groundTruth)!;
  assert.equal(s.n, ws.groundTruth.filter((p) => (p.quantity ?? 'depth') === 'depth').length);
  assert.ok(s.maeMm > 0 && s.maeMm < 3, `MAE ${s.maeMm}`);
  assert.equal(workspaceKpi(ws).validated, 2); // pothole + crack both have passing field points
  const run = ws.structuralRuns.find((r) => r.status === 'completed')!;
  assert.ok(run.lifeIndexYr && run.lifeIndexYr.p10 < run.lifeIndexYr.p50 && run.lifeIndexYr.p50 < run.lifeIndexYr.p90);
  assert.equal(ws.structuralRuns.find((r) => r.status === 'stale')!.supersededBy, run.runId);
  const pub = toPublicTrack(ws);
  assert.equal(pub.status, 'repaired');
  assert.ok(pub.sizeCm && pub.sizeCm.depth !== null);
  assert.equal(pub.currentVersion, 1);
  assert.ok(!JSON.stringify(pub).includes('USR-'));
  assert.equal(portfolioKpi([ws]).excludedDemo, 1);
});

test('R² is withheld for small samples or flat references; width and depth are validated separately', async () => {
  const base = { objectId: 'P', xMm: 0, yMm: 0, tool: 't', measuredBy: 'FE', measuredAt: 'x' };
  const few = [1, 2, 3].map((i) => ({ ...base, pointId: `${i}`, referenceMm: 10 * i, systemMm: 10 * i + 1 }));
  assert.equal(validationStats(few)!.r2, null);
  assert.match(validationStats(few)!.r2Reason!, /n = 3/);
  const flat = [1, 2, 3, 4, 5].map((i) => ({ ...base, pointId: `${i}`, referenceMm: 10, systemMm: 10 + i / 10 }));
  assert.equal(validationStats(flat)!.r2, null);
  const good = [1, 2, 3, 4, 5].map((i) => ({ ...base, pointId: `${i}`, referenceMm: 10 * i, systemMm: 10 * i + 0.5 }));
  assert.ok(validationStats(good)!.r2! > 0.99);
  const { buildCompletedWorkspace } = await import('../../src/domain/workspace/demoCompleted');
  const ws = buildCompletedWorkspace();
  assert.equal(validationStats(ws.groundTruth, 'width')!.n, 3);
  assert.equal(validationStats(ws.groundTruth, 'width')!.r2, null); // 3 pairs, one reference value
});

test('a bounding box is not a mask: the crack object has a dataset box, its crack map lives on the surface', async () => {
  const { buildCompletedWorkspace } = await import('../../src/domain/workspace/demoCompleted');
  const ws = buildCompletedWorkspace();
  const crack = ws.objects.find((o) => o.objectId === 'CRACK-032')!;
  assert.ok(crack.geometryRefs.boxes && Object.keys(crack.geometryRefs.boxes).length > 0);
  assert.equal(crack.geometryRefs.masks, undefined);
  const s = ws.surfaces.find((x) => x.objectId === 'CRACK-032')!;
  assert.ok(s.crackMap!.flat().some((v) => v === 1));
  assert.equal(s.crackMap!.length, s.rows);
  assert.ok(crack.measurements.depthMaxMm.source.method.includes('Pan'));
});
