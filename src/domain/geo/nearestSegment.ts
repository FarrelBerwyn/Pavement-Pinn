/**
 * The road a reported point belongs to: the closest known segment to the real coordinates.
 * Never a default segment — the label, segment and map pin of a report must name one place.
 */
import type { RoadSegment } from '../../types';

export function nearestSegment(segments: readonly RoadSegment[], point: readonly [number, number]): RoadSegment | null {
  let best: RoadSegment | null = null;
  let bestD = Infinity;
  for (const s of segments) {
    const d = Math.hypot(s.coordinates[0] - point[0], s.coordinates[1] - point[1]);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}
