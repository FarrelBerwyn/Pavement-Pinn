import { Router, type Request, type Response } from "express";
import { API_PATHS } from "../../src/types";
import { getHealth } from "../controllers/healthController";
import { listRoads } from "../controllers/roadsController";
import { postSimulate } from "../controllers/simulationController";
import { exportConfig, exportIr } from "../controllers/openvinoController";
import { postGenerateNarrative } from "../controllers/narrativeController";

/**
 * All HTTP API routes. Paths are the pre-restructure paths, taken from the shared
 * API_PATHS contract so server and client cannot drift apart.
 *
 * There is no authentication or authorization on any endpoint — see
 * docs/api/API_INVENTORY.md and docs/architecture/RBAC_MATRIX.md.
 */
export function createApiRouter(): Router {
  const router = Router();

  router.get(API_PATHS.health, getHealth);
  router.get(API_PATHS.roads, listRoads);
  router.post(API_PATHS.simulate, postSimulate);
  router.get(API_PATHS.openvinoExportIr, exportIr);
  router.get(API_PATHS.openvinoExportConfig, exportConfig);
  router.post(API_PATHS.generateNarrative, postGenerateNarrative);

  // Anything else under /api is an API mistake, not a page: answer JSON 404 instead of
  // letting the request fall through to the SPA host (which replied with HTML, status 200).
  router.use("/api", function apiNotFound(_req: Request, res: Response) {
    res.status(404).json({ success: false, error: "Unknown API endpoint" });
  });

  return router;
}
