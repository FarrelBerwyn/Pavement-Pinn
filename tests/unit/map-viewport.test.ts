/**
 * Regression tests for the map zero-size crash ("Invalid LatLng object: (NaN, NaN)").
 * The guards are exercised with a fake map that fails the way Leaflet does when it is
 * asked to animate without a size. The real-Leaflet behaviour is verified in a browser
 * (docs/validation/POST_RESTRUCTURE_HARDENING.md).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHasSize, recoverMapSize, safeFitBounds, safeFlyTo, ViewportMap } from '../../src/components/maps/mapViewport';

function fakeMap(initial: { x: number; y: number }) {
  const calls: string[] = [];
  const state = { size: { ...initial }, measured: { ...initial } };
  const map: ViewportMap & { calls: string[]; resizeContainer: (x: number, y: number) => void } = {
    calls,
    getSize: () => ({ ...state.size }),
    flyTo: () => {
      // Leaflet computes the fly animation from max(size.x, size.y).
      if (Math.max(state.size.x, state.size.y) === 0) throw new Error('Invalid LatLng object: (NaN, NaN)');
      calls.push('flyTo');
    },
    setView: (_center, _zoom, options) => {
      calls.push(`setView:${JSON.stringify(options)}`);
    },
    fitBounds: () => {
      if (state.size.x <= 0 || state.size.y <= 0) throw new Error('fitBounds without a size');
      calls.push('fitBounds');
    },
    invalidateSize: () => {
      state.size = { ...state.measured };
      calls.push('invalidateSize');
    },
    resizeContainer: (x, y) => {
      state.measured = { x, y }; // the DOM changed; Leaflet only notices on invalidateSize
    }
  };
  return map;
}

test('mapHasSize requires both dimensions to be positive and finite', () => {
  assert.equal(mapHasSize(fakeMap({ x: 800, y: 600 })), true);
  assert.equal(mapHasSize(fakeMap({ x: 0, y: 0 })), false);
  assert.equal(mapHasSize(fakeMap({ x: 800, y: 0 })), false);
  assert.equal(mapHasSize(fakeMap({ x: Number.NaN, y: 600 })), false);
});

test('the unguarded call reproduces the crash on a zero-size map', () => {
  assert.throws(() => fakeMap({ x: 0, y: 0 }).flyTo([0, 0], 12), /Invalid LatLng/);
});

test('safeFlyTo animates on a sized map', () => {
  const map = fakeMap({ x: 800, y: 600 });
  safeFlyTo(map, [-6.3, 107.3], 12, { duration: 1.2 });
  assert.deepEqual(map.calls, ['flyTo']);
});

test('safeFlyTo never throws on a zero-size map and still sets the view without animation', () => {
  const map = fakeMap({ x: 0, y: 0 });
  assert.doesNotThrow(() => safeFlyTo(map, [-6.3, 107.3], 12, { duration: 1.2 }));
  assert.deepEqual(map.calls, ['setView:{"animate":false}']);
});

test('safeFitBounds defers on a zero-size map and applies once the container has a size', () => {
  const map = fakeMap({ x: 0, y: 0 });
  assert.doesNotThrow(() => safeFitBounds(map, 'bounds', { maxZoom: 6 }));
  assert.deepEqual(map.calls, []);

  recoverMapSize(map); // still hidden: re-measured, nothing applied
  assert.deepEqual(map.calls, ['invalidateSize']);

  map.resizeContainer(1024, 640);
  recoverMapSize(map);
  assert.deepEqual(map.calls, ['invalidateSize', 'invalidateSize', 'fitBounds']);

  recoverMapSize(map); // applied exactly once
  assert.deepEqual(map.calls.filter((c) => c === 'fitBounds').length, 1);
});

test('a later direct view change cancels a deferred one', () => {
  const map = fakeMap({ x: 0, y: 0 });
  safeFitBounds(map, 'old bounds');
  map.resizeContainer(800, 600);
  map.invalidateSize();
  safeFlyTo(map, [0, 0], 10); // user moved on while the first request was pending
  recoverMapSize(map);
  assert.deepEqual(map.calls.filter((c) => c === 'fitBounds'), []);
  assert.deepEqual(map.calls.filter((c) => c === 'flyTo').length, 1);
});
