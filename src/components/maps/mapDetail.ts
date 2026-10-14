/**
 * Zoom-dependent detail for the public map: which kinds of object are drawn at a zoom
 * level, how report markers are grouped, and which objects lie inside the viewport.
 *
 * Pure module (no Leaflet import). Grouping works in screen pixels of the standard web
 * map projection, so markers split apart as the user zooms in and merge when zooming
 * out, without per-zoom tables.
 */

export type LatLng = [number, number];

/** South-west and north-east corners. */
export type LatLngBounds = [LatLng, LatLng];

export type DetailLevel = 'AREA' | 'CORRIDOR' | 'OBJECT';

/**
 * Thresholds calibrated on the bundled segments (roughly 5 to 10 km long): below zoom 10
 * a segment is shorter than about 25 px and cannot be read as a line; from zoom 13 the
 * individual report pins (60 px) no longer overlap along one segment.
 */
export const SEGMENT_LINE_MIN_ZOOM = 10;
export const SEGMENT_PIN_MIN_ZOOM = 11;
export const OBJECT_MIN_ZOOM = 13;

/** Reports closer than this on screen are drawn as one count marker. */
export const REPORT_CLUSTER_RADIUS_PX = 46;
/** From this zoom on every report is drawn individually, however close they are. */
export const CLUSTER_MAX_ZOOM = 16;

/**
 * Lowest zoom at which the world is at least as tall as the map. The whole world is one
 * 256 px tile at zoom 0, so on a taller map anything below this zoom shows the world as a
 * strip with empty space above and below it.
 */
export function minZoomForViewportHeight(heightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 256) return 0;
  return Math.ceil(Math.log2(heightPx / 256));
}

export function detailLevelForZoom(zoom: number): DetailLevel {
  if (zoom < SEGMENT_LINE_MIN_ZOOM) return 'AREA';
  if (zoom < OBJECT_MIN_ZOOM) return 'CORRIDOR';
  return 'OBJECT';
}

/** Web-Mercator pixel position of a coordinate at a zoom level (256 px tiles). */
export function projectToPixels([lat, lng]: LatLng, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  };
}

export interface PointCluster<T> {
  /** Mean position of the members. */
  center: LatLng;
  items: T[];
}

/**
 * Greedy grouping in input order: an item joins the first cluster whose seed is within
 * `radiusPx`, otherwise it starts a new one. The result is deterministic for a given
 * input order, and every item ends up in exactly one cluster.
 */
export function clusterByPixelDistance<T>(
  items: T[],
  getLatLng: (item: T) => LatLng,
  zoom: number,
  radiusPx: number = REPORT_CLUSTER_RADIUS_PX
): PointCluster<T>[] {
  if (zoom >= CLUSTER_MAX_ZOOM) {
    return items.map((item) => ({ center: getLatLng(item), items: [item] }));
  }

  const groups: { seed: { x: number; y: number }; items: T[] }[] = [];
  for (const item of items) {
    const point = projectToPixels(getLatLng(item), zoom);
    const group = groups.find((g) => Math.hypot(g.seed.x - point.x, g.seed.y - point.y) <= radiusPx);
    if (group) group.items.push(item);
    else groups.push({ seed: point, items: [item] });
  }

  return groups.map((group) => {
    const sum = group.items.reduce(
      (acc, item) => {
        const [lat, lng] = getLatLng(item);
        return [acc[0] + lat, acc[1] + lng] as LatLng;
      },
      [0, 0] as LatLng
    );
    return { center: [sum[0] / group.items.length, sum[1] / group.items.length], items: group.items };
  });
}

export function isInBounds([lat, lng]: LatLng, [[south, west], [north, east]]: LatLngBounds): boolean {
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

/** Items inside the viewport; with no viewport known yet, nothing is claimed to be "in view". */
export function itemsInBounds<T>(items: T[], getLatLng: (item: T) => LatLng, bounds: LatLngBounds | null): T[] {
  if (!bounds) return [];
  return items.filter((item) => isInBounds(getLatLng(item), bounds));
}

/** Smallest box containing all coordinates (used to zoom into a cluster). */
export function boundsOf(points: LatLng[]): LatLngBounds | null {
  if (points.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const [lat, lng] of points) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }
  return [
    [south, west],
    [north, east]
  ];
}
