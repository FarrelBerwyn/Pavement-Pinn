/**
 * Put one report case back into the shared workflow store from a read-only export of a server
 * process (staff view: { cases, audit }), e.g. after the 2026-10-18 two-server incident (D-042).
 *
 * - Goes through FileCaseStore (lock + compare-and-swap); never edits the JSON by hand.
 * - Refuses if the case id already exists: it never overwrites.
 * - The case is restored exactly as exported (same state, version and history); its original
 *   audit events are added if missing, plus one RECORD_RESTORED event saying where it came from.
 *
 * Usage: npx tsx scripts/recovery/restore-case.ts <export.json> <caseId> "<reason>" [dataDir]
 */
import { readFileSync } from "node:fs";
import { FileCaseStore } from "../../server/repositories/fileCaseStore";
import { StoreConflictError, type AuditEvent } from "../../src/domain/workflow/service";
import type { ReportCase } from "../../src/domain/workflow/model";

const [exportFile, caseId, reason, dataDir = ".data"] = process.argv.slice(2);
if (!exportFile || !caseId || !reason) {
  console.error('Usage: npx tsx scripts/recovery/restore-case.ts <export.json> <caseId> "<reason>" [dataDir]');
  process.exit(2);
}

const exported = JSON.parse(readFileSync(exportFile, "utf8")) as { port?: string; exportedAt?: string; cases: ReportCase[]; audit: { items?: AuditEvent[] } | AuditEvent[] };
const record = exported.cases.find((c) => c.id === caseId);
if (!record) throw new Error(`${caseId} is not in ${exportFile}`);
if (record.version !== record.history.length) throw new Error(`${caseId}: version ${record.version} does not match ${record.history.length} history records`);
const auditItems = Array.isArray(exported.audit) ? exported.audit : exported.audit.items ?? [];
const originalAudit = auditItems.filter((e) => e.entityId === caseId);

const store = new FileCaseStore(dataDir);
for (let attempt = 0; ; attempt++) {
  const snapshot = await store.load();
  if (snapshot.cases.some((c) => c.id === caseId)) {
    console.log(JSON.stringify({ restored: false, reason: `${caseId} already exists in the store; nothing changed.` }));
    process.exit(0);
  }
  const known = new Set(snapshot.audit.map((e) => e.id));
  const restoreEvent: AuditEvent = {
    id: `AUD-RESTORE-${caseId}-${Date.now()}`,
    at: new Date().toISOString(),
    actor: { id: "system:recovery", role: "SYSTEM", kind: "SYSTEM" },
    entityType: "REPORT_CASE",
    entityId: caseId,
    action: "RECORD_RESTORED",
    from: null,
    to: record.state,
    reason: `${reason} Source: export of the server on port ${exported.port ?? "?"} at ${exported.exportedAt ?? "?"}; record restored unchanged (version ${record.version}).`
  };
  try {
    await store.commit({
      ...snapshot,
      revision: snapshot.revision + 1,
      cases: [record, ...snapshot.cases],
      audit: [...snapshot.audit, ...originalAudit.filter((e) => !known.has(e.id)), restoreEvent]
    });
    console.log(JSON.stringify({ restored: true, caseId, state: record.state, version: record.version, auditAdded: originalAudit.filter((e) => !known.has(e.id)).length + 1, revision: snapshot.revision + 1 }));
    break;
  } catch (error) {
    if (!(error instanceof StoreConflictError) || attempt >= 4) throw error;
  }
}
