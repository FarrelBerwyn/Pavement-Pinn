import type { Router } from "express";
import { API_PATHS } from "../../src/types";
import { postSimulate } from "../controllers/simulationController";

/** Pavement engine simulation. */
export function registerPinnRoutes(router: Router): void {
  router.post(API_PATHS.simulate, postSimulate);
}
