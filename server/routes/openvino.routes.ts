import type { Router } from "express";
import { API_PATHS } from "../../src/types";
import { exportConfig, exportIr } from "../controllers/openvinoController";

/** OpenVINO export downloads (illustrative artifacts, see the API inventory). */
export function registerOpenvinoRoutes(router: Router): void {
  router.get(API_PATHS.openvinoExportIr, exportIr);
  router.get(API_PATHS.openvinoExportConfig, exportConfig);
}
