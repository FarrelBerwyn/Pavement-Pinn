/**
 * Conversion of the app's road and report records to GeoJSON for the MapLibre map.
 *
 * The datasets store positions as [latitude, longitude]; GeoJSON and MapLibre use
 * [longitude, latitude]. Every conversion goes through `toLngLat` so the order is swapped
 * in exactly one place.
 */
import type { DamageReport, RoadConditionCategory, RoadSegment } from '../../types';

export type LngLat = [number, number];

export const CONDITION_COLOR: Record<RoadConditionCategory, string> = {
  GOOD: '#57ae78',
  MODERATE: '#e8b23a',
  LIGHT_DAMAGE: '#e2823d',
  HEAVY_DAMAGE: '#d9655d'
};

export const SEVERITY_COLOR: Record<DamageReport['severity'], string> = {
  CRITICAL: '#d9655d',
  SEVERE: '#e2823d',
  MODERATE: '#e8b23a',
  LIGHT: '#57ae78'
};

export function toLngLat([lat, lng]: [number, number]): LngLat {
  return [lng, lat];
}

interface Feature<G, P> {
  type: 'Feature';
  id?: string | number;
  geometry: G;
  properties: P;
}

export interface FeatureCollection<G, P> {
  type: 'FeatureCollection';
  features: Feature<G, P>[];
}

export type SegmentCollection = FeatureCollection<
  { type: 'LineString'; coordinates: LngLat[] },
  { id: string; name: string; color: string; condition: RoadConditionCategory }
>;

export type ReportCollection = FeatureCollection<
  { type: 'Point'; coordinates: LngLat },
  { id: string; severity: DamageReport['severity'] }
>;

/** Segments with fewer than two points have no line to draw and are left out. */
export function segmentsToGeoJson(segments: RoadSegment[]): SegmentCollection {
  return {
    type: 'FeatureCollection',
    features: segments
      .filter((segment) => segment.polyline.length > 1)
      .map((segment) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: segment.polyline.map(toLngLat) },
        properties: {
          id: segment.id,
          name: segment.name,
          color: CONDITION_COLOR[segment.conditionCategory],
          condition: segment.conditionCategory
        }
      }))
  };
}

export function reportsToGeoJson(reports: DamageReport[]): ReportCollection {
  return {
    type: 'FeatureCollection',
    features: reports.map((report) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: toLngLat(report.coordinates) },
      properties: { id: report.id, severity: report.severity }
    }))
  };
}

/** [[west, south], [east, north]] for MapLibre's fitBounds, from [lat, lng] points. */
export function lngLatBounds(points: [number, number][]): [LngLat, LngLat] | null {
  if (points.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lat, lng] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north]
  ];
}
