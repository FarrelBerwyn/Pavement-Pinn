/**
 * Location Selection & Road Resolution Domain Model
 *
 * Implements a single authoritative selection model with:
 * - Robust geospatial coordinate validation
 * - Geometric nearest-road lookup across polyline segments
 * - Perpendicular snapping to road polyline geometry
 * - Maximum search radius enforcement with honest status (NO_ROAD_FOUND)
 * - Asynchronous lifecycle tracking (IDLE, RESOLVING, RESOLVED, NO_ROAD_FOUND, ERROR)
 * - Request cancellation and race condition prevention (stale requests discarded)
 */

import type { RoadSegment } from '../../types';

export type ResolutionStatus =
  | 'IDLE'
  | 'RESOLVING'
  | 'RESOLVED'
  | 'NO_ROAD_FOUND'
  | 'AMBIGUOUS'
  | 'ERROR';

/** Explicit UI lifecycle state names conforming to standard naming */
export type SelectionState = 'loading' | 'matched' | 'not_found' | 'ambiguous' | 'error';

export function toSelectionState(status: ResolutionStatus): SelectionState {
  switch (status) {
    case 'RESOLVED':
      return 'matched';
    case 'NO_ROAD_FOUND':
      return 'not_found';
    case 'AMBIGUOUS':
      return 'ambiguous';
    case 'ERROR':
      return 'error';
    case 'RESOLVING':
    case 'IDLE':
    default:
      return 'loading';
  }
}

export interface LocationSelection {
  /** Unique identifier for this user selection action */
  readonly selectionId: string;
  /** Unique request token for the active resolution query */
  readonly requestId: string;
  /** Original picked coordinates [lat, lng] as source of truth */
  readonly coordinates: [number, number];
  /** Current resolution status */
  readonly status: ResolutionStatus;
  /** Explicit UI state name ('loading' | 'matched' | 'not_found' | 'ambiguous' | 'error') */
  readonly state: SelectionState;
  /** Matched road segment, or null if outside search radius / unresolved */
  readonly segment: RoadSegment | null;
  /** Segment ID if identified */
  readonly segmentId: string | null;
  /** Human-readable segment name if identified */
  readonly segmentName: string | null;
  /** Distance in meters from picked point to road geometry */
  readonly distanceMeters: number | null;
  /** Projected point on the nearest road polyline (kept distinct from user coordinates) */
  readonly snappedCoordinates: [number, number] | null;
  /** Whether multiple candidates were within the ambiguity threshold */
  readonly isAmbiguous?: boolean;
  /** Candidate road segments when ambiguous */
  readonly candidateSegments?: readonly RoadSegment[];
  /** Whether the original picked coordinate is a valid geographic coordinate */
  readonly isValid: boolean;
  /** Timestamp when resolution completed */
  readonly resolvedAt?: number;
  /** Human-readable error message if status is ERROR */
  readonly errorMessage?: string;
}

export interface NearestRoadLookupResult {
  segment: RoadSegment | null;
  distanceMeters: number | null;
  snappedCoordinates: [number, number] | null;
  isAmbiguous?: boolean;
  candidateSegments?: RoadSegment[];
}

/** Default search radius: 10 km (10,000 meters) */
export const DEFAULT_ROAD_SEARCH_RADIUS_METERS = 10_000;

/** Default distance threshold to consider a pin on or immediately adjacent to a road: 1 km (1,000 meters) */
export const DEFAULT_ROAD_MATCH_THRESHOLD_METERS = 1_000;

/** Difference in meters between candidate roads to classify as ambiguous */
export const DEFAULT_AMBIGUITY_DELTA_METERS = 25;

const EARTH_RADIUS_METERS = 6371000;
const DEG_TO_RAD = Math.PI / 180;

/** Validates that input is a valid finite [lat, lng] geographic coordinate */
export function isValidCoordinate(coords: unknown): coords is [number, number] {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lat, lng] = coords;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Haversine distance in meters between two [lat, lng] points */
export function haversineDistanceMeters(
  a: readonly [number, number],
  b: readonly [number, number]
): number {
  const dLat = (b[0] - a[0]) * DEG_TO_RAD;
  const dLng = (b[1] - a[1]) * DEG_TO_RAD;
  const lat1 = a[0] * DEG_TO_RAD;
  const lat2 = b[0] * DEG_TO_RAD;

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Geometric distance from point Q to line segment AB in meters on local tangent plane.
 * Returns the distance and the snapped [lat, lng] on segment AB.
 */
function projectPointToLineSegment(
  q: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number]
): { distanceMeters: number; snapped: [number, number] } {
  const latMid = ((a[0] + b[0]) / 2) * DEG_TO_RAD;
  const cosLat = Math.cos(latMid);

  const dxB = (b[1] - a[1]) * DEG_TO_RAD * EARTH_RADIUS_METERS * cosLat;
  const dyB = (b[0] - a[0]) * DEG_TO_RAD * EARTH_RADIUS_METERS;

  const dxQ = (q[1] - a[1]) * DEG_TO_RAD * EARTH_RADIUS_METERS * cosLat;
  const dyQ = (q[0] - a[0]) * DEG_TO_RAD * EARTH_RADIUS_METERS;

  const lenSq = dxB * dxB + dyB * dyB;

  if (lenSq < 1e-8) {
    const d = Math.hypot(dxQ, dyQ);
    return { distanceMeters: d, snapped: [a[0], a[1]] };
  }

  const t = Math.max(0, Math.min(1, (dxQ * dxB + dyQ * dyB) / lenSq));
  const projX = t * dxB;
  const projY = t * dyB;
  const distanceMeters = Math.hypot(dxQ - projX, dyQ - projY);

  const snappedLat = a[0] + (b[0] - a[0]) * t;
  const snappedLng = a[1] + (b[1] - a[1]) * t;

  return {
    distanceMeters,
    snapped: [Number(snappedLat.toFixed(6)), Number(snappedLng.toFixed(6))]
  };
}

/**
 * Calculates distance from point to a polyline by projecting onto each segment.
 */
function distanceToPolyline(
  point: readonly [number, number],
  polyline: readonly [number, number][]
): { distanceMeters: number; snapped: [number, number] } {
  if (polyline.length === 0) {
    return { distanceMeters: Infinity, snapped: [point[0], point[1]] };
  }
  if (polyline.length === 1) {
    const d = haversineDistanceMeters(point, polyline[0]);
    return { distanceMeters: d, snapped: [polyline[0][0], polyline[0][1]] };
  }

  let bestDist = Infinity;
  let bestSnapped: [number, number] = [polyline[0][0], polyline[0][1]];

  for (let i = 0; i < polyline.length - 1; i++) {
    const { distanceMeters, snapped } = projectPointToLineSegment(
      point,
      polyline[i],
      polyline[i + 1]
    );
    if (distanceMeters < bestDist) {
      bestDist = distanceMeters;
      bestSnapped = snapped;
    }
  }

  return { distanceMeters: bestDist, snapped: bestSnapped };
}

/**
 * Finds the nearest road segment to the given point by evaluating its polyline geometry.
 * Enforces max search radius: returns null segment if beyond search radius.
 */
export function findNearestRoadGeometry(
  point: readonly [number, number],
  segments: readonly RoadSegment[],
  maxRadiusMeters: number = DEFAULT_ROAD_SEARCH_RADIUS_METERS,
  ambiguityDeltaMeters: number = DEFAULT_AMBIGUITY_DELTA_METERS
): NearestRoadLookupResult {
  if (!isValidCoordinate(point) || !segments || segments.length === 0) {
    return { segment: null, distanceMeters: null, snappedCoordinates: null, isAmbiguous: false, candidateSegments: [] };
  }

  const results: Array<{
    segment: RoadSegment;
    distanceMeters: number;
    snapped: [number, number];
  }> = [];

  for (const s of segments) {
    const vertices =
      Array.isArray(s.polyline) && s.polyline.length > 0
        ? s.polyline
        : [s.coordinates];

    const { distanceMeters, snapped } = distanceToPolyline(point, vertices);
    if (Number.isFinite(distanceMeters)) {
      results.push({
        segment: s,
        distanceMeters,
        snapped
      });
    }
  }

  if (results.length === 0) {
    return { segment: null, distanceMeters: null, snappedCoordinates: null, isAmbiguous: false, candidateSegments: [] };
  }

  results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const best = results[0];

  if (best.distanceMeters <= maxRadiusMeters) {
    const candidates = results.filter(
      r => r.distanceMeters <= maxRadiusMeters &&
           Math.abs(r.distanceMeters - best.distanceMeters) <= ambiguityDeltaMeters
    );
    const isAmbiguous = candidates.length > 1;

    return {
      segment: best.segment,
      distanceMeters: Math.round(best.distanceMeters),
      snappedCoordinates: best.snapped,
      isAmbiguous,
      candidateSegments: candidates.map(c => c.segment)
    };
  }

  return {
    segment: null,
    distanceMeters: Math.round(best.distanceMeters),
    snappedCoordinates: null,
    isAmbiguous: false,
    candidateSegments: []
  };
}

let selectionCounter = 0;

/**
 * Factory for a new authoritative LocationSelection.
 * Immediately captures user coordinates as source of truth and initialises RESOLVING state.
 */
export function createLocationSelection(
  coords: [number, number],
  customIds?: { selectionId?: string; requestId?: string }
): LocationSelection {
  selectionCounter++;
  const valid = isValidCoordinate(coords);
  const now = Date.now();
  const sid = customIds?.selectionId || `sel_${now}_${selectionCounter}`;
  const rid = customIds?.requestId || `req_${now}_${selectionCounter}`;
  const [lat, lng] = coords;
  const status: ResolutionStatus = valid ? 'RESOLVING' : 'ERROR';

  return {
    selectionId: sid,
    requestId: rid,
    coordinates: [Number(lat.toFixed(6)), Number(lng.toFixed(6))],
    status,
    state: toSelectionState(status),
    segment: null,
    segmentId: null,
    segmentName: null,
    distanceMeters: null,
    snappedCoordinates: null,
    isValid: valid,
    errorMessage: valid ? undefined : 'Koordinat tidak valid'
  };
}

/**
 * Asynchronously resolves road corridor for a LocationSelection.
 * Honors AbortSignal and returns updated LocationSelection with exact resolution status.
 */
export async function resolveRoadSelection(
  selection: LocationSelection,
  segments: readonly RoadSegment[],
  options?: {
    maxRadiusMeters?: number;
    signal?: AbortSignal;
    delayMs?: number;
  }
): Promise<LocationSelection> {
  const signal = options?.signal;
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }

  if (options?.delayMs && options.delayMs > 0) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), options.delayMs);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  }

  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }

  if (!selection.isValid) {
    return {
      ...selection,
      status: 'ERROR',
      state: 'error',
      errorMessage: 'Koordinat tidak valid',
      resolvedAt: Date.now()
    };
  }

  const maxRadius = options?.maxRadiusMeters ?? DEFAULT_ROAD_SEARCH_RADIUS_METERS;
  const lookup = findNearestRoadGeometry(selection.coordinates, segments, maxRadius);

  if (lookup.segment) {
    const status: ResolutionStatus = lookup.isAmbiguous ? 'AMBIGUOUS' : 'RESOLVED';
    return {
      ...selection,
      status,
      state: toSelectionState(status),
      segment: lookup.segment,
      segmentId: lookup.segment.id,
      segmentName: lookup.segment.name,
      distanceMeters: lookup.distanceMeters,
      snappedCoordinates: lookup.snappedCoordinates,
      isAmbiguous: lookup.isAmbiguous,
      candidateSegments: lookup.candidateSegments,
      resolvedAt: Date.now()
    };
  }

  return {
    ...selection,
    status: 'NO_ROAD_FOUND',
    state: 'not_found',
    segment: null,
    segmentId: null,
    segmentName: null,
    distanceMeters: lookup.distanceMeters,
    snappedCoordinates: null,
    isAmbiguous: false,
    candidateSegments: [],
    resolvedAt: Date.now()
  };
}
