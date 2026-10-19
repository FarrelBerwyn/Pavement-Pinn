import { promises as fs } from "node:fs";
import path from "node:path";
import type { CvAnalysis } from "../../src/types/cv";

/**
 * Server-side record of CV analyses and their artefacts (overlay JPEG, crack mask PNG).
 * The analysis a report cites is read from here, never from the client. With a data
 * directory the records survive restarts (`<dataDir>/cv-analyses/`); without one they live
 * in memory (tests).
 */
export interface CvRecord {
  analysis: CvAnalysis;
  /** sha256 of the exact bytes analysed; a report photo must match it. */
  imageSha256: string;
  /** Report this analysis was attached to; one analysis backs at most one report. */
  reportId: string | null;
}

const ID = /^CVA-[0-9A-F]{16}$/;

export class CvAnalysisStore {
  private readonly records = new Map<string, CvRecord>();
  private readonly artefacts = new Map<string, Buffer>();

  constructor(private readonly dir: string | null = null) {}

  static isId(id: unknown): id is string {
    return typeof id === "string" && ID.test(id);
  }

  async put(record: CvRecord, overlay: Buffer | null, mask: Buffer | null): Promise<void> {
    const id = record.analysis.analysisId;
    this.records.set(id, record);
    if (overlay) this.artefacts.set(`${id}.overlay`, overlay);
    if (mask) this.artefacts.set(`${id}.mask`, mask);
    if (!this.dir) return;
    await fs.mkdir(this.dir, { recursive: true });
    if (overlay) await fs.writeFile(path.join(this.dir, `${id}.overlay.jpg`), overlay);
    if (mask) await fs.writeFile(path.join(this.dir, `${id}.mask.png`), mask);
    const tmp = path.join(this.dir, `${id}.json.tmp`);
    await fs.writeFile(tmp, JSON.stringify(record));
    await fs.rename(tmp, path.join(this.dir, `${id}.json`));
  }

  async get(id: string): Promise<CvRecord | null> {
    if (!CvAnalysisStore.isId(id)) return null;
    const hit = this.records.get(id);
    if (hit || !this.dir) return hit ?? null;
    try {
      const rec = JSON.parse(await fs.readFile(path.join(this.dir, `${id}.json`), "utf8")) as CvRecord;
      this.records.set(id, rec);
      return rec;
    } catch {
      return null;
    }
  }

  async artefact(id: string, kind: "overlay" | "mask"): Promise<Buffer | null> {
    if (!CvAnalysisStore.isId(id)) return null;
    const hit = this.artefacts.get(`${id}.${kind}`);
    if (hit || !this.dir) return hit ?? null;
    return fs.readFile(path.join(this.dir, `${id}.${kind === "overlay" ? "overlay.jpg" : "mask.png"}`)).catch(() => null);
  }

  /** Bind the analysis to a report. Fails if it already backs a different report. */
  async bind(id: string, reportId: string): Promise<boolean> {
    const rec = await this.get(id);
    if (!rec) return false;
    if (rec.reportId && rec.reportId !== reportId) return false;
    rec.reportId = reportId;
    await this.put(rec, null, null);
    return true;
  }
}
