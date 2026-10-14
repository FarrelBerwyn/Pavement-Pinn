/**
 * Zoom-dependent map detail: level thresholds, pixel clustering and viewport membership.
 * Marker rendering itself is verified in a browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUSTER_MAX_ZOOM,
  LatLng,
  OBJECT_MIN_ZOOM,
  SEGMENT_LINE_MIN_ZOOM,
  boundsOf,
  clusterByPixelDistance,
  detailLevelForZoom,
  itemsInBounds,
  projectToPixels
} from '../../src/components/maps/mapDetail';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';

const identity = (p: LatLng) => p;

test('detail level follows the zoom thresholds', () => {
  assert.equal(detailLevelForZoom(SEGMENT_LINE_MIN_ZOOM - 1), 'AREA');
  assert.equal(detailLevelForZoom(SEGMENT_LINE_MIN_ZOOM), 'CORRIDOR');
  assert.equal(detailLevelForZoom(OBJECT_MIN_ZOOM - 1), 'CORRIDOR');
  assert.equal(detailLevelForZoom(OBJECT_MIN_ZOOM), 'OBJECT');
});

test('projection: one zoom level doubles pixel distances; the origin is the map centre', () => {
  const a = projectToPixels([0, 0], 3);
  assert.deepEqual(a, { x: 1024, y: 1024 });
  const p10 = projectToPixels([-6.3, 107.3], 10);
  const p11 = projectToPixels([-6.3, 107.3], 11);
  assert.ok(Math.abs(p11.x - 2 * p10.x) < 1e-6 && Math.abs(p11.y - 2 * p10.y) < 1e-6);
});

test('clustering keeps every item exactly once at every zoom', () => {
  const coords = INITIAL_COMMUNITY_REPORTS.map((r) => r.coordinates as LatLng);
  for (let zoom = 3; zoom <= 18; zoom++) {
    const clusters = clusterByPixelDistance(coords, identity, zoom);
    assert.equal(
      clusters.reduce((n, c) => n + c.items.length, 0),
      coords.length,
      `zoom ${zoom}`
    );
  }
});

test('clusters never increase in number when zooming out', () => {
  const coords = INITIAL_COMMUNITY_REPORTS.map((r) => r.coordinates as LatLng);
  let previous = Infinity;
  for (let zoom = CLUSTER_MAX_ZOOM; zoom >= 3; zoom--) {
    const count = clusterByPixelDistance(coords, identity, zoom).length;
    assert.ok(count <= previous, `zoom ${zoom}: ${count} > ${previous}`);
    previous = count;
  }
  assert.equal(clusterByPixelDistance(coords, identity, 3).length, 1);
});

test('at the maximum cluster zoom every report stands alone, even at identical coordinates', () => {
  const same: LatLng[] = [
    [-6.3, 107.3],
    [-6.3, 107.3]
  ];
  assert.equal(clusterByPixelDistance(same, identity, CLUSTER_MAX_ZOOM - 1).length, 1);
  assert.equal(clusterByPixelDistance(same, identity, CLUSTER_MAX_ZOOM).length, 2);
});

test('a cluster centre is the mean of its members', () => {
  const [cluster] = clusterByPixelDistance<LatLng>(
    [
      [-6.0, 107.0],
      [-6.2, 107.2]
    ],
    identity,
    4
  );
  assert.ok(Math.abs(cluster.center[0] + 6.1) < 1e-9 && Math.abs(cluster.center[1] - 107.1) < 1e-9);
});

test('viewport membership: unknown viewport claims nothing; bounds are inclusive', () => {
  const points: LatLng[] = [
    [-6.3, 107.3],
    [-7.5, 110.0]
  ];
  assert.deepEqual(itemsInBounds(points, identity, null), []);
  assert.deepEqual(
    itemsInBounds(points, identity, [
      [-6.3, 107.0],
      [-6.0, 107.3]
    ]),
    [points[0]]
  );
});

test('boundsOf contains every point and is null for no points', () => {
  assert.equal(boundsOf([]), null);
  const coords = INITIAL_COMMUNITY_REPORTS.map((r) => r.coordinates as LatLng);
  const bounds = boundsOf(coords);
  assert.ok(bounds);
  assert.equal(itemsInBounds(coords, identity, bounds).length, coords.length);
});

test('calibration: bundled segments are readable as lines at the line threshold', () => {
  // Median on-screen length of a segment polyline at the first zoom where lines are drawn.
  const lengths = INDONESIAN_ROAD_SEGMENTS.map((segment) => {
    const first = projectToPixels(segment.polyline[0], SEGMENT_LINE_MIN_ZOOM);
    const last = projectToPixels(segment.polyline[segment.polyline.length - 1], SEGMENT_LINE_MIN_ZOOM);
    return Math.hypot(first.x - last.x, first.y - last.y);
  }).sort((a, b) => a - b);
  const median = lengths[Math.floor(lengths.length / 2)];
  assert.ok(median >= 20, `median segment length ${median.toFixed(1)} px`);
});
