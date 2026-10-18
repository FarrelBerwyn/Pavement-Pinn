/**
 * Dataset reference images (RDD2022): registry integrity, label mapping, seed data and the
 * guarantee that a client cannot mark its own photo as dataset reference.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import registry from '../../src/data/reference/datasetImageRegistry.json';
import { assignReferencePhotos, DATASET_ASSETS, NO_COVERAGE_PATH, photoSourceLabel } from '../../src/domain/reports/datasetImages';
import { INITIAL_COMMUNITY_REPORTS } from '../../src/data/mock/communityReports';
import { createSessionReport } from '../../src/domain/reports/reportFactory';

const PUBLIC = path.resolve('public');
const LABEL_FOR: Record<string, string> = { POTHOLE: 'D40', ALLIGATOR_CRACK: 'D20' };

/** Width/height from a baseline or progressive JPEG's SOF marker. */
function jpegSize(buf: Buffer): { w: number; h: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

test('every registry asset exists, is a JPEG of the recorded size, and matches its checksum', () => {
  assert.ok(DATASET_ASSETS.length >= 9);
  for (const a of registry.assets) {
    const file = path.join(PUBLIC, a.storagePath);
    assert.ok(existsSync(file), `missing ${a.storagePath}`);
    const buf = readFileSync(file);
    assert.equal(buf.length, a.fileSizeBytes, a.assetId);
    assert.equal(createHash('sha256').update(buf).digest('hex'), a.sha256, a.assetId);
    assert.deepEqual(jpegSize(buf), { w: a.imageWidth, h: a.imageHeight }, a.assetId);
    assert.equal(a.verified, true);
  }
  assert.ok(existsSync(path.join(PUBLIC, NO_COVERAGE_PATH)));
});

test('no two assets are the same image, and each carries the dataset label of its damage type', () => {
  const hashes = registry.assets.map((a) => a.sha256);
  assert.equal(new Set(hashes).size, hashes.length);
  for (const a of registry.assets) assert.ok(a.originalLabel.startsWith(LABEL_FOR[a.damageType]), `${a.assetId} label ${a.originalLabel}`);
  assert.match(registry.datasets[0].license, /CC BY-SA 4\.0/);
  assert.match(registry.datasets[0].attribution, /Arya/);
});

test('seed reports: dataset photo of the right type, explicit no-coverage otherwise, no stock photos', () => {
  for (const r of INITIAL_COMMUNITY_REPORTS) {
    assert.doesNotMatch(r.photoUrl, /unsplash/, r.id);
    if (LABEL_FOR[r.damageType]) {
      assert.equal(r.photoProvenance, 'DATASET_REFERENCE', r.id);
      const asset = DATASET_ASSETS.find((a) => a.assetId === r.datasetAssetId)!;
      assert.equal(asset.damageType, r.damageType, r.id);
      assert.ok(r.photoUrl.endsWith(asset.storagePath), r.id);
    } else {
      assert.equal(r.photoProvenance, 'NO_DATASET_COVERAGE', r.id);
      assert.ok(r.photoUrl.endsWith(NO_COVERAGE_PATH), r.id);
    }
    assert.match(photoSourceLabel(r), r.photoProvenance === 'DATASET_REFERENCE' ? /bukan foto lokasi ini/ : /Belum ada foto/);
  }
  // Distinct images while a type has enough assets
  const used = INITIAL_COMMUNITY_REPORTS.filter((r) => r.datasetAssetId).map((r) => r.datasetAssetId);
  assert.equal(new Set(used).size, used.length);
});

test('assignment is deterministic and does not depend on input order', () => {
  const sample = INITIAL_COMMUNITY_REPORTS.map(({ id, damageType }) => ({ id, damageType }));
  const a = assignReferencePhotos(sample);
  const b = assignReferencePhotos([...sample].reverse());
  for (const r of sample) assert.deepEqual(a.get(r.id), b.get(r.id));
});

test('a client cannot label its own photo as a dataset reference', () => {
  const { id, status, creatorAccountId, creatorRole, origin, createdAt, ...draft } = INITIAL_COMMUNITY_REPORTS[0];
  void id; void status; void creatorAccountId; void creatorRole; void origin; void createdAt;
  const made = createSessionReport({ ...draft, photoUrl: 'data:image/png;base64,AAAA', photoProvenance: 'DATASET_REFERENCE', datasetAssetId: 'RDD2022-X' }, { id: 'USR-004', role: 'PUBLIC_REPORTER' });
  assert.equal(made.photoProvenance, undefined);
  assert.equal(made.datasetAssetId, undefined);
  assert.deepEqual(made.coordinates, draft.coordinates);
});
