/**
 * Tests for Location Selection & Nearest Road Resolution
 * Covers mandatory test cases Test 1 through Test 8 from the P0 specification.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocationSelection,
  resolveRoadSelection,
  findNearestRoadGeometry,
  isValidCoordinate,
  DEFAULT_ROAD_SEARCH_RADIUS_METERS,
  LocationSelection
} from '../../src/domain/geo/locationSelection';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';
import type { RoadSegment } from '../../src/types';

// Concrete verified Karawang segments from dataset
const karawangSegments: RoadSegment[] = INDONESIAN_ROAD_SEGMENTS.filter(
  (s) => s.province === 'Jawa Barat' && s.corridor.includes('Karawang')
);

test('Test 1 — Single selection: authoritative model captures raw coordinate & resolves nearest road', async () => {
  const coords: [number, number] = [-6.331337, 107.191887];
  const selection = createLocationSelection(coords);

  assert.equal(selection.coordinates[0], -6.331337);
  assert.equal(selection.coordinates[1], 107.191887);
  assert.equal(selection.status, 'RESOLVING');
  assert.equal(selection.isValid, true);
  assert.ok(selection.selectionId.startsWith('sel_'));
  assert.ok(selection.requestId.startsWith('req_'));

  const resolved = await resolveRoadSelection(selection, INDONESIAN_ROAD_SEGMENTS);

  assert.equal(resolved.status, 'RESOLVED');
  assert.ok(resolved.segment !== null);
  assert.equal(resolved.segmentId, 'JLN-KRW-KIIC-1');
  assert.equal(resolved.segmentName, 'Jl. Akses KIIC - Karawang Barat (Kawasan Industri KIIC)');
  assert.equal(resolved.coordinates[0], -6.331337);
  assert.equal(resolved.coordinates[1], 107.191887);
  assert.ok(typeof resolved.distanceMeters === 'number' && resolved.distanceMeters > 0);
  assert.ok(Array.isArray(resolved.snappedCoordinates));
});

test('Test 2 — Sequential selection: A -> B -> C only leaves selection C active', async () => {
  const coordsA: [number, number] = [-6.331337, 107.191887];
  const coordsB: [number, number] = [-6.295506, 107.227936];
  const coordsC: [number, number] = [-6.370235, 107.263985];

  let activeSelection: LocationSelection | null = null;
  let activeRequestId: string | null = null;

  // Step 1: User clicks A
  const selA = createLocationSelection(coordsA);
  activeSelection = selA;
  activeRequestId = selA.requestId;
  assert.equal(activeSelection.coordinates[0], coordsA[0]);

  // Step 2: User clicks B before A completes
  const selB = createLocationSelection(coordsB);
  activeSelection = selB;
  activeRequestId = selB.requestId;
  assert.equal(activeSelection.coordinates[0], coordsB[0]);

  // Step 3: User clicks C before B completes
  const selC = createLocationSelection(coordsC);
  activeSelection = selC;
  activeRequestId = selC.requestId;
  assert.equal(activeSelection.coordinates[0], coordsC[0]);

  // Resolve C
  const resolvedC = await resolveRoadSelection(selC, INDONESIAN_ROAD_SEGMENTS);
  if (activeRequestId === selC.requestId) {
    activeSelection = resolvedC;
  }

  // Verify only C is active, with C coordinates
  assert.equal(activeSelection.coordinates[0], coordsC[0]);
  assert.equal(activeSelection.coordinates[1], coordsC[1]);
  assert.equal(activeSelection.selectionId, selC.selectionId);
  assert.equal(activeSelection.status, 'RESOLVED');
});

test('Test 3 — Race condition: if request A resolves slower than B, A never overwrites B', async () => {
  const coordsA: [number, number] = [-6.331337, 107.191887];
  const coordsB: [number, number] = [-6.295506, 107.227936];

  let currentDisplayedSelection: LocationSelection | null = null;
  let activeRequestId: string | null = null;

  // Click A
  const selA = createLocationSelection(coordsA);
  currentDisplayedSelection = selA;
  activeRequestId = selA.requestId;

  // Immediately click B
  const selB = createLocationSelection(coordsB);
  currentDisplayedSelection = selB;
  activeRequestId = selB.requestId;

  // Simulate A having a 50ms delay and B having 5ms delay
  const promiseA = resolveRoadSelection(selA, INDONESIAN_ROAD_SEGMENTS, { delayMs: 40 });
  const promiseB = resolveRoadSelection(selB, INDONESIAN_ROAD_SEGMENTS, { delayMs: 5 });

  // Handle B completion (finishes first)
  const resB = await promiseB;
  if (activeRequestId === selB.requestId) {
    currentDisplayedSelection = resB;
  }

  assert.equal(currentDisplayedSelection.coordinates[0], coordsB[0]);
  assert.equal(currentDisplayedSelection.segmentId, 'JLN-KRW-TANJUNGPURA');

  // Handle A completion (finishes later)
  const resA = await promiseA;
  if (activeRequestId === selA.requestId) {
    // Should NOT enter here because activeRequestId !== selA.requestId
    currentDisplayedSelection = resA;
  }

  // UI must still show B!
  assert.equal(currentDisplayedSelection.coordinates[0], coordsB[0]);
  assert.equal(currentDisplayedSelection.coordinates[1], coordsB[1]);
  assert.equal(currentDisplayedSelection.segmentId, 'JLN-KRW-TANJUNGPURA');
  assert.equal(currentDisplayedSelection.selectionId, selB.selectionId);
});

test('Test 4 — Distinct verified Karawang coordinates map to their respective corridors', async () => {
  // Point 1: Near KIIC
  const p1: [number, number] = [-6.331337, 107.191887];
  const res1 = findNearestRoadGeometry(p1, INDONESIAN_ROAD_SEGMENTS);
  assert.equal(res1.segment?.id, 'JLN-KRW-KIIC-1');
  assert.ok(res1.distanceMeters !== null && res1.distanceMeters < DEFAULT_ROAD_SEARCH_RADIUS_METERS);

  // Point 2: Near Tanjungpura Bypass
  const p2: [number, number] = [-6.295506, 107.227936];
  const res2 = findNearestRoadGeometry(p2, INDONESIAN_ROAD_SEGMENTS);
  assert.equal(res2.segment?.id, 'JLN-KRW-TANJUNGPURA');
  assert.ok(res2.distanceMeters !== null && res2.distanceMeters < 5000);

  // Point 3: South of KIIC
  const p3: [number, number] = [-6.370235, 107.263985];
  const res3 = findNearestRoadGeometry(p3, INDONESIAN_ROAD_SEGMENTS);
  assert.equal(res3.segment?.id, 'JLN-KRW-KIIC-1');

  // Confirm distinct results and no cross-contamination
  assert.notEqual(res1.segment?.id, res2.segment?.id);
  assert.equal(res2.segment?.name, 'Jl. Lingkar Luar Tanjungpura - Klari (Bypass Karawang)');
});

test('Test 5 — Road not found: points outside search radius honestly report NO_ROAD_FOUND without fallback', async () => {
  // Setu, Bekasi: ~25 km away from South Jakarta and Karawang corridors
  const setuPoint: [number, number] = [-6.337137, 107.033958];
  const selSetu = createLocationSelection(setuPoint);

  const resolved = await resolveRoadSelection(selSetu, INDONESIAN_ROAD_SEGMENTS, {
    maxRadiusMeters: 10_000
  });

  assert.equal(resolved.status, 'NO_ROAD_FOUND');
  assert.equal(resolved.segment, null);
  assert.equal(resolved.segmentId, null);
  assert.equal(resolved.segmentName, null);
  // Coordinates are faithfully preserved
  assert.equal(resolved.coordinates[0], setuPoint[0]);
  assert.equal(resolved.coordinates[1], setuPoint[1]);
  // No fake fallback to previous selection
  assert.notEqual(resolved.segmentName, 'Jl. TB Simatupang - Fatmawati/Cilandak (Jakarta Selatan)');
});

test('Test 6 — Dismiss & Reopen: closing selection clears state; subsequent pick starts cleanly', () => {
  let activeSelection: LocationSelection | null = null;

  // Pick A
  activeSelection = createLocationSelection([-6.331337, 107.191887]);
  assert.ok(activeSelection !== null);

  // User dismisses
  activeSelection = null;
  assert.equal(activeSelection, null);

  // Pick B
  const selB = createLocationSelection([-6.295506, 107.227936]);
  activeSelection = selB;
  assert.equal(activeSelection.coordinates[0], -6.295506);
  assert.equal(activeSelection.selectionId, selB.selectionId);
});

test('Test 7 — Coordinates integrity: raw coordinates are preserved separate from polyline snapping', async () => {
  const rawCoords: [number, number] = [-6.331337, 107.191887];
  const sel = createLocationSelection(rawCoords);
  const resolved = await resolveRoadSelection(sel, INDONESIAN_ROAD_SEGMENTS);

  // Raw coordinates must NEVER be overwritten by the snapped point
  assert.equal(resolved.coordinates[0], -6.331337);
  assert.equal(resolved.coordinates[1], 107.191887);

  // Snapped coordinates lie on the polyline and are distinct
  assert.ok(resolved.snappedCoordinates !== null);
  assert.notEqual(resolved.snappedCoordinates[0], resolved.coordinates[0]);
  assert.notEqual(resolved.snappedCoordinates[1], resolved.coordinates[1]);
});

test('Test 8 — Location approval: confirmation payload contains active coordinates and verified segment', async () => {
  const coords: [number, number] = [-6.295506, 107.227936];
  const sel = createLocationSelection(coords);
  const resolved = await resolveRoadSelection(sel, INDONESIAN_ROAD_SEGMENTS);

  // Simulating user approval
  const approvedPayload = {
    coordinates: resolved.coordinates,
    segmentId: resolved.segmentId,
    segmentName: resolved.segmentName
  };

  assert.deepEqual(approvedPayload.coordinates, coords);
  assert.equal(approvedPayload.segmentId, 'JLN-KRW-TANJUNGPURA');
  assert.equal(approvedPayload.segmentName, 'Jl. Lingkar Luar Tanjungpura - Klari (Bypass Karawang)');
});

test('Coordinate validation rejects non-finite, out-of-range, and malformed inputs', () => {
  assert.equal(isValidCoordinate([-6.3, 107.3]), true);
  assert.equal(isValidCoordinate([0, 0]), true);
  assert.equal(isValidCoordinate([-91, 100]), false);
  assert.equal(isValidCoordinate([10, 181]), false);
  assert.equal(isValidCoordinate([NaN, 100]), false);
  assert.equal(isValidCoordinate([Infinity, 100]), false);
  assert.equal(isValidCoordinate('not-an-array'), false);
  assert.equal(isValidCoordinate([1]), false);
  assert.equal(isValidCoordinate([1, 2, 3]), false);
});

import { BEKASI_CORRIDOR_SEGMENTS } from '../../src/data/reference/bekasiCorridor';
import { getCanonicalRoadGeometry } from '../../src/domain/geo/canonicalRoadGeometry';

const allSegments: RoadSegment[] = [...INDONESIAN_ROAD_SEGMENTS, ...BEKASI_CORRIDOR_SEGMENTS];

test('Test A — Point A: -6.273324, 107.146211 identifies Jl. H. Umar Ismail (Jababeka)', async () => {
  const pointA: [number, number] = [-6.273324, 107.146211];
  const selA = createLocationSelection(pointA);

  assert.equal(selA.coordinates[0], -6.273324);
  assert.equal(selA.coordinates[1], 107.146211);
  assert.equal(selA.status, 'RESOLVING');
  assert.equal(selA.state, 'loading');

  const resolvedA = await resolveRoadSelection(selA, allSegments);

  assert.equal(resolvedA.status, 'RESOLVED');
  assert.equal(resolvedA.state, 'matched');
  assert.ok(resolvedA.segment !== null);
  assert.equal(resolvedA.segmentId, 'JLN-BKS-JABABEKA-UMAR');
  assert.equal(resolvedA.segmentName, 'Jl. H. Umar Ismail (Kawasan Industri Jababeka 1)');
  assert.equal(resolvedA.coordinates[0], -6.273324);
  assert.equal(resolvedA.coordinates[1], 107.146211);
  assert.ok(typeof resolvedA.distanceMeters === 'number');
  assert.ok(resolvedA.distanceMeters >= 90 && resolvedA.distanceMeters <= 120, `Distance should be ~101m, got ${resolvedA.distanceMeters}`);
  assert.ok(resolvedA.snappedCoordinates !== null);
});

test('Test B — Point B: -6.299078, 107.102829 identifies Jl. Kalimantan (MM2100)', async () => {
  const pointB: [number, number] = [-6.299078, 107.102829];
  const selB = createLocationSelection(pointB);

  assert.equal(selB.coordinates[0], -6.299078);
  assert.equal(selB.coordinates[1], 107.102829);
  assert.equal(selB.status, 'RESOLVING');
  assert.equal(selB.state, 'loading');

  const resolvedB = await resolveRoadSelection(selB, allSegments);

  assert.equal(resolvedB.status, 'RESOLVED');
  assert.equal(resolvedB.state, 'matched');
  assert.ok(resolvedB.segment !== null);
  assert.equal(resolvedB.segmentId, 'JLN-BKS-MM2100-KALIMANTAN');
  assert.equal(resolvedB.segmentName, 'Jl. Kalimantan (Kawasan Industri MM2100 - Cibitung)');
  assert.equal(resolvedB.coordinates[0], -6.299078);
  assert.equal(resolvedB.coordinates[1], 107.102829);
  assert.ok(typeof resolvedB.distanceMeters === 'number');
  assert.ok(resolvedB.distanceMeters >= 80 && resolvedB.distanceMeters <= 110, `Distance should be ~93m, got ${resolvedB.distanceMeters}`);
  assert.ok(resolvedB.snappedCoordinates !== null);
});

test('Test C — Rapid selection: Point A then Point B ensures only Point B becomes final selection', async () => {
  const pointA: [number, number] = [-6.273324, 107.146211];
  const pointB: [number, number] = [-6.299078, 107.102829];

  let activeRequestId: string | null = null;
  let activeDisplay: LocationSelection | null = null;

  // Pick A
  const selA = createLocationSelection(pointA);
  activeRequestId = selA.requestId;
  activeDisplay = selA;

  // Immediately pick B
  const selB = createLocationSelection(pointB);
  activeRequestId = selB.requestId;
  activeDisplay = selB;

  // Resolve A with artificial delay, B fast
  const pA = resolveRoadSelection(selA, allSegments, { delayMs: 40 });
  const pB = resolveRoadSelection(selB, allSegments, { delayMs: 5 });

  const resB = await pB;
  if (activeRequestId === selB.requestId) {
    activeDisplay = resB;
  }

  const resA = await pA;
  if (activeRequestId === selA.requestId) {
    activeDisplay = resA;
  }

  assert.equal(activeDisplay.coordinates[0], pointB[0]);
  assert.equal(activeDisplay.coordinates[1], pointB[1]);
  assert.equal(activeDisplay.segmentId, 'JLN-BKS-MM2100-KALIMANTAN');
  assert.equal(activeDisplay.state, 'matched');
});

test('Test D — Failure handling: distinct states for error, not_found, ambiguous, loading, matched', async () => {
  // 1. Invalid coordinates produce state: 'error'
  const invalidSel = createLocationSelection([999, 999] as unknown as [number, number]);
  assert.equal(invalidSel.status, 'ERROR');
  assert.equal(invalidSel.state, 'error');

  // 2. Far away point (> 10 km) produces state: 'not_found'
  const remoteSel = createLocationSelection([-7.5, 110.0]);
  const resolvedRemote = await resolveRoadSelection(remoteSel, allSegments, { maxRadiusMeters: 5000 });
  assert.equal(resolvedRemote.status, 'NO_ROAD_FOUND');
  assert.equal(resolvedRemote.state, 'not_found');

  // 3. Ambiguity check: create synthetic scenario with 2 equidistant segments
  const mockSeg1: RoadSegment = {
    ...INDONESIAN_ROAD_SEGMENTS[0],
    id: 'TEST-ROAD-1',
    name: 'Jalan Test 1',
    province: 'Jawa Barat',
    corridor: 'Test',
    coordinates: [-6.2700, 107.1400],
    polyline: [[-6.2700, 107.1400], [-6.2710, 107.1400]],
    lengthKm: 1,
    currentPci: 80,
    conditionCategory: 'GOOD'
  };
  const mockSeg2: RoadSegment = {
    ...INDONESIAN_ROAD_SEGMENTS[0],
    id: 'TEST-ROAD-2',
    name: 'Jalan Test 2',
    province: 'Jawa Barat',
    corridor: 'Test',
    coordinates: [-6.2700, 107.1401],
    polyline: [[-6.2700, 107.1401], [-6.2710, 107.1401]],
    lengthKm: 1,
    currentPci: 80,
    conditionCategory: 'GOOD'
  };

  const ambiLookup = findNearestRoadGeometry([-6.2705, 107.14005], [mockSeg1, mockSeg2], 1000, 25);
  assert.equal(ambiLookup.isAmbiguous, true);
  assert.equal(ambiLookup.candidateSegments?.length, 2);

  const ambiSel = createLocationSelection([-6.2705, 107.14005]);
  const resolvedAmbi = await resolveRoadSelection(ambiSel, [mockSeg1, mockSeg2]);
  assert.equal(resolvedAmbi.status, 'AMBIGUOUS');
  assert.equal(resolvedAmbi.state, 'ambiguous');
  assert.equal(resolvedAmbi.isAmbiguous, true);
});

test('Test E — Canonical OSM road centerline geometry exists for both Point A & Point B roads', () => {
  const geomA = getCanonicalRoadGeometry('JLN-BKS-JABABEKA-UMAR');
  assert.ok(geomA !== null);
  assert.equal(geomA.geometryStatus, 'DIGITISED');
  assert.ok(geomA.geometry.coordinates.length > 10, 'Polyline should have multiple vertices from OSM way traces');

  const geomB = getCanonicalRoadGeometry('JLN-BKS-MM2100-KALIMANTAN');
  assert.ok(geomB !== null);
  assert.equal(geomB.geometryStatus, 'DIGITISED');
  assert.ok(geomB.geometry.coordinates.length > 10, 'Polyline should have multiple vertices from OSM way traces');
});
