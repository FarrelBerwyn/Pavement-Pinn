import { INDONESIAN_ROAD_SEGMENTS } from "../../src/data/reference/indonesianRoads";
import { RoadSegment } from "../../src/types";

/**
 * Read-only access to the static road-segment reference dataset.
 *
 * There is NO database in this project: the dataset is a TypeScript module bundled
 * with the server, and nothing is persisted. This repository is the single seam where
 * a real data store would be introduced.
 */
export const roadSegmentRepository = {
  findAll(): RoadSegment[] {
    return INDONESIAN_ROAD_SEGMENTS;
  },

  /** Unknown ids fall back to the first segment (pre-restructure behaviour). */
  findByIdOrDefault(segmentId: string): RoadSegment {
    return INDONESIAN_ROAD_SEGMENTS.find((r) => r.id === segmentId) || INDONESIAN_ROAD_SEGMENTS[0];
  }
};
