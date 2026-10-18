import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Which code this server process runs. Node does not reload server code, so a process
 * started before a commit (or before an edit to server/workflow code) keeps the old rules
 * and the old storage logic while the browser already gets the new frontend. The health
 * endpoint reports this so the UI can warn instead of looking "in sync".
 */
const WATCHED = ["server", path.join("src", "domain")];

function gitHead(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/** Newest modification time of the server and domain sources (what this process loaded). */
function sourceStamp(): number {
  let newest = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) newest = Math.max(newest, statSync(full).mtimeMs);
    }
  };
  for (const dir of WATCHED) {
    try {
      walk(dir);
    } catch {
      /* missing directory: ignore */
    }
  }
  return newest;
}

const started = { at: new Date().toISOString(), commit: gitHead(), sourceStamp: sourceStamp() };

export interface CodeVersion {
  pid: number;
  startedAt: string;
  /** Commit checked out when this process started. */
  commit: string | null;
  /** Commit checked out now. */
  currentCommit: string | null;
  /**
   * True when server/domain source files changed after this process started (an edit, or a
   * checkout/merge that rewrote them). A commit alone changes no file, so it is not "stale".
   */
  stale: boolean;
}

export function codeVersion(): CodeVersion {
  const currentCommit = gitHead();
  const stale = sourceStamp() > started.sourceStamp;
  return { pid: process.pid, startedAt: started.at, commit: started.commit, currentCommit, stale };
}
