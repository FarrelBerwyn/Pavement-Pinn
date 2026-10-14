/**
 * Basemap fallback decision. The switch itself (Leaflet setUrl, the notice) is verified
 * in a browser; these tests pin when a source is abandoned.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASEMAP_FALLBACKS,
  BASEMAP_SOURCES,
  BaseMapStyle,
  INITIAL_TILE_HEALTH,
  TILE_FAILURE_THRESHOLD,
  TileHealth,
  recordTileError,
  recordTileLoad,
  sourceForStage
} from '../../src/components/maps/basemap';

const STYLES: BaseMapStyle[] = ['DARK', 'SATELLITE', 'LIGHT'];

function fail(health: TileHealth, times: number): TileHealth {
  let current = health;
  for (let i = 0; i < times; i++) current = recordTileError(current);
  return current;
}

function host(url: string): string {
  return new URL(url.replace(/[{}]/g, '')).host;
}

test('every style falls back to a different provider', () => {
  for (const style of STYLES) {
    assert.notEqual(host(BASEMAP_FALLBACKS[style].url), host(BASEMAP_SOURCES[style].url), style);
  }
});

test('a source that delivers nothing is replaced after the threshold', () => {
  assert.equal(fail(INITIAL_TILE_HEALTH, TILE_FAILURE_THRESHOLD - 1).stage, 'primary');
  assert.deepEqual(fail(INITIAL_TILE_HEALTH, TILE_FAILURE_THRESHOLD), { stage: 'fallback', loaded: 0, errors: 0 });
});

test('isolated tile errors on a working source do not trigger a switch', () => {
  const working = recordTileLoad(INITIAL_TILE_HEALTH);
  assert.equal(fail(working, TILE_FAILURE_THRESHOLD * 5).stage, 'primary');
});

test('a failing fallback ends in the failed stage and stays there', () => {
  const fallback = fail(INITIAL_TILE_HEALTH, TILE_FAILURE_THRESHOLD);
  const failed = fail(fallback, TILE_FAILURE_THRESHOLD);
  assert.equal(failed.stage, 'failed');
  assert.equal(fail(failed, TILE_FAILURE_THRESHOLD * 3).stage, 'failed');
});

test('a fallback that works is kept', () => {
  const fallback = recordTileLoad(fail(INITIAL_TILE_HEALTH, TILE_FAILURE_THRESHOLD));
  assert.equal(fail(fallback, TILE_FAILURE_THRESHOLD * 2).stage, 'fallback');
});

test('stage selects the source; the failed stage keeps the fallback URL', () => {
  for (const style of STYLES) {
    assert.equal(sourceForStage(style, 'primary'), BASEMAP_SOURCES[style]);
    assert.equal(sourceForStage(style, 'fallback'), BASEMAP_FALLBACKS[style]);
    assert.equal(sourceForStage(style, 'failed'), BASEMAP_FALLBACKS[style]);
  }
});
