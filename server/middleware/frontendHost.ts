import express, { Express } from "express";
import type { Server } from "node:http";
import path from "path";
import { createServer as createViteServer } from "vite";
import type { ServerConfig } from "../config/env";

/**
 * Attaches whatever serves the SPA, AFTER the API routes:
 *  - development: Vite in middleware mode (HMR, SPA fallback) — unchanged workflow;
 *  - production:  the static `dist/` build plus an index.html fallback so client-side
 *                 routes (deep links, refresh) resolve.
 */
/** Returns how to stop what was attached (the Vite dev server and its file watcher), if anything. */
export async function attachFrontendHost(app: Express, config: ServerConfig, httpServer?: Server): Promise<() => Promise<void>> {
  if (!config.isProduction) {
    const vite = await createViteServer({
      // HMR on this process's own HTTP server (same host:port as the page), not a shared ws port.
      server: { middlewareMode: true, hmr: httpServer && process.env.DISABLE_HMR !== "true" ? { server: httpServer } : undefined,
        // Workflow stores (.data, --independent dirs) change at runtime; they are data, not source.
        ...(process.env.DISABLE_HMR === "true" ? {} : { watch: { ignored: ["**/.data*/**"] } })
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    return () => vite.close();
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
  return async () => undefined;
}
