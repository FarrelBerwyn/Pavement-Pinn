import type { Request, Response } from "express";
import type { HealthResponse } from "../../src/types";

export function getHealth(_req: Request, res: Response): void {
  const body: HealthResponse = { status: "ok", appName: "PAVEMENT-PINN", timestamp: new Date().toISOString() };
  res.json(body);
}
