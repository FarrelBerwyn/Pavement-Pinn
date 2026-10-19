import type { RoadSegment } from '../../types';
import { findNearestRoadGeometry } from './locationSelection';

export function nearestSegment(segments: readonly RoadSegment[], point: readonly [number, number]): RoadSegment | null {
  return findNearestRoadGeometry(point, segments, Infinity).segment;
}

