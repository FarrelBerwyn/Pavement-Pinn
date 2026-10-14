import type { Router } from "express";
import { API_PATHS } from "../../src/types";
import { postGenerateNarrative } from "../controllers/narrativeController";

/** Role-specific narrative (Gemini with offline fallback). */
export function registerNarrativeRoutes(router: Router): void {
  router.post(API_PATHS.generateNarrative, postGenerateNarrative);
}
