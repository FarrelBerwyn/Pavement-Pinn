import { Router, type Request, type Response } from "express";
import { registerHealthRoutes } from "./health.routes";
import { registerRoadsRoutes } from "./roads.routes";
import { registerPinnRoutes } from "./pinn.routes";
import { registerOpenvinoRoutes } from "./openvino.routes";
import { registerNarrativeRoutes } from "./narrative.routes";

/**
 * All HTTP API routes. Paths are the pre-restructure paths, taken from the shared
 * API_PATHS contract so server and client cannot drift apart.
 *
 * There is no authentication or authorization on any endpoint — see
 * docs/api/API_INVENTORY.md and docs/architecture/RBAC_MATRIX.md.
 */
export function createApiRouter(): Router {
  const router = Router();

  // Same registration order as before the split.
  registerHealthRoutes(router);
  registerRoadsRoutes(router);
  registerPinnRoutes(router);
  registerOpenvinoRoutes(router);
  registerNarrativeRoutes(router);

  // Anything else under /api is an API mistake, not a page: answer JSON 404 instead of
  // letting the request fall through to the SPA host (which replied with HTML, status 200).
  router.use("/api", function apiNotFound(_req: Request, res: Response) {
    res.status(404).json({ success: false, error: "Unknown API endpoint" });
  });

  return router;
}
