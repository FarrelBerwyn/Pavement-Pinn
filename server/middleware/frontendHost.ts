import express, { Express } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import type { ServerConfig } from "../config/env";

/**
 * Attaches whatever serves the SPA, AFTER the API routes:
 *  - development: Vite in middleware mode (HMR, SPA fallback) — unchanged workflow;
 *  - production:  the static `dist/` build plus an index.html fallback so client-side
 *                 routes (deep links, refresh) resolve.
 */
export async function attachFrontendHost(app: Express, config: ServerConfig): Promise<void> {
  if (!config.isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    return;
  }

  const distPath = path.join(process.cwd(), "dist");
  // The bundle references its assets under the Vite base path (e.g. /PavementPinn/assets/...),
  // so the build must be reachable there; the root mount is kept for backwards compatibility.
  if (config.basePath !== "/") {
    app.use(config.basePath, express.static(distPath));
  }
  app.use(express.static(distPath));
  app.get("*", function sendSpaIndex(_req, res) {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
