import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { StoreConflictError, type CaseStore, type WorkflowSnapshot } from "../../src/domain/workflow/service";

/**
 * Workflow persistence for the local/demo server: one JSON snapshot on disk, written
 * atomically (temp file + rename), so a crash mid-write never leaves a torn file and a
 * failed write leaves the previous snapshot in place.
 *
 * Several server processes may serve the same data directory (e.g. one dev server on
 * :3001 and another on :5173). So this store never trusts its in-memory copy blindly:
 * - `load` re-reads the file whenever its mtime/size changed (another process wrote);
 * - `commit` takes a cross-process lock file and writes only if the snapshot on disk is
 *   still the one `next` was built from (compare-and-swap on `revision`); otherwise it
 *   throws StoreConflictError and the service retries on fresh data. No silent overwrite.
 *
 * This is the development/demo store. The production target is Supabase PostgreSQL
 * (supabase/migrations/), behind the same `CaseStore` interface; it is not connected
 * because no credentials are configured (docs/GAP_REGISTER.md).
 */
const LOCK_WAIT_MS = 5000;
const LOCK_STALE_MS = 15000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class FileCaseStore implements CaseStore {
  private cache: WorkflowSnapshot | null = null;
  /** mtime:size of the file the cache was read from (or written as). */
  private stamp: string | null = null;
  private readonly file: string;
  private readonly lockFile: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, "workflow.json");
    this.lockFile = `${this.file}.lock`;
  }

  get location(): string {
    return this.file;
  }

  private async diskStamp(): Promise<string> {
    try {
      const s = await stat(this.file);
      return `${s.mtimeMs}:${s.size}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "none";
      throw error;
    }
  }

  private async readDisk(): Promise<WorkflowSnapshot> {
    try {
      const parsed = JSON.parse(await readFile(this.file, "utf8")) as WorkflowSnapshot;
      if (!parsed || !Array.isArray(parsed.cases) || !Array.isArray(parsed.audit)) throw new Error("malformed workflow store");
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { revision: 0, cases: [], audit: [] };
    }
  }

  async load(): Promise<WorkflowSnapshot> {
    const stamp = await this.diskStamp();
    if (!this.cache || stamp !== this.stamp) {
      this.cache = await this.readDisk();
      this.stamp = stamp;
    }
    return clone(this.cache);
  }

  /** Exclusive lock across processes (lock file created with O_EXCL); stale locks expire. */
  private async lock(): Promise<() => Promise<void>> {
    const started = Date.now();
    for (;;) {
      try {
        const handle = await open(this.lockFile, "wx");
        await handle.writeFile(`${process.pid} ${new Date().toISOString()}`);
        await handle.close();
        return () => unlink(this.lockFile).catch(() => undefined);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const age = await stat(this.lockFile).then((s) => Date.now() - s.mtimeMs).catch(() => 0);
        if (age > LOCK_STALE_MS) await unlink(this.lockFile).catch(() => undefined);
        else if (Date.now() - started > LOCK_WAIT_MS) throw new Error("workflow store is locked by another process");
        else await sleep(20);
      }
    }
  }

  async commit(next: WorkflowSnapshot): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const release = await this.lock();
    try {
      const stamp = await this.diskStamp();
      const base = stamp === this.stamp && this.cache ? this.cache.revision : (await this.readDisk()).revision;
      if (base !== next.revision - 1) {
        this.cache = null;
        throw new StoreConflictError(`workflow store changed on disk (revision ${base}, expected ${next.revision - 1})`);
      }
      const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tmp, JSON.stringify(next), "utf8");
      await rename(tmp, this.file);
      this.cache = clone(next);
      this.stamp = await this.diskStamp();
    } finally {
      await release();
    }
  }
}
