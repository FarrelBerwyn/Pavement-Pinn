/**
 * Conversion of the app's road and report records to GeoJSON for the MapLibre map.
 *
 * The datasets store positions as [latitude, longitude]; GeoJSON and MapLibre use
 * [longitude, latitude]. Every conversion goes through `toLngLat` so the order is swapped
 * in exactly one place.
 */
import type { DamageReport, RoadConditionCategory, RoadSegment } from '../../types';
import { getCanonicalRoadGeometry } from '../../domain/geo/canonicalRoadGeometry';

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
  {
    id: string;
    name: string;
    color: string;
    condition: RoadConditionCategory;
    geometrySource?: string;
    geometryStatus?: string;
  }
>;

export type ReportCollection = FeatureCollection<
  { type: 'Point'; coordinates: LngLat },
  { id: string; severity: DamageReport['severity'] }
>;

export function segmentsToGeoJson(segments: RoadSegment[]): SegmentCollection {
  return {
    type: 'FeatureCollection',
    features: segments
      .filter((segment) => {
        const canonical = getCanonicalRoadGeometry(segment.id);
        const ptCount = canonical?.geometry.coordinates.length ?? segment.geometry?.coordinates?.length ?? segment.polyline.length;
        return ptCount > 1;
      })
      .map((segment) => {
        const canonical = getCanonicalRoadGeometry(segment.id);
        const coordinates: LngLat[] =
          canonical && canonical.geometry.coordinates.length > 1
            ? (canonical.geometry.coordinates as unknown as LngLat[])
            : segment.geometry && segment.geometry.coordinates.length > 1
            ? (segment.geometry.coordinates as LngLat[])
            : segment.polyline.map(toLngLat);
        return {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: {
            id: segment.id,
            name: segment.name,
            color: CONDITION_COLOR[segment.conditionCategory],
            condition: segment.conditionCategory,
            geometrySource: canonical?.geometrySource ?? segment.geometrySource,
            geometryStatus: canonical?.geometryStatus ?? segment.geometryStatus
          }
        };
      })
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
