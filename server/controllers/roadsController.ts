import type { Request, Response } from "express";
import { roadSegmentRepository } from "../repositories/roadSegmentRepository";

export function listRoads(_req: Request, res: Response): void {
  res.json(roadSegmentRepository.findAll());
}
