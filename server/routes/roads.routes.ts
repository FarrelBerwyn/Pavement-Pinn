import type { Router } from "express";
import { API_PATHS } from "../../src/types";
import { listRoads } from "../controllers/roadsController";

/** Road-segment reference data (static dataset, read-only). */
export function registerRoadsRoutes(router: Router): void {
  router.get(API_PATHS.roads, listRoads);
}
