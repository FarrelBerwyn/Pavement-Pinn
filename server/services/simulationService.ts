import { runPinnSimulation } from "../../src/engines/pinn/core/pinnEngine";
import { SimulationParams, SimulationResult } from "../../src/types";
import { roadSegmentRepository } from "../repositories/roadSegmentRepository";

/** Segment id used when the request omits one (kept from the original server). */
const DEFAULT_SEGMENT_ID = "PANTURA-KM62";

/**
 * Runs the PINN engine for the requested segment. Throws a TypeError when `params`
 * is undefined — the controller maps that to the documented HTTP 500 response.
 */
export function simulate(params: SimulationParams): SimulationResult {
  const segmentId = params.segmentId || DEFAULT_SEGMENT_ID;
  const roadSegment = roadSegmentRepository.findByIdOrDefault(segmentId);
  return runPinnSimulation(params, roadSegment);
}
