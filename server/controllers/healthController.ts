import type { Request, Response } from "express";
import type { HealthResponse } from "../../src/types";
import { codeVersion } from "../runtime/codeVersion";

export function getHealth(_req: Request, res: Response): void {
  const body: HealthResponse = { status: "ok", appName: "PAVEMENT-PINN", timestamp: new Date().toISOString(), server: codeVersion() };
  res.json(body);
}
