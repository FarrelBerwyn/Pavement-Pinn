/**
 * Unit & Integration Tests for Canonical Road Geometry & Map Synchronization
 *
 * Covers:
 * - Test A: Geometry follows basemap centerline (JLN-KRW-GALUHMAS curvature & roundabout)
 * - Test B: Marker coordinates intact & report matching to road segment
 * - Test C: Leaflet [lat, lng] & Globe 3D [lng, lat] GeoJSON synchronization
 * - Test D: Zoom-proportional line weight calibration
 * - Test E: Edge cases (invalid coordinates, out-of-bounds, unmapped points)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_ROAD_GEOMETRIES,
  getCanonicalRoadGeometry,
  getCanonicalLeafletPolyline,
  matchReportToRoadSegment,
  isValidLatLng,
  isValidLngLat,
  isValidLineString,
  toLeafletPolyline,
  toGeoJsonCoordinates,
  haversineDistanceMeters,
  distanceToPolyline,
  projectPointToLineSegment
} from '../../src/domain/geo/canonicalRoadGeometry';
import { segmentsToGeoJson } from '../../src/components/maps/mapGeoJson';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import type { RoadSegment } from '../../src/types';

test('Test A — Geometry follows road: JLN-KRW-GALUHMAS follows real OSM centerline', () => {
  const galuh = getCanonicalRoadGeometry('JLN-KRW-GALUHMAS');
  assert.ok(galuh !== null, 'JLN-KRW-GALUHMAS must exist in canonical registry');
  assert.equal(galuh.id, 'JLN-KRW-GALUHMAS');
  assert.equal(galuh.crs, 'EPSG:4326');
  assert.equal(galuh.geometrySource, 'OSM_CENTERLINE');
  assert.equal(galuh.validationStatus, 'VALID');
  assert.equal(galuh.geometryStatus, 'DIGITISED');

  const coords = galuh.geometry.coordinates;
  assert.ok(coords.length > 50, `Expected dense centerline (>50 pts), got ${coords.length}`);

  // RFC 7946: GeoJSON is strictly [longitude, latitude]
  for (const [lng, lat] of coords) {
    assert.ok(lng >= 107.28 && lng <= 107.32, `Longitude ${lng} must be in Karawang Barat range`);
    assert.ok(lat <= -6.30 && lat >= -6.34, `Latitude ${lat} must be in Karawang Barat range`);
  }

  // Verify non-linearity (curvature): Galuh Mas curves through Bundaran Galuh Mas (~ -6.319, 107.296)
  const hasRoundaboutCurve = coords.some(([lng, lat]) => (
    Math.abs(lng - 107.296) < 0.005 && Math.abs(lat - (-6.319)) < 0.005
  ));
  assert.ok(hasRoundaboutCurve, 'Centerline must pass through Bundaran Galuh Mas');

  // Verify it is NOT a single straight diagonal slope (vectors vary in angle)
  const bearings: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const dLng = coords[i + 1][0] - coords[i][0];
    const dLat = coords[i + 1][1] - coords[i][1];
    if (Math.hypot(dLng, dLat) > 1e-6) {
      bearings.push(Math.atan2(dLat, dLng));
    }
  }
  const minBearing = Math.min(...bearings);
  const maxBearing = Math.max(...bearings);
  assert.ok(maxBearing - minBearing > 0.5, 'Centerline must have curvature and not be a straight line');
});

test('Test B — Marker & Road Matching: Incident coordinates remain untouched & correctly match road', () => {
  const rep006 = INITIAL_COMMUNITY_REPORTS.find((r) => r.id === 'REP-KRW-006');
  assert.ok(rep006 !== undefined);
  assert.deepEqual(rep006.coordinates, [-6.3180, 107.2920], 'Original report GPS coordinates must remain unchanged');

  const rep008 = INITIAL_COMMUNITY_REPORTS.find((r) => r.id === 'REP-KRW-008');
  assert.ok(rep008 !== undefined);
  assert.deepEqual(rep008.coordinates, [-6.3260, 107.3050], 'Original report GPS coordinates must remain unchanged');

  // Matching with declared ID
  const match006 = matchReportToRoadSegment(
    rep006.coordinates,
    INDONESIAN_ROAD_SEGMENTS,
    rep006.segmentId
  );
  assert.equal(match006.status, 'MATCHED_BY_ID');
  assert.equal(match006.segment?.id, 'JLN-KRW-GALUHMAS');
  assert.ok(match006.distanceMeters !== null && match006.distanceMeters < 100, `Expected distance <100m, got ${match006.distanceMeters}`);
  assert.ok(match006.snappedCoordinates !== null);
  // Snapped coordinate is distinct from report incident coordinate
  assert.notDeepEqual(match006.snappedCoordinates, rep006.coordinates);

  // Proximity matching without ID
  const matchProximity = matchReportToRoadSegment(
    rep006.coordinates,
    INDONESIAN_ROAD_SEGMENTS,
    null
  );
  assert.equal(matchProximity.status, 'MATCHED_BY_PROXIMITY');
  assert.equal(matchProximity.segment?.id, 'JLN-KRW-GALUHMAS');
  assert.equal(matchProximity.distanceMeters, match006.distanceMeters);
});

test('Test C — 2D Leaflet & 3D Globe Synchronization: Same stable ID & identical canonical geometry', () => {
  const segment = INDONESIAN_ROAD_SEGMENTS.find((s) => s.id === 'JLN-KRW-GALUHMAS')!;
  assert.ok(segment !== undefined);

  // 1. Leaflet coordinate extraction
  const leafletPolyline = getCanonicalLeafletPolyline(segment);
  assert.ok(leafletPolyline.length > 50);
  // First Leaflet point is [latitude, longitude]
  assert.ok(leafletPolyline[0][0] < 0, 'Leaflet coord 0 must be latitude (negative for Indonesia)');
  assert.ok(leafletPolyline[0][1] > 100, 'Leaflet coord 1 must be longitude (>100 for Indonesia)');

  // 2. Globe GeoJSON generation
  const globeGeoJson = segmentsToGeoJson([segment]);
  assert.equal(globeGeoJson.type, 'FeatureCollection');
  assert.equal(globeGeoJson.features.length, 1);

  const feature = globeGeoJson.features[0];
  assert.equal(feature.properties.id, 'JLN-KRW-GALUHMAS');
  assert.equal(feature.properties.geometrySource, 'OSM_CENTERLINE');
  assert.equal(feature.properties.geometryStatus, 'DIGITISED');
  assert.equal(feature.geometry.type, 'LineString');

  const globeCoordinates = feature.geometry.coordinates;
  assert.equal(globeCoordinates.length, leafletPolyline.length, 'Leaflet and Globe must have identical point counts');

  // Verify 1:1 synchronization with axis transposition
  for (let i = 0; i < leafletPolyline.length; i++) {
    const [leafletLat, leafletLng] = leafletPolyline[i];
    const [globeLng, globeLat] = globeCoordinates[i];
    assert.equal(leafletLat, globeLat, `Point ${i} latitude mismatch`);
    assert.equal(leafletLng, globeLng, `Point ${i} longitude mismatch`);
  }
});

test('Test D — Zoom & Pan Projection Math: Polyline distance projection accurately resolves nearest point', () => {
  const segmentA: [number, number] = [-6.3100, 107.2900];
  const segmentB: [number, number] = [-6.3100, 107.3000];
  const queryPoint: [number, number] = [-6.3110, 107.2950]; // 0.001 deg south of midpoint

  const proj = projectPointToLineSegment(queryPoint, segmentA, segmentB);
  assert.ok(proj.distanceMeters > 100 && proj.distanceMeters < 120);
  assert.equal(proj.snapped[0], -6.3100);
  assert.equal(proj.snapped[1], 107.2950);
});

test('Test E — Invalid Data & Edge Cases: honest reporting without invented fallback geometry', () => {
  // Invalid coordinates
  assert.equal(isValidLatLng(null), false);
  assert.equal(isValidLatLng([NaN, 107.29]), false);
  assert.equal(isValidLatLng([-6.31, Infinity]), false);
  assert.equal(isValidLatLng([-95, 107.29]), false); // Latitude out of bounds
  assert.equal(isValidLatLng([-6.31, 200]), false); // Longitude out of bounds
  assert.equal(isValidLatLng([-6.31, 107.29]), true);

  assert.equal(isValidLngLat([107.29, -6.31]), true);
  assert.equal(isValidLngLat([200, -6.31]), false);

  // LineString validation
  assert.equal(isValidLineString([]), false);
  assert.equal(isValidLineString([[107.29, -6.31]]), false); // Needs >= 2 points
  assert.equal(isValidLineString([[107.29, -6.31], [107.30, -6.32]]), true);

  // Empty coordinate conversion
  assert.deepEqual(toLeafletPolyline([]), []);
  assert.deepEqual(toGeoJsonCoordinates([]), []);

  // Point far away from any road (Setu, Bekasi > 15 km away)
  const farAwayPoint: [number, number] = [-6.337137, 107.033958];
  const matchResult = matchReportToRoadSegment(
    farAwayPoint,
    INDONESIAN_ROAD_SEGMENTS,
    null,
    2000 // 2km radius
  );
  assert.equal(matchResult.status, 'NO_ROAD_FOUND');
  assert.equal(matchResult.segment, null);
  assert.equal(matchResult.isCorridorMatched, false);
});
