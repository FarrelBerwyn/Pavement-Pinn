/**
 * Snap rules shared by every bottom sheet: the nearest snap point to where the sheet would
 * travel, so a slow drag settles where it is left and a fling carries on.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSnap, shouldDismiss } from '../../src/components/ui/sheetDrag';

const SNAPS = [
  { key: 'PEEK' as const, height: 150 },
  { key: 'HALF' as const, height: 380 },
  { key: 'FULL' as const, height: 740 }
];

test('a slow release settles on the nearest snap point', () => {
  assert.equal(pickSnap(SNAPS, 400, 0, true), 'HALF');
  assert.equal(pickSnap(SNAPS, 600, 0, true), 'FULL');
  assert.equal(pickSnap(SNAPS, 200, 0, true), 'PEEK');
});

test('a fling carries the sheet in the direction of the finger', () => {
  assert.equal(pickSnap(SNAPS, 420, -2, true), 'FULL'); // flung up from just above HALF
  assert.equal(pickSnap(SNAPS, 360, 1.5, true), 'PEEK'); // flung down from HALF
});

test('below half of the smallest snap point the sheet closes, only when closable', () => {
  assert.equal(pickSnap(SNAPS, 60, 0, true), 'CLOSE');
  assert.equal(pickSnap(SNAPS, 140, 1, true), 'CLOSE');
  assert.equal(pickSnap(SNAPS, 60, 0, false), 'PEEK');
});

test('a modal sheet closes when pulled far or flung down, otherwise springs back', () => {
  assert.equal(shouldDismiss(200, 0, 600), true);
  assert.equal(shouldDismiss(40, 0.8, 600), true);
  assert.equal(shouldDismiss(40, 0, 600), false);
  assert.equal(shouldDismiss(60, 0, 150), true); // short sheet: 35 % of its height
});
