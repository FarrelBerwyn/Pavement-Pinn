import type { Request, Response, Router } from "express";
import { WORKFLOW_API_PATHS } from "../../src/types";
import { isOfficialRole } from "../../src/domain/access";
import { assessSegment, type AssessmentInputs } from "../../src/domain/intelligence/assessment";
import { explainAssessment } from "../../src/domain/intelligence/explain";
import { runWhatIf } from "../../src/domain/intelligence/whatIf";
import { buildRoadStory } from "../../src/domain/intelligence/roadStory";
import { rateLimit } from "../middleware/rateLimit";
import type { WorkflowRuntime } from "../services/workflowRuntime";
import { actorFrom } from "../auth/actor";
import { ALL_SEGMENTS, segmentById } from "../services/segments";

/** What-If runs are kept in memory for the Road Story; they are SIMULATED and not persisted. */
const MAX_SIMULATIONS_PER_SEGMENT = 20;

export const ASSESSMENT_PATH = "/api/road-segments/:id/assessment";
export const SIMULATIONS_PATH = "/api/simulations";

const SCENARIO_KEYS: Array<keyof AssessmentInputs> = [
  "axleLoadTon",
  "rainIntensityMmHr",
  "floodDurationHours",
  "surfaceTemperatureC",
  "subgradeCbrPercent",
  "asphaltThicknessCm",
  "asphaltModulusMpa"
];

export function registerIntelligenceRoutes(router: Router, runtime: WorkflowRuntime): void {
  const simulations = new Map<string, Array<{ at: string; summary: string }>>();
  const simulateLimit = rateLimit("what-if", 60, 60_000);

  router.get(WORKFLOW_API_PATHS.riskMap, async (_req: Request, res: Response) => {
    await runtime.ready;
    const now = new Date().toISOString();
    const cases = await runtime.service.listCases();
    const items = ALL_SEGMENTS.map((segment) => {
      const a = assessSegment(segment, { now, cases });
      return {
        segmentId: segment.id,
        name: segment.name,
        pilot: !!segment.pilot,
        risk: a.risk,
        conditionScorePrototype: a.outputs.conditionScorePrototype,
        confidence: a.confidence,
        engine: a.engine,
        validationStatus: a.validationStatus,
        openReports: cases.filter((c) => c.segmentId === segment.id && c.state !== "CLOSED" && c.state !== "RESOLVED").length,
        attributeStatus: segment.attributeStatus ?? "SYNTHETIC",
        geometryStatus: segment.geometryStatus ?? "ILLUSTRATIVE"
      };
    });
    res.json({ success: true, generatedAt: now, dataStatus: "RULE_BASED estimates on SYNTHETIC/DEMO inputs", items });
  });

  router.get(ASSESSMENT_PATH, async (req: Request, res: Response) => {
    await runtime.ready;
    const segment = segmentById(req.params.id);
    if (!segment) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Unknown road segment." } });
    const cases = await runtime.service.listCases();
    const assessment = assessSegment(segment, { now: new Date().toISOString(), cases });
    res.json({ success: true, assessment, explanation: explainAssessment(assessment, cases) });
  });

  router.get(WORKFLOW_API_PATHS.roadStory, async (req: Request, res: Response) => {
    await runtime.ready;
    const segment = segmentById(req.params.id);
    if (!segment) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Unknown road segment." } });
    const actor = actorFrom(req, runtime);
    const audience = actor && actor.role !== "SYSTEM" && isOfficialRole(actor.role) ? "STAFF" : "PUBLIC";
    const cases = await runtime.service.listCases();
    const assessment = assessSegment(segment, { now: new Date().toISOString(), cases });
    const story = buildRoadStory(segment.id, cases, [assessment], simulations.get(segment.id) ?? [], audience);
    res.json({ success: true, segmentId: segment.id, audience, story, note: "Historical condition data is not yet available (DATA REQUIRED); the story starts with the records in this system." });
  });

  router.post(SIMULATIONS_PATH, simulateLimit, async (req: Request, res: Response) => {
    await runtime.ready;
    const segment = segmentById(String(req.body?.segmentId ?? ""));
    if (!segment) return res.status(400).json({ success: false, error: { code: "VALIDATION", message: "segmentId must be a known road segment." } });
    const raw = req.body?.scenario ?? {};
    const scenario: Partial<AssessmentInputs> = {};
    for (const key of SCENARIO_KEYS) {
      const v = raw[key];
      if (v === undefined) continue;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1000) {
        return res.status(400).json({ success: false, error: { code: "VALIDATION", message: `${key} must be a non-negative number.` } });
      }
      scenario[key] = v;
    }
    const cases = await runtime.service.listCases();
    const result = runWhatIf(segment, scenario, { now: new Date().toISOString(), cases });
    const list = simulations.get(segment.id) ?? [];
    list.push({ at: new Date().toISOString(), summary: result.explanation });
    simulations.set(segment.id, list.slice(-MAX_SIMULATIONS_PER_SEGMENT));
    res.json({ success: true, result });
  });
}
