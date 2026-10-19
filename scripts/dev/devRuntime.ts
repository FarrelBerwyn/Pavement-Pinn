/**
 * Shared helpers for the development launcher and status/check commands: the canonical project
 * root, the runtime registry (.data/dev-runtime.json) and port probing. No process is ever killed
 * here; a busy port is reported, never freed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RuntimeIdentity } from "../../src/types";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REGISTRY_DIR = path.join(ROOT, ".data");
export const REGISTRY = path.join(REGISTRY_DIR, "dev-runtime.json");
export const ALIASES = path.join(REGISTRY_DIR, "dev-aliases.json");
export const COMMON_PORTS = [3000, 3001, 3002, 3100, 4173, 5173, 5174];

export interface RegistryEntry {
  runtimeId: string; pid: number; root: string; primary: number; aliases: number[]; dataDir: string; startedAt: string;
  /** Set by `npm run dev:restart` while it replaces this runtime, so alias watchdogs do not take over meanwhile. */
  restartingBy?: { pid: number; until: string };
}

/** A restart is in progress (its process is alive and within its deadline): the runtime is being replaced, not gone. */
export const restartInProgress = (reg: RegistryEntry | null) =>
  Boolean(reg?.restartingBy && pidAlive(reg.restartingBy.pid) && Date.parse(reg.restartingBy.until) > Date.now());
export interface AliasEntry { pid: number; port: number; target: number; runtimeId: string }

const readJson = <T>(file: string, fallback: T): T => {
  try { return JSON.parse(readFileSync(file, "utf8")) as T; } catch { return fallback; }
};
export const readRegistry = () => readJson<RegistryEntry | null>(REGISTRY, null);
export const writeRegistry = (entry: RegistryEntry) => { mkdirSync(REGISTRY_DIR, { recursive: true }); writeFileSync(REGISTRY, JSON.stringify(entry, null, 2)); };
export const clearRegistry = (runtimeId: string) => { if (readRegistry()?.runtimeId === runtimeId) rmSync(REGISTRY, { force: true }); };
export const readAliases = () => readJson<AliasEntry[]>(ALIASES, []).filter((a) => pidAlive(a.pid));
export const writeAliases = (list: AliasEntry[]) => { mkdirSync(REGISTRY_DIR, { recursive: true }); writeFileSync(ALIASES, JSON.stringify(list, null, 2)); };

export function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; }
}

export function git(args: string[]): string | null {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }).trim(); } catch { return null; }
}

/** Free to bind? (Does not touch whoever holds it.) */
export function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.listen(port, "0.0.0.0", () => s.close(() => resolve(true)));
  });
}

export type Probe =
  | { kind: "closed" }
  | { kind: "pinn"; identity: RuntimeIdentity }
  | { kind: "pinn-legacy"; health: Record<string, unknown> }
  | { kind: "alias-down" }
  | { kind: "other"; status: number };

/** What answers on a port: a PINN runtime (with identity), an older PINN server, something else, or nothing. */
export async function probe(port: number): Promise<Probe> {
  const get = async (p: string) => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, { signal: AbortSignal.timeout(2500) });
    const type = res.headers.get("content-type") ?? "";
    return { status: res.status, json: type.includes("json") ? await res.json() : null };
  };
  try {
    const rt = await get("/api/runtime");
    if (rt.json?.app === "pavement-pinn" && rt.json.runtimeId) return { kind: "pinn", identity: rt.json as RuntimeIdentity };
    if (rt.status === 502 && (await fetch(`http://127.0.0.1:${port}/api/runtime`, { signal: AbortSignal.timeout(2500) }).then((r) => r.text())).includes("PAVEMENT-PINN runtime")) return { kind: "alias-down" };
    const h = await get("/api/health");
    if (h.json?.appName === "PAVEMENT-PINN") return { kind: "pinn-legacy", health: h.json };
    return { kind: "other", status: h.status };
  } catch {
    return (await portFree(port)) ? { kind: "closed" } : { kind: "other", status: 0 };
  }
}

export function projectSummary() {
  const status = git(["status", "--porcelain"]);
  const worktrees = (git(["worktree", "list"]) ?? "").split("\n").filter(Boolean);
  return {
    root: ROOT,
    branch: git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "unknown",
    commit: git(["rev-parse", "--short", "HEAD"]) ?? "unknown",
    dirtyFiles: status === null ? null : status.split("\n").filter(Boolean).length,
    worktrees
  };
}
