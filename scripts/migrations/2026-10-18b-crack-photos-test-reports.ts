/**
 * Migration 2026-10-18b (owner request, 2026-10-18): relevant road-damage photos everywhere
 * on the demo map.
 *
 * 1. Demo reports (SYNTHETIC seed ids): photo fields follow the current seed mapping — damage
 *    types without an RDD2022 label now show a crack photo, captioned as a different type.
 * 2. Demo reports: the stock "after repair" photo is removed (after-repair evidence comes only
 *    from a field engineer; the UI shows that none exists yet).
 * 3. With --include-test-reports: USER_GENERATED reports whose photo is a test image are
 *    given an RDD2022 reference photo of their damage type. Run this only on a local/demo
 *    store whose user reports are all test data; never on a store with real citizen photos.
 *
 * Only photoUrl, photoProvenance, datasetAssetId and repairDetails.afterPhotoUrl change, plus
 * version/updatedAt and an audit event. Inspection and repair evidence are not touched.
 *
 *   npx tsx scripts/migrations/2026-10-18b-crack-photos-test-reports.ts [--include-test-reports] --dry-run|--apply
 *   npx tsx scripts/migrations/2026-10-18b-crack-photos-test-reports.ts --rollback <log.json>
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileCaseStore } from "../../server/repositories/fileCaseStore";
import { INITIAL_COMMUNITY_REPORTS } from "../../src/data/mock/communityReports";
import { normalizeBasePath } from "../../src/constants/deployment";
import { assignReferencePhotos, isStockPhoto, withReferencePhoto } from "../../src/domain/reports/datasetImages";
import { SYSTEM_ACTOR, type ReportCase } from "../../src/domain/workflow/model";
import type { AuditEvent, WorkflowSnapshot } from "../../src/domain/workflow/service";
import type { DamageReport } from "../../src/types";

const MIGRATION = "2026-10-18b-crack-photos-test-reports";
type Photo = Pick<DamageReport, "photoUrl" | "photoProvenance" | "datasetAssetId"> & { afterPhotoUrl?: string };
interface LogEntry {
  caseId: string;
  kind: "SEED" | "TEST_REPORT";
  before: Photo;
  after: Photo;
}

const args = process.argv.slice(2);
const dataDir = process.env.DATA_DIR && process.env.DATA_DIR.trim() !== "" ? process.env.DATA_DIR : ".data";
const store = new FileCaseStore(dataDir);
const basePath = normalizeBasePath(process.env.VITE_BASE_PATH);
const seedById = new Map(INITIAL_COMMUNITY_REPORTS.map((r) => [r.id, r]));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const photoOf = (r: DamageReport): Photo => ({ photoUrl: r.photoUrl, photoProvenance: r.photoProvenance, datasetAssetId: r.datasetAssetId, afterPhotoUrl: r.repairDetails?.afterPhotoUrl });
const same = (a: Photo, b: Photo) => JSON.stringify(a) === JSON.stringify(b);

function setPhoto(r: DamageReport, p: Photo): DamageReport {
  const next: DamageReport = { ...r, photoUrl: p.photoUrl };
  if (p.photoProvenance) next.photoProvenance = p.photoProvenance;
  else delete next.photoProvenance;
  if (p.datasetAssetId) next.datasetAssetId = p.datasetAssetId;
  else delete next.datasetAssetId;
  if (r.repairDetails) {
    const repairDetails = { ...r.repairDetails };
    if (p.afterPhotoUrl) repairDetails.afterPhotoUrl = p.afterPhotoUrl;
    else delete repairDetails.afterPhotoUrl;
    next.repairDetails = repairDetails;
  }
  return next;
}

async function writeSnapshot(snapshot: WorkflowSnapshot, changed: ReportCase[], reason: (c: ReportCase) => string) {
  const now = new Date().toISOString();
  const byId = new Map(changed.map((c) => [c.id, { ...c, version: c.version + 1, updatedAt: now }]));
  const events: AuditEvent[] = changed.map((c) => ({ id: `AUD-MIG-${c.id}-${stamp}`, at: now, actor: { ...SYSTEM_ACTOR }, entityType: "REPORT_CASE", entityId: c.id, action: "DATA_MIGRATION", from: c.state, to: c.state, reason: reason(c) }));
  await store.commit({ ...snapshot, revision: snapshot.revision + 1, cases: snapshot.cases.map((c) => byId.get(c.id) ?? c), audit: [...snapshot.audit, ...events] });
}

async function backup() {
  const dir = path.join(dataDir, "backups");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `workflow.${MIGRATION}.${stamp}.json`);
  await copyFile(store.location, file);
  return file;
}

async function apply(dryRun: boolean, includeTests: boolean) {
  const snapshot = await store.load();
  const log: LogEntry[] = [];
  const changed: ReportCase[] = [];

  for (const c of snapshot.cases) {
    const seed = seedById.get(c.id);
    if (c.dataStatus !== "SYNTHETIC" || !seed || seed.damageType !== c.report.damageType) continue;
    const target: Photo = { ...photoOf(seed), afterPhotoUrl: isStockPhoto(c.report.repairDetails?.afterPhotoUrl) ? undefined : c.report.repairDetails?.afterPhotoUrl };
    if (same(photoOf(c.report), target)) continue;
    log.push({ caseId: c.id, kind: "SEED", before: photoOf(c.report), after: target });
    changed.push({ ...c, report: setPhoto(c.report, target) });
  }

  if (includeTests) {
    const tests = snapshot.cases.filter((c) => c.dataStatus === "USER_GENERATED" && c.report.photoProvenance !== "DATASET_REFERENCE");
    const refs = assignReferencePhotos(tests.map((c) => c.report));
    for (const c of tests) {
      const ref = withReferencePhoto(c.report, refs.get(c.id)!, basePath);
      const target: Photo = { photoUrl: ref.photoUrl, photoProvenance: ref.photoProvenance, datasetAssetId: ref.datasetAssetId, afterPhotoUrl: c.report.repairDetails?.afterPhotoUrl };
      log.push({ caseId: c.id, kind: "TEST_REPORT", before: photoOf(c.report), after: target });
      changed.push({ ...c, report: setPhoto(c.report, target) });
    }
  }

  console.log(JSON.stringify({ store: store.location, revision: snapshot.revision, total: snapshot.cases.length, seeds: log.filter((e) => e.kind === "SEED").length, testReports: log.filter((e) => e.kind === "TEST_REPORT").length, untouched: snapshot.cases.length - changed.length }, null, 2));
  if (dryRun || changed.length === 0) return;

  const backupFile = await backup();
  await writeSnapshot(snapshot, changed, (c) => `Photo set to ${c.report.photoProvenance ?? "none"} ${c.report.datasetAssetId ?? ""} (${MIGRATION}).`);
  const logDir = path.join(dataDir, "migrations");
  await mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${MIGRATION}.${stamp}.json`);
  await writeFile(logFile, JSON.stringify({ migration: MIGRATION, backupFile, fromRevision: snapshot.revision, entries: log }, null, 2));
  console.log(`applied ${changed.length} changes; backup ${backupFile}; log ${logFile}`);
}

async function rollback(logFile: string) {
  const { entries } = JSON.parse(await readFile(logFile, "utf8")) as { entries: LogEntry[] };
  const byId = new Map(entries.map((e) => [e.caseId, e]));
  const snapshot = await store.load();
  // Only cases that still carry exactly what this migration wrote.
  const changed = snapshot.cases.filter((c) => byId.has(c.id) && same(photoOf(c.report), byId.get(c.id)!.after)).map((c) => ({ ...c, report: setPhoto(c.report, byId.get(c.id)!.before) }));
  await backup();
  await writeSnapshot(snapshot, changed, () => `Rollback of ${MIGRATION}.`);
  console.log(`rolled back ${changed.length} of ${entries.length}`);
}

const rollbackIndex = args.indexOf("--rollback");
const run = rollbackIndex >= 0 ? rollback(args[rollbackIndex + 1]) : apply(!args.includes("--apply"), args.includes("--include-test-reports"));
run.catch((error) => {
  console.error(error);
  process.exit(1);
});
