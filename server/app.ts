import express, { Express } from "express";
import { createApiRouter } from "./routes";

/**
 * Assembles the Express application: body parsing first, then the API routes.
 * The frontend host (Vite dev middleware or the static build) is attached afterwards
 * by server/index.ts, so this function has no side effects and is safe to use in tests.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(createApiRouter());

  return app;
}
