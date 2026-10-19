import type { Request, Response } from "express";
import { roadSegmentRepository } from "../repositories/roadSegmentRepository";

export function listRoads(req: Request, res: Response): void {
  const all = req.query.all === 'true' || req.query.scope === 'all';
  res.json(roadSegmentRepository.findAll({ all }));
}

