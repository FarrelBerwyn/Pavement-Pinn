/**
 * Migration 2026-10-18: demo report photos -> RDD2022 dataset reference images.
 *
 * Scope (anything else is left untouched and reported):
 *   dataStatus === 'SYNTHETIC'  AND  report.photoUrl on images.unsplash.com
 *   AND no photoProvenance yet  AND  the case id is one of the bundled seed reports
 *   with the same damage type.
 * Citizen photos (USER_GENERATED), repair evidence (repairDetails, inspection evidence)
 * coordinates, ids, segment, state and staff are never changed: only photoUrl,
 * photoProvenance and datasetAssetId, plus the case version/updatedAt and an audit event.
 *
 * Usage (DATA_DIR defaults to .data, like the server):
 *   npx tsx scripts/migrations/2026-10-18-dataset-reference-photos.ts --dry-run
 *   npx tsx scripts/migrations/2026-10-18-dataset-reference-photos.ts --apply
 *   npx tsx scripts/migrations/2026-10-18-dataset-reference-photos.ts --rollback <log.json>
 * Idempotent: a second --apply finds nothing in scope. Writes go through FileCaseStore
 * (cross-process lock + revision compare-and-swap), so running servers re-read the file.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileCaseStore } from "../../server/repositories/fileCaseStore";
import { INITIAL_COMMUNITY_REPORTS } from "../../src/data/mock/communityReports";
import { SYSTEM_ACTOR, type ReportCase } from "../../src/domain/workflow/model";
import type { AuditEvent, WorkflowSnapshot } from "../../src/domain/workflow/service";

const MIGRATION = "2026-10-18-dataset-reference-photos";

interface LogEntry {
  caseId: string;
  damageType: string;
  oldPhotoUrl: string;
  newPhotoUrl: string;
  photoProvenance: string;
  datasetAssetId: string | null;
}

const dataDir = process.env.DATA_DIR && process.env.DATA_DIR.trim() !== "" ? process.env.DATA_DIR : ".data";
const store = new FileCaseStore(dataDir);
const seedById = new Map(INITIAL_COMMUNITY_REPORTS.map((r) => [r.id, r]));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const inScope = (c: ReportCase) =>
  c.dataStatus === "SYNTHETIC" &&
  /^https:\/\/images\.unsplash\.com\//.test(c.report.photoUrl ?? "") &&
  !c.report.photoProvenance &&
  seedById.get(c.id)?.damageType === c.report.damageType;

function audit(c: ReportCase, reason: string, now: string): AuditEvent {
  return { id: `AUD-MIG-${c.id}-${stamp}`, at: now, actor: { ...SYSTEM_ACTOR }, entityType: "REPORT_CASE", entityId: c.id, action: "DATA_MIGRATION", from: c.state, to: c.state, reason };
}

async function commit(snapshot: WorkflowSnapshot, changed: ReportCase[], events: AuditEvent[]) {
  const byId = new Map(changed.map((c) => [c.id, c]));
  await store.commit({ ...snapshot, revision: snapshot.revision + 1, cases: snapshot.cases.map((c) => byId.get(c.id) ?? c), audit: [...snapshot.audit, ...events] });
}

async function backup() {
  const dir = path.join(dataDir, "backups");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `workflow.${MIGRATION}.${stamp}.json`);
  await copyFile(store.location, file);
  return file;
}

async function apply(dryRun: boolean) {
  const snapshot = await store.load();
  const targets = snapshot.cases.filter(inScope);
  const skipped = snapshot.cases.filter((c) => !inScope(c));
  const now = new Date().toISOString();
  const log: LogEntry[] = [];
  const changed = targets.map((c) => {
    const seed = seedById.get(c.id)!;
    log.push({ caseId: c.id, damageType: c.report.damageType, oldPhotoUrl: c.report.photoUrl, newPhotoUrl: seed.photoUrl, photoProvenance: seed.photoProvenance!, datasetAssetId: seed.datasetAssetId ?? null });
    const report = { ...c.report, photoUrl: seed.photoUrl, photoProvenance: seed.photoProvenance };
    if (seed.datasetAssetId) report.datasetAssetId = seed.datasetAssetId;
    else delete report.datasetAssetId;
    return { ...c, report, version: c.version + 1, updatedAt: now };
  });
  const summary = {
    store: store.location,
    revision: snapshot.revision,
    total: snapshot.cases.length,
    inScope: targets.length,
    untouched: {
      citizenPhotos: skipped.filter((c) => c.report.photoUrl?.startsWith("data:")).length,
      alreadyMigrated: skipped.filter((c) => c.report.photoProvenance).length,
      other: skipped.filter((c) => !c.report.photoUrl?.startsWith("data:") && !c.report.photoProvenance).map((c) => `${c.id} (${c.dataStatus}, ${String(c.report.photoUrl).slice(0, 40)})`)
    },
    byProvenance: log.reduce<Record<string, number>>((m, e) => ((m[e.photoProvenance] = (m[e.photoProvenance] ?? 0) + 1), m), {})
  };
  console.log(JSON.stringify(summary, null, 2));
  if (dryRun || targets.length === 0) return;

  const backupFile = await backup();
  await commit(snapshot, changed, changed.map((c) => audit(c, `Demo photo replaced by ${c.report.photoProvenance}${c.report.datasetAssetId ? ` ${c.report.datasetAssetId}` : ""} (${MIGRATION}).`, now)));
  const logDir = path.join(dataDir, "migrations");
  await mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${MIGRATION}.${stamp}.json`);
  await writeFile(logFile, JSON.stringify({ migration: MIGRATION, appliedAt: now, backupFile, fromRevision: snapshot.revision, entries: log }, null, 2));
  console.log(`applied ${changed.length} changes; backup ${backupFile}; log ${logFile}`);
}

async function rollback(logFile: string) {
  const { entries } = JSON.parse(await readFile(logFile, "utf8")) as { entries: LogEntry[] };
  const snapshot = await store.load();
  const now = new Date().toISOString();
  const byId = new Map(entries.map((e) => [e.caseId, e]));
  // Only revert cases that still carry exactly what this migration wrote.
  const changed = snapshot.cases
    .filter((c) => byId.get(c.id)?.newPhotoUrl === c.report.photoUrl)
    .map((c) => {
      const report = { ...c.report, photoUrl: byId.get(c.id)!.oldPhotoUrl };
      delete report.photoProvenance;
      delete report.datasetAssetId;
      return { ...c, report, version: c.version + 1, updatedAt: now };
    });
  await backup();
  await commit(snapshot, changed, changed.map((c) => audit(c, `Rollback of ${MIGRATION}.`, now)));
  console.log(`rolled back ${changed.length} of ${entries.length}`);
}

const [mode, arg] = process.argv.slice(2);
const run = mode === "--apply" ? apply(false) : mode === "--rollback" && arg ? rollback(arg) : apply(true);
run.catch((error) => {
  console.error(error);
  process.exit(1);
});
