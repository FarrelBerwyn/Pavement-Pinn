import type { RoadSegment } from "../../src/types";
import { INDONESIAN_ROAD_SEGMENTS } from "../../src/data/reference/indonesianRoads";
import { KARAWANG_PILOT_SEGMENTS } from "../../src/data/reference/karawangPilot";

/** Pilot corridor first (spec §6.0 default map), then the legacy national demo segments. */
export const ALL_SEGMENTS: RoadSegment[] = [...KARAWANG_PILOT_SEGMENTS, ...INDONESIAN_ROAD_SEGMENTS];

export function segmentById(id: string): RoadSegment | undefined {
  return ALL_SEGMENTS.find((s) => s.id === id);
}
