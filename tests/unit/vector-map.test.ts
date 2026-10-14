/**
 * MapLibre map support code: basemap candidate order, key handling and the
 * latitude/longitude order of the GeoJSON handed to the map. Rendering is verified in a
 * browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STYLE,
  basemapCandidates,
  normalizeMaptilerKey,
  redactStyle
} from '../../src/components/maps/vectorBasemap';
import { lngLatBounds, reportsToGeoJson, segmentsToGeoJson, toLngLat } from '../../src/components/maps/mapGeoJson';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import { INDONESIAN_ROAD_SEGMENTS } from '../../src/data/reference/indonesianRoads';

const STYLES = ['LIGHT', 'DARK', 'SATELLITE'] as const;

// Indonesia, generously: longitude 94 to 142, latitude -12 to 7.
const inIndonesia = ([lng, lat]: [number, number]) => lng >= 94 && lng <= 142 && lat >= -12 && lat <= 7;

test('without a key no MapTiler URL is produced and every list ends with the empty style', () => {
  for (const style of STYLES) {
    for (const key of [undefined, '', '   ', null, 42, 'has space', 'bad/key']) {
      const candidates = basemapCandidates(style, key);
      assert.ok(candidates.every((c) => c.provider !== 'MAPTILER'), `${style} ${String(key)}`);
      assert.equal(candidates[candidates.length - 1].style, EMPTY_STYLE);
      assert.ok(candidates.length >= 2);
    }
  }
});

test('with a key MapTiler comes first and a keyless provider follows as fallback', () => {
  for (const style of STYLES) {
    const candidates = basemapCandidates(style, ' abcDEF123 ');
    assert.equal(candidates[0].provider, 'MAPTILER');
    assert.match(String(candidates[0].style), /^https:\/\/api\.maptiler\.com\/maps\/[a-z0-9-]+\/style\.json\?key=abcDEF123$/);
    assert.ok(candidates.slice(1).some((c) => c.provider === 'OPENFREEMAP' || c.provider === 'ESRI_IMAGERY'));
  }
});

test('the key never appears in labels or in the redacted style', () => {
  const [first] = basemapCandidates('LIGHT', 'SECRETLOOKING123');
  assert.ok(!first.label.includes('SECRETLOOKING123'));
  assert.ok(!redactStyle(first.style).includes('SECRETLOOKING123'));
  assert.match(redactStyle(first.style), /key=\[REDACTED\]/);
  assert.equal(normalizeMaptilerKey('  k_1-2  '), 'k_1-2');
});

test('toLngLat swaps the order exactly once', () => {
  assert.deepEqual(toLngLat([-6.335, 107.278]), [107.278, -6.335]);
});

test('every bundled segment and report lands inside Indonesia as [lng, lat]', () => {
  const segments = segmentsToGeoJson(INDONESIAN_ROAD_SEGMENTS);
  assert.equal(segments.features.length, INDONESIAN_ROAD_SEGMENTS.filter((s) => s.polyline.length > 1).length);
  for (const feature of segments.features) {
    assert.ok(feature.geometry.coordinates.every(inIndonesia), feature.properties.id);
  }
  const reports = reportsToGeoJson(INITIAL_COMMUNITY_REPORTS);
  assert.equal(reports.features.length, INITIAL_COMMUNITY_REPORTS.length);
  for (const feature of reports.features) {
    assert.ok(inIndonesia(feature.geometry.coordinates), feature.properties.id);
  }
});

test('segment features keep their id and condition colour', () => {
  const [first] = segmentsToGeoJson(INDONESIAN_ROAD_SEGMENTS).features;
  assert.equal(first.properties.id, INDONESIAN_ROAD_SEGMENTS[0].id);
  assert.match(first.properties.color, /^#[0-9a-f]{6}$/);
});

test('lngLatBounds returns [[west, south], [east, north]]', () => {
  assert.equal(lngLatBounds([]), null);
  assert.deepEqual(
    lngLatBounds([
      [-6.3, 107.2],
      [-6.5, 107.4]
    ]),
    [
      [107.2, -6.5],
      [107.4, -6.3]
    ]
  );
});
