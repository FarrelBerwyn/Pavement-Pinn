import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { classify, codeVersion, fingerprint, isRuntimeSource } from '../../server/runtime/codeVersion';

/** A throwaway repo shape: server/, src/domain/ (watched) and src/features/ (frontend only). */
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'pinn-codeversion-'));
  const write = (rel: string, body: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  };
  write('server/app.ts', 'export const a = 1;\n');
  write('server/middleware/frontendHost.ts', 'export const host = "vite";\n');
  write('src/domain/rules.ts', 'export const r = 1;\n');
  write('src/features/Map.tsx', 'export const m = 1;\n');
  return { root, write, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('codeVersion returns complete version metadata and honest sync status', () => {
  const version = codeVersion();
  assert.ok(version.pid > 0);
  assert.ok(!Number.isNaN(Date.parse(version.startedAt)));
  assert.ok(!Number.isNaN(Date.parse(version.checkedAt)));
  assert.ok(['SYNCED', 'COMMIT_MISMATCH', 'SOURCE_MODIFIED', 'UNKNOWN'].includes(version.syncStatus));
  assert.equal(version.stale, version.syncStatus !== 'SYNCED');
  assert.ok(version.fingerprint && version.fingerprint.files > 0);
});

test('fresh runtime with unchanged sources is SYNCED', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  assert.equal(classify(start, fingerprint(f.root), 'abc1234', 'abc1234').syncStatus, 'SYNCED');
});

test('editing a loaded backend file is SOURCE_MODIFIED and names the file, even with the same commit', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  f.write('server/middleware/frontendHost.ts', 'export const host = "static";\n');
  const verdict = classify(start, fingerprint(f.root), 'abc1234', 'abc1234');
  assert.equal(verdict.syncStatus, 'SOURCE_MODIFIED');
  assert.deepEqual(verdict.changed, ['server/middleware/frontendHost.ts']);
});

test('a restarted runtime fingerprints the new code: SYNCED again, and later checks stay SYNCED', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const oldStart = fingerprint(f.root);
  f.write('server/app.ts', 'export const a = 2;\n');
  assert.equal(classify(oldStart, fingerprint(f.root), 'abc', 'abc').syncStatus, 'SOURCE_MODIFIED');
  const newStart = fingerprint(f.root); // what the restarted process loads
  for (let i = 0; i < 3; i++) assert.equal(classify(newStart, fingerprint(f.root), 'abc', 'abc').syncStatus, 'SYNCED');
});

test('saving a file without changing its content is not a change', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  const file = path.join(f.root, 'server/app.ts');
  f.write('server/app.ts', 'export const a = 1;\n');
  utimesSync(file, new Date(Date.now() + 60_000), new Date(Date.now() + 60_000));
  assert.equal(classify(start, fingerprint(f.root), 'abc', 'abc').syncStatus, 'SYNCED');
});

test('frontend-only files and tests do not mark the backend stale', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  f.write('src/features/Map.tsx', 'export const m = 2;\n');
  f.write('server/runtime/codeVersion.test.ts', 'test();\n');
  f.write('server/types.d.ts', 'declare const x: number;\n');
  assert.equal(classify(start, fingerprint(f.root), 'abc', 'abc').syncStatus, 'SYNCED');
  assert.equal(isRuntimeSource('startServer.ts'), true);
  assert.equal(isRuntimeSource('api.test.ts'), false);
});

test('committing code the runtime already loaded is not stale; a checkout that changes sources is', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  assert.equal(classify(start, fingerprint(f.root), 'abc1234', 'def5678').syncStatus, 'SYNCED');
  f.write('server/app.ts', 'export const a = 3;\n');
  assert.equal(classify(start, fingerprint(f.root), 'abc1234', 'def5678').syncStatus, 'COMMIT_MISMATCH');
});

test('missing git does not hide a real change, nor invent one', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  assert.equal(classify(start, fingerprint(f.root), null, null).syncStatus, 'SYNCED');
  f.write('src/domain/rules.ts', 'export const r = 2;\n');
  assert.equal(classify(start, fingerprint(f.root), null, null).syncStatus, 'SOURCE_MODIFIED');
});

test('a deleted backend file counts as a change', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  rmSync(path.join(f.root, 'server/app.ts'));
  assert.deepEqual(classify(start, fingerprint(f.root), 'a', 'a').changed, ['server/app.ts']);
});

test('an unreadable or empty fingerprint is UNKNOWN, never SYNCED', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const start = fingerprint(f.root);
  const now = fingerprint(f.root);
  now.unreadable.push('server/app.ts');
  assert.equal(classify(start, now, 'a', 'a').syncStatus, 'UNKNOWN');
  const empty = fingerprint(path.join(f.root, 'does-not-exist'));
  assert.equal(classify(empty, empty, 'a', 'a').syncStatus, 'UNKNOWN');
  if (process.platform !== 'win32') {
    chmodSync(path.join(f.root, 'server/app.ts'), 0o000);
    assert.equal(classify(start, fingerprint(f.root), 'a', 'a').syncStatus, process.getuid?.() === 0 ? 'SYNCED' : 'UNKNOWN');
  }
});

test('fingerprint keys use "/" on every platform', (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const keys = [...fingerprint(f.root).files.keys()];
  assert.ok(keys.includes('server/middleware/frontendHost.ts'));
  assert.ok(keys.every((k) => !k.includes('\\')));
});
