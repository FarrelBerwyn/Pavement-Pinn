/**
 * `npm run dev:status` — which PAVEMENT-PINN servers answer on which ports, and whether they are
 * one runtime. `npm run dev:check` — the same, exiting 1 when something is inconsistent: two
 * runtimes on one data store, a server from another project root, stale code, or a server that
 * cannot identify itself. Extra ports to probe can be passed as arguments.
 */
import { createHash } from "node:crypto";
import path from "node:path";
import { COMMON_PORTS, ROOT, probe, projectSummary, readAliases, readRegistry } from "./devRuntime";

const check = process.argv.includes("--check");
const rootId = createHash("sha256").update(path.resolve(ROOT).toLowerCase()).digest("hex").slice(0, 12);

async function main() {
  const project = projectSummary();
  const registry = readRegistry();
  const aliases = readAliases();
  const extra = process.argv.filter((a) => /^\d+$/.test(a)).map(Number);
  const ports = [...new Set([...COMMON_PORTS, ...extra, ...(registry ? [registry.primary, ...registry.aliases] : []), ...aliases.map((a) => a.port)])].sort((a, b) => a - b);
  console.log(`project ${project.root}\nbranch ${project.branch} @ ${project.commit}${project.dirtyFiles ? ` · ${project.dirtyFiles} uncommitted` : ""}`);
  console.log(`registry: ${registry ? `runtime ${registry.runtimeId.slice(0, 8)} PID ${registry.pid} primary :${registry.primary}` : "none"}\n`);

  const problems: string[] = [];
  const runtimes = new Map<string, { storeId: string; ports: number[] }>();
  const rows: string[][] = [["port", "server", "runtime", "pid", "role", "commit", "code", "store", "root"]];
  for (const port of ports) {
    const p = await probe(port);
    if (p.kind === "closed") continue;
    if (p.kind === "alias-down") {
      rows.push([String(port), "PINN alias (runtime down)", "-", "-", "forwarder", "-", "-", "-", "-"]);
      problems.push(`:${port} is a PAVEMENT-PINN alias whose runtime is not reachable. Start the runtime (npm run dev) or stop the alias.`);
      continue;
    }
    if (p.kind === "other") {
      rows.push([String(port), "not PAVEMENT-PINN", "-", "-", "-", "-", "-", "-", "-"]);
      continue;
    }
    if (p.kind === "pinn-legacy") {
      const pid = (p.health.server as { pid?: number } | undefined)?.pid;
      rows.push([String(port), "PINN (no identity)", "?", String(pid ?? "?"), "?", "?", "?", "?", "?"]);
      problems.push(`:${port} runs a PAVEMENT-PINN server without /api/runtime (older code): its runtime and store cannot be verified. Stop it in its terminal and use npm run dev.`);
      continue;
    }
    const id = p.identity;
    const role = id.ports.primary === port ? "primary" : id.ports.aliases.includes(port) ? "alias (in-process)" : aliases.some((a) => a.port === port) ? "alias (forwarder)" : "alias";
    rows.push([String(port), "PINN runtime", id.runtimeId.slice(0, 8), String(id.pid), role, id.project.commit ?? "?", id.code.syncStatus, id.dataStore.storeId, id.project.rootId === rootId ? "this" : `${id.project.name}!`]);
    const r = runtimes.get(id.runtimeId) ?? { storeId: id.dataStore.storeId, ports: [] };
    r.ports.push(port);
    runtimes.set(id.runtimeId, r);
    if (id.project.rootId !== rootId) problems.push(`:${port} serves another project root (${id.project.name}).`);
    // Do not trust a process's own verdict alone: compare what it runs with this checkout's HEAD.
    const runs = id.code.commit ?? id.project.commit;
    if (runs && project.commit !== "unknown" && runs !== project.commit && !problems.some((p) => p.startsWith(`:${port} runtime`))) {
      problems.push(`:${port} runtime ${id.runtimeId.slice(0, 8)} runs commit ${runs}, but this checkout is at ${project.commit}: restart it.`);
    }
    if (id.code.stale) {
      const files = id.code.changedFiles.length ? ` (${id.code.changedFiles.slice(0, 3).join(", ")})` : "";
      problems.push(`:${port} runtime ${id.runtimeId.slice(0, 8)} is ${id.code.syncStatus}${files}: restart it.`);
    }
  }
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
  for (const r of rows) console.log(r.map((v, c) => v.padEnd(widths[c])).join("  "));

  const byStore = new Map<string, string[]>();
  for (const [rid, r] of runtimes) byStore.set(r.storeId, [...(byStore.get(r.storeId) ?? []), rid]);
  for (const [store, ids] of byStore) {
    if (ids.length > 1) problems.push(`${ids.length} separate runtimes share data store ${store} (${ids.map((i) => i.slice(0, 8)).join(", ")}): separate sessions and caches. Keep one; add ports as aliases.`);
  }
  if (byStore.size > 1) console.log(`\nnote: ${byStore.size} data stores in use; a runtime on a store other than ${registry ? "the registered one" : "the canonical .data"} is an independent runtime: its data is NOT shared with the others.`);
  if (runtimes.size === 0) console.log("\nNo PAVEMENT-PINN runtime is running. Start one with: npm run dev");
  else console.log(`\n${runtimes.size} runtime(s) behind ${[...runtimes.values()].reduce((n, r) => n + r.ports.length, 0)} port(s).`);
  if (problems.length) {
    console.log("\nProblems:");
    for (const p of problems) console.log(`  ✖ ${p}`);
  } else if (runtimes.size) {
    console.log("✓ consistent: every port reaches the same runtime and store; code is up to date.");
  }
  if (check && problems.length) process.exit(1);
}

main();
