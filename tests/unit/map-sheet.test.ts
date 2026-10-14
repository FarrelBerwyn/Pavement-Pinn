/**
 * Bottom-sheet gesture rules and the zoom floor that keeps the world from showing as a
 * strip. Rendering and touch handling are verified in a browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHEET_DRAG_THRESHOLD_PX,
  sheetInsetPx,
  sheetStateAfterDrag,
  stepSheetState
} from '../../src/components/maps/sheetState';
import { minZoomForViewportHeight } from '../../src/components/maps/mapDetail';

test('sheet steps PEEK -> HALF -> FULL and stops at FULL', () => {
  assert.equal(stepSheetState('PEEK', 'UP'), 'HALF');
  assert.equal(stepSheetState('HALF', 'UP'), 'FULL');
  assert.equal(stepSheetState('FULL', 'UP'), 'FULL');
});

test('sheet steps down one state at a time and closes only from PEEK', () => {
  assert.equal(stepSheetState('FULL', 'DOWN'), 'HALF');
  assert.equal(stepSheetState('HALF', 'DOWN'), 'PEEK');
  assert.equal(stepSheetState('PEEK', 'DOWN'), 'CLOSED');
});

test('a short drag leaves the sheet where it is', () => {
  assert.equal(sheetStateAfterDrag('HALF', SHEET_DRAG_THRESHOLD_PX - 1), 'HALF');
  assert.equal(sheetStateAfterDrag('HALF', -(SHEET_DRAG_THRESHOLD_PX - 1)), 'HALF');
});

test('drag direction: up is negative, down is positive', () => {
  assert.equal(sheetStateAfterDrag('HALF', -SHEET_DRAG_THRESHOLD_PX), 'FULL');
  assert.equal(sheetStateAfterDrag('HALF', SHEET_DRAG_THRESHOLD_PX), 'PEEK');
  assert.equal(sheetStateAfterDrag('PEEK', 200), 'CLOSED');
});

test('map inset: none when closed, smaller for PEEK than for HALF', () => {
  assert.equal(sheetInsetPx(null, 812), 0);
  assert.ok(sheetInsetPx('PEEK', 812) < sheetInsetPx('HALF', 812));
  assert.equal(sheetInsetPx('FULL', 812), sheetInsetPx('HALF', 812));
});

test('zoom floor: the world (256 px at zoom 0) is never shorter than the map', () => {
  for (const height of [200, 256, 257, 480, 812, 1024, 1025, 2160]) {
    const zoom = minZoomForViewportHeight(height);
    assert.ok(256 * Math.pow(2, zoom) >= height, `height ${height} -> zoom ${zoom}`);
    if (zoom > 0) assert.ok(256 * Math.pow(2, zoom - 1) < height, `zoom ${zoom} is not the lowest for ${height}`);
  }
  assert.equal(minZoomForViewportHeight(812), 2);
  assert.equal(minZoomForViewportHeight(0), 0);
  assert.equal(minZoomForViewportHeight(Number.NaN), 0);
});
