import express, { Express } from "express";
import { createApiRouter } from "./routes";
import { WORKFLOW_API_PATHS } from "../src/types";
import { createWorkflowRuntime, type WorkflowRuntime } from "./services/workflowRuntime";

export interface AppOptions {
  /** Workflow store, signer and settings. Defaults to an in-memory store (tests, quick starts). */
  workflow?: WorkflowRuntime;
}

/**
 * Assembles the Express application: body parsing first, then the API routes.
 * The frontend host (Vite dev middleware or the static build) is attached afterwards
 * by server/index.ts, so this function has no side effects and is safe to use in tests.
 */
export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const workflow = options.workflow ?? createWorkflowRuntime();

  app.disable("x-powered-by");
  app.use(function securityHeaders(_req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });
  // Report bodies may carry one photo (base64, max 5 MB decoded); every other route keeps the 100 kB default.
  app.use([WORKFLOW_API_PATHS.reports, WORKFLOW_API_PATHS.content, "/api/reports"], express.json({ limit: "7mb" }));
  app.use(express.json());
  app.use(createApiRouter(workflow));

  return app;
}
