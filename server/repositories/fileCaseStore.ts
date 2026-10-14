import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CaseStore, WorkflowSnapshot } from "../../src/domain/workflow/service";

/**
 * Workflow persistence for the local/demo server: one JSON snapshot on disk, written
 * atomically (temp file + rename), so a crash mid-write never leaves a torn file and a
 * failed write leaves the previous snapshot in place.
 *
 * This is the development/demo store. The production target is Supabase PostgreSQL
 * (supabase/migrations/), behind the same `CaseStore` interface; it is not connected
 * because no credentials are configured (docs/GAP_REGISTER.md).
 */
export class FileCaseStore implements CaseStore {
  private cache: WorkflowSnapshot | null = null;
  private readonly file: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, "workflow.json");
  }

  get location(): string {
    return this.file;
  }

  async load(): Promise<WorkflowSnapshot> {
    if (!this.cache) {
      try {
        const raw = await readFile(this.file, "utf8");
        const parsed = JSON.parse(raw) as WorkflowSnapshot;
        if (!parsed || !Array.isArray(parsed.cases) || !Array.isArray(parsed.audit)) throw new Error("malformed workflow store");
        this.cache = parsed;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        this.cache = { revision: 0, cases: [], audit: [] };
      }
    }
    return JSON.parse(JSON.stringify(this.cache)) as WorkflowSnapshot;
  }

  async commit(next: WorkflowSnapshot): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(next), "utf8");
    await rename(tmp, this.file);
    this.cache = JSON.parse(JSON.stringify(next)) as WorkflowSnapshot;
  }
}
