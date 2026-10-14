import type { Router } from "express";
import { API_PATHS } from "../../src/types";
import { getHealth } from "../controllers/healthController";

/** Liveness probe. */
export function registerHealthRoutes(router: Router): void {
  router.get(API_PATHS.health, getHealth);
}
