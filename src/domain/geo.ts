/** Small geographic helpers shared by the browser and the server. */
import type { DamageReport } from '../types';

/** True for a finite [lat, lng] pair inside the valid latitude/longitude ranges. */
export function hasValidCoordinates(report: Pick<DamageReport, 'coordinates'>): boolean {
  const coordinates = report.coordinates as unknown;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
  const [lat, lng] = coordinates;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
