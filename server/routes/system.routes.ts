import type { Request, Response, Router } from "express";
import { WORKFLOW_API_PATHS } from "../../src/types";
import { DEMO_CV_PROVIDER } from "../../src/domain/workflow/screening";
import { isGeminiConfigured } from "../integrations/gemini/geminiClient";
import type { WorkflowRuntime } from "../services/workflowRuntime";

/**
 * GET /api/system-health — which parts of the system are actually live, by component.
 * States are reported as found, never upgraded: a demo or missing component says so.
 */
export function registerSystemRoutes(router: Router, runtime: WorkflowRuntime): void {
  router.get(WORKFLOW_API_PATHS.systemHealth, async (_req: Request, res: Response) => {
    let storage: { status: "ok" | "error"; kind: string; detail: string };
    try {
      await runtime.ready;
      const n = (await runtime.service.listCases()).length;
      storage = {
        status: "ok",
        kind: runtime.storeKind === "file" ? "LOCAL_FILE (development/demo store)" : "MEMORY (not persisted)",
        detail: `${n} report cases`
      };
    } catch (error) {
      storage = { status: "error", kind: runtime.storeKind, detail: (error as Error).message };
    }
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      application: { status: "ok" },
      storage,
      cloudDatabase: { status: "NOT_CONFIGURED", detail: "Supabase PostgreSQL schema exists in supabase/migrations; no credentials configured." },
      objectStorage: { status: "NOT_CONFIGURED", detail: "Photos are kept inside report records (base64, max 5 MB)." },
      authentication: { status: runtime.demoAuthEnabled ? "DEMO" : "DISABLED", detail: "Server-signed demo sessions; no identity provider configured." },
      ai: {
        computerVision: { status: DEMO_CV_PROVIDER.status, modelVersion: DEMO_CV_PROVIDER.modelVersion },
        pinn: { status: "RULE_BASED", detail: "Deterministic formula in src/engines/pinn; no trained PINN weights." },
        openvino: { status: "NOT_CONFIGURED", detail: "No OpenVINO runtime or IR model in this deployment; export endpoints return illustrative artifacts." },
        narrative: { status: isGeminiConfigured() ? "CONFIGURED" : "OFFLINE_RULE_ENGINE" }
      },
      externalIntegrations: {
        weather: { status: "NOT_CONFIGURED", fallback: "DEMO data, labelled" },
        traffic: { status: "NOT_CONFIGURED", fallback: "INFERRED from segment attributes, labelled" },
        wim: { status: "NOT_AVAILABLE", fallback: "WIM DATA NOT AVAILABLE; bundled WIM records are SIMULATED" }
      }
    });
  });
}
