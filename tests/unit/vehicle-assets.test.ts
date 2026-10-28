/** Vehicle mesh registry: every referenced GLB exists, carries a recorded licence, and has wheel nodes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { VEHICLE_ASSETS } from '../../src/features/workspace/components/vehicleAssets';

function glbNodes(file: string): string[] {
  const b = readFileSync(file);
  const len = b.readUInt32LE(12);
  return (JSON.parse(b.subarray(20, 20 + len).toString('utf8')).nodes ?? []).map((n: { name?: string }) => n.name ?? '');
}

test('each vehicle asset file exists in public/ with a CC0 licence recorded next to it', () => {
  for (const a of Object.values(VEHICLE_ASSETS)) {
    for (const f of [a.wheelFile, a.bodyFile].filter(Boolean) as string[]) assert.ok(existsSync(path.join('public', f)), f);
    assert.equal(a.license, 'CC0 1.0');
  }
  assert.match(readFileSync('public/models/vehicles/kenney/License.txt', 'utf8'), /CC0/);
});

test('body meshes contain the wheel nodes the loader removes and replaces', () => {
  for (const a of Object.values(VEHICLE_ASSETS)) {
    if (!a.bodyFile) continue;
    const wheels = glbNodes(path.join('public', a.bodyFile)).filter((n) => n.startsWith('wheel'));
    assert.equal(wheels.length, 4, a.bodyFile);
  }
});
