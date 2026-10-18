/**
 * Live incident REP-F35AF0965161FCA8: the report was labelled "KRW-001 · Pantura Klari" while
 * its GPS point and segment were in Bintaro. The segment must follow the real coordinates.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestSegment } from '../../src/domain/geo/nearestSegment';

const seg = (id: string, coordinates: [number, number]) => ({ id, coordinates }) as any;
const segments = [seg('KRW-001', [-6.3458, 107.3778]), seg('JLN-BINTARO-01', [-6.2839, 106.7513]), seg('KRW-002', [-6.3495, 107.415])];

test('a Bintaro GPS point maps to the Bintaro segment, not the preselected Karawang one', () => {
  assert.equal(nearestSegment(segments, [-6.2841, 106.7509])?.id, 'JLN-BINTARO-01');
});

test('a point on Pantura Klari maps to KRW-001; far points still get the closest, not the first', () => {
  assert.equal(nearestSegment(segments, [-6.346, 107.38])?.id, 'KRW-001');
  assert.equal(nearestSegment(segments, [-6.35, 107.5])?.id, 'KRW-002');
  assert.equal(nearestSegment([], [0, 0]), null);
});
