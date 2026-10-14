import type { Request, Response } from "express";
import { getGeminiClient } from "../integrations/geminiClient";
import { generateNarrative } from "../services/narrativeService";

/**
 * POST /api/generate-narrative — body: { role, simulationData }.
 * Always answers 200 { success: true, narrative, source }; `source` tells the caller
 * whether Gemini or the offline rule-engine text was used.
 */
export async function postGenerateNarrative(req: Request, res: Response): Promise<void> {
  const { role, simulationData } = req.body;
  const { narrative, source } = await generateNarrative(role, simulationData, getGeminiClient());
  res.json({ success: true, narrative, source });
}
