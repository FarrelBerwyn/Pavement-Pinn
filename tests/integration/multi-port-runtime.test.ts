/**
 * One runtime, several ports (2026-10-18): alias ports answer with the same runtime id, data
 * store and sessions; a port that is already taken makes startup fail without touching its holder.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { startServer } from '../../server/runtime/startServer';
import { loadServerConfig } from '../../server/config/env';

const freePort = () =>
  new Promise<number>((resolve) => {
    const s = http.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address() as AddressInfo;
      s.close(() => resolve(port));
    });
  });

test('alias ports reach the same runtime, store and session signer', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pinn-ports-'));
  const [a, b] = [await freePort(), await freePort()];
  const config = { ...loadServerConfig({ DATA_DIR: dir, NODE_ENV: 'production' } as NodeJS.ProcessEnv), host: '127.0.0.1' };
  const runtime = await startServer({ config, port: a, aliasPorts: [b] });
  t.after(async () => {
    await runtime.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const idA = await fetch(`http://127.0.0.1:${a}/api/runtime`).then((r) => r.json());
  const idB = await fetch(`http://127.0.0.1:${b}/api/runtime`).then((r) => r.json());
  assert.equal(idA.runtimeId, idB.runtimeId);
  assert.equal(idA.dataStore.storeId, idB.dataStore.storeId);
  assert.deepEqual(idA.ports, { primary: a, aliases: [b] });
  assert.equal(idB.requestPort, b);
  assert.doesNotMatch(JSON.stringify(idA), new RegExp(dir.replace(/[\\.]/g, '.')), 'no absolute store path in the response');

  // A session made through one port is valid through the other (one signer).
  const session = await fetch(`http://127.0.0.1:${a}/api/auth/anonymous`, { method: 'POST' }).then((r) => r.json());
  const me = await fetch(`http://127.0.0.1:${b}/api/auth/me`, { headers: { authorization: `Bearer ${session.token}` } }).then((r) => r.json());
  assert.equal(me.actor?.id, session.actor.id);
});

test('a taken port makes startup fail and leaves its holder running', async (t) => {
  const holder = http.createServer((_req, res) => res.end('holder'));
  await new Promise<void>((r) => holder.listen(0, '127.0.0.1', () => r()));
  const taken = (holder.address() as AddressInfo).port;
  const dir = mkdtempSync(path.join(tmpdir(), 'pinn-ports-'));
  t.after(() => {
    holder.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const config = { ...loadServerConfig({ DATA_DIR: dir, NODE_ENV: 'production' } as NodeJS.ProcessEnv), host: '127.0.0.1' };
  await assert.rejects(startServer({ config, port: taken }), (e: NodeJS.ErrnoException) => e.code === 'EADDRINUSE');
  assert.equal(await fetch(`http://127.0.0.1:${taken}/`).then((r) => r.text()), 'holder');
});
