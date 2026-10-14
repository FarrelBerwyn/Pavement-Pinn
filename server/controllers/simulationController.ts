import type { Request, Response } from "express";
import type { SimulationParams } from "../../src/types";
import { simulate } from "../services/simulationService";

/**
 * POST /api/simulate — body: { params: SimulationParams }.
 * No input validation is performed (pre-restructure contract): a missing `params`
 * surfaces as HTTP 500 with the runtime error message.
 */
export function postSimulate(req: Request, res: Response): void {
  try {
    const params: SimulationParams = req.body.params;
    const result = simulate(params);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Simulation error" });
  }
}
