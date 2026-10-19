import { INDONESIAN_ROAD_SEGMENTS } from "../../src/data/reference/indonesianRoads";
import { KARAWANG_PILOT_SEGMENTS } from "../../src/data/reference/karawangPilot";
import { BEKASI_CORRIDOR_SEGMENTS } from "../../src/data/reference/bekasiCorridor";
import { RoadSegment } from "../../src/types";

const ALL_ROAD_SEGMENTS: RoadSegment[] = [
  ...KARAWANG_PILOT_SEGMENTS,
  ...BEKASI_CORRIDOR_SEGMENTS,
  ...INDONESIAN_ROAD_SEGMENTS
];

/**
 * Read-only access to the static road-segment reference dataset.
 *
 * There is NO database in this project: the dataset is a TypeScript module bundled
 * with the server, and nothing is persisted. This repository is the single seam where
 * a real data store would be introduced.
 */
export const roadSegmentRepository = {
  findAll(options?: { all?: boolean }): RoadSegment[] {
    if (options?.all) return ALL_ROAD_SEGMENTS;
    return INDONESIAN_ROAD_SEGMENTS;
  },

  getAll(): RoadSegment[] {
    return ALL_ROAD_SEGMENTS;
  },

  /** Unknown ids fall back to the first segment (pre-restructure behaviour). */
  findByIdOrDefault(segmentId: string): RoadSegment {
    return ALL_ROAD_SEGMENTS.find((r) => r.id === segmentId) || ALL_ROAD_SEGMENTS[0];
  }
};

