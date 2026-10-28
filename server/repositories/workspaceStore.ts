import { promises as fs } from "node:fs";
import path from "node:path";
import type { Workspace } from "../../src/domain/workspace/types";

/**
 * Persistence of analysis workspaces behind an interface (HD-06 undecided; D-002 pattern).
 * With a data directory each workspace is one JSON file written atomically
 * (`<dataDir>/workspaces/<reportId>.json`); without one it lives in memory (tests).
 * Concurrency: one writer per report inside this process (the service serialises commands);
 * like the CV store, cross-process writers to the same report are not coordinated yet.
 */
export interface WorkspaceRepository {
  get(reportId: string): Promise<Workspace | null>;
  put(ws: Workspace): Promise<void>;
  list(): Promise<Workspace[]>;
}

const SAFE_ID = /^[A-Za-z0-9_.-]{1,64}$/;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class FileWorkspaceRepository implements WorkspaceRepository {
  private readonly cache = new Map<string, Workspace>();

  constructor(private readonly dir: string | null = null) {}

  async get(reportId: string): Promise<Workspace | null> {
    if (!SAFE_ID.test(reportId)) return null;
    const hit = this.cache.get(reportId);
    if (hit || !this.dir) return hit ? clone(hit) : null;
    try {
      const ws = JSON.parse(await fs.readFile(path.join(this.dir, `${reportId}.json`), "utf8")) as Workspace;
      this.cache.set(reportId, ws);
      return clone(ws);
    } catch {
      return null;
    }
  }

  async put(ws: Workspace): Promise<void> {
    if (!SAFE_ID.test(ws.reportId)) throw new Error("invalid report id");
    this.cache.set(ws.reportId, clone(ws));
    if (!this.dir) return;
    await fs.mkdir(this.dir, { recursive: true });
    const file = path.join(this.dir, `${ws.reportId}.json`);
    await fs.writeFile(`${file}.tmp`, JSON.stringify(ws));
    await fs.rename(`${file}.tmp`, file);
  }

  async list(): Promise<Workspace[]> {
    if (this.dir) {
      const names = await fs.readdir(this.dir).catch(() => [] as string[]);
      for (const n of names.filter((x) => x.endsWith(".json"))) await this.get(n.slice(0, -5));
    }
    return [...this.cache.values()].map(clone);
  }
}
