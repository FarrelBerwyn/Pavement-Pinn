import { randomUUID } from "node:crypto";
import { MemoryCaseStore, WorkflowService, type CaseStore } from "../../src/domain/workflow/service";
import { DEMO_CV_PROVIDER } from "../../src/domain/workflow/screening";
import { USER_ACCOUNTS } from "../../src/data/reference/demoAccounts";
import { INITIAL_COMMUNITY_REPORTS } from "../../src/data/mock/communityReports";
import type { UserRole } from "../../src/types";
import { SessionSigner } from "../auth/sessionTokens";

/** Everything the workflow routes need, assembled once per app. */
export interface WorkflowRuntime {
  service: WorkflowService;
  signer: SessionSigner;
  demoAuthEnabled: boolean;
  storeKind: "memory" | "file";
  storeLocation: string | null;
  ready: Promise<void>;
}

export function roleOfDemoAccount(accountId: string): UserRole | null {
  return USER_ACCOUNTS.find((a) => a.id === accountId)?.role ?? null;
}

export function createWorkflowRuntime(options: {
  store?: CaseStore;
  storeKind?: "memory" | "file";
  storeLocation?: string | null;
  sessionSecret?: string;
  demoAuthEnabled?: boolean;
  seed?: boolean;
} = {}): WorkflowRuntime {
  const store = options.store ?? new MemoryCaseStore();
  const service = new WorkflowService(store, {
    now: () => new Date().toISOString(),
    newId: (prefix) => `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`,
    roleOf: roleOfDemoAccount,
    cv: DEMO_CV_PROVIDER
  });
  const ready = options.seed === false ? Promise.resolve() : service.ensureSeeded(INITIAL_COMMUNITY_REPORTS).then(() => undefined);
  return {
    service,
    signer: new SessionSigner(options.sessionSecret),
    demoAuthEnabled: options.demoAuthEnabled ?? true,
    storeKind: options.storeKind ?? (options.store ? "file" : "memory"),
    storeLocation: options.storeLocation ?? null,
    ready
  };
}
