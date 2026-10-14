import type { Request } from "express";
import type { Actor } from "../../src/domain/workflow/model";
import type { WorkflowRuntime } from "../services/workflowRuntime";

/** The actor for this request, from the server-signed bearer token; null when absent or invalid. */
export function actorFrom(req: Request, runtime: WorkflowRuntime): Actor | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return runtime.signer.verify(header.slice(7).trim());
}
