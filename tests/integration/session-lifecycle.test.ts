/**
 * Session lifecycle: cookie persistence across "refreshes", the absolute 2-hour limit enforced
 * by the server, logout revocation, and keys/revocations that survive a server restart.
 *
 * The 2-hour boundary is tested with a fake clock on the signer; the HTTP flow runs a server
 * whose sessions last 1 second (a test-only runtime option), so nothing waits two hours and
 * the production limit is untouched.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../../server/app';
import { createWorkflowRuntime } from '../../server/services/workflowRuntime';
import { SESSION_MAX_AGE_SECONDS, SessionSigner, resolveSessionSecret } from '../../server/auth/sessionTokens';
import { loadServerConfig } from '../../server/config/env';
import { DEMO_CREDENTIALS } from '../../src/data/reference/demoCredentials';
import { sessionCookieToken } from '../helpers/sessionCookie';

const HOUR = 3600_000;
const SECRET = 'x'.repeat(40);
const ACTOR = { id: 'USR-008', role: 'OPERATIONS_MANAGER' as const, kind: 'DEMO_ACCOUNT' as const };

// ---------------------------------------------------------------------------------------------
// The limit itself (fake clock)
// ---------------------------------------------------------------------------------------------

test('the session limit is exactly 2 hours from login', () => {
  assert.equal(SESSION_MAX_AGE_SECONDS, 7200);
  const signer = new SessionSigner(SECRET);
  const t0 = Date.parse('2026-10-19T08:00:00Z');
  const { token, expiresAt, issuedAt } = signer.issue(ACTOR, t0);
  assert.equal(issuedAt, '2026-10-19T08:00:00.000Z');
  assert.equal(expiresAt, '2026-10-19T10:00:00.000Z');
  // 08:30 refresh, 09:00 navigation, 09:45 refresh, 09:59:59: still the same valid session.
  for (const at of [0.5, 1, 1.75, 2 - 1 / 3600]) assert.ok(signer.verify(token, t0 + at * HOUR), `valid at +${at}h`);
  // 10:00 and later: refused, reason EXPIRED.
  assert.deepEqual(signer.check(token, t0 + 2 * HOUR), { ok: false, reason: 'EXPIRED' });
  assert.deepEqual(signer.check(token, t0 + 5 * HOUR), { ok: false, reason: 'EXPIRED' });
});

test('a token never outlives the server limit, whatever lifetime it was issued with', () => {
  const t0 = Date.now();
  const longToken = new SessionSigner(SECRET, 8 * 3600).issue(ACTOR, t0).token;
  const signer = new SessionSigner(SECRET);
  assert.ok(signer.verify(longToken, t0 + 1 * HOUR));
  assert.deepEqual(signer.check(longToken, t0 + 2 * HOUR + 1000), { ok: false, reason: 'EXPIRED' });
});

test('logout revokes the token, and the revocation survives a restart', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pinn-session-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'revoked-sessions.json');
  const first = new SessionSigner(SECRET, SESSION_MAX_AGE_SECONDS, file);
  const { token } = first.issue(ACTOR);
  first.revoke(token);
  assert.deepEqual(first.check(token), { ok: false, reason: 'REVOKED' });
  const restarted = new SessionSigner(SECRET, SESSION_MAX_AGE_SECONDS, file);
  assert.deepEqual(restarted.check(token), { ok: false, reason: 'REVOKED' });
});

test('without SESSION_SECRET the signing key is kept in the data directory (restarts keep sessions)', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pinn-secret-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const key = resolveSessionSecret(undefined, dir);
  assert.ok(key && key.length >= 32);
  assert.equal(resolveSessionSecret(undefined, dir), key);
  const token = new SessionSigner(key).issue(ACTOR).token;
  assert.ok(new SessionSigner(resolveSessionSecret(undefined, dir)).verify(token), 'a restarted server accepts the session');
  assert.equal(resolveSessionSecret(SECRET, dir), SECRET, 'a configured secret always wins');
});

test('SESSION_MAX_AGE_SECONDS can only shorten the limit, and never in production', () => {
  assert.equal(loadServerConfig({}).sessionMaxAgeSeconds, 7200);
  assert.equal(loadServerConfig({ SESSION_MAX_AGE_SECONDS: '60' }).sessionMaxAgeSeconds, 60);
  assert.equal(loadServerConfig({ SESSION_MAX_AGE_SECONDS: '999999' }).sessionMaxAgeSeconds, 7200);
  assert.equal(loadServerConfig({ SESSION_MAX_AGE_SECONDS: '60', NODE_ENV: 'production' }).sessionMaxAgeSeconds, 7200);
});

// ---------------------------------------------------------------------------------------------
// Over HTTP (sessions of 1 second)
// ---------------------------------------------------------------------------------------------

let server: Server;
let base = '';

before(async () => {
  const workflow = createWorkflowRuntime({ sessionMaxAgeSeconds: 1 });
  const app = createApp({ workflow });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const cred = (role: string) => {
  const c = DEMO_CREDENTIALS.find((x) => x.role === role)!;
  return { username: c.username, password: c.password, layout: 'MODERN_APP' };
};

async function login(body: unknown) {
  const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { res, body: (await res.json()) as any, cookie: sessionCookieToken(res), setCookie: res.headers.get('set-cookie') ?? '' };
}

/** What a browser sends on every same-origin request after login: the cookie. */
const asBrowser = (cookie: string) => ({ Cookie: `pinn_session=${encodeURIComponent(cookie)}` });

async function me(cookie: string) {
  const res = await fetch(`${base}/api/auth/me`, { headers: asBrowser(cookie) });
  return { status: res.status, body: (await res.json()) as any, setCookie: res.headers.get('set-cookie') ?? '' };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('login sets an HttpOnly SameSite cookie and puts no token in the response body', async () => {
  const r = await login(cred('OPERATIONS_MANAGER'));
  assert.equal(r.res.status, 200);
  assert.equal(r.body.token, undefined);
  assert.ok(r.cookie);
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /SameSite=Lax/);
  assert.match(r.setCookie, /Path=\//);
  assert.ok(r.body.expiresAt && r.body.issuedAt);
});

test('every role resumes as itself from the cookie, and repeated refreshes do not move the deadline', async () => {
  for (const credential of DEMO_CREDENTIALS) {
    const r = await login({ username: credential.username, password: credential.password, layout: 'MODERN_APP' });
    const first = await me(r.cookie!);
    assert.equal(first.status, 200, credential.username);
    assert.equal(first.body.actor.role, credential.role);
    assert.equal(first.body.actor.id, credential.accounts.MODERN_APP);
    const second = await me(r.cookie!);
    assert.equal(second.body.expiresAt, first.body.expiresAt, 'refresh must not extend the session');
    assert.equal(first.body.expiresAt, r.body.expiresAt);
  }
});

test('at the limit the server refuses the session everywhere and clears the cookie', async () => {
  const r = await login(cred('FIELD_ENGINEER'));
  assert.equal((await me(r.cookie!)).status, 200);
  await sleep(1200);
  const expired = await me(r.cookie!);
  assert.equal(expired.status, 401);
  assert.equal(expired.body.error.code, 'SESSION_EXPIRED');
  assert.match(expired.setCookie, /pinn_session=;.*Max-Age=0/);
  // A protected API with the expired cookie is refused too, not served as a public visitor.
  const api = await fetch(`${base}/api/workflow/audit`, { headers: asBrowser(r.cookie!) });
  assert.equal(api.status, 401);
  assert.equal(((await api.json()) as any).error.code, 'SESSION_EXPIRED');
  // Signing in again starts a new session with a new deadline.
  const again = await login(cred('FIELD_ENGINEER'));
  assert.ok(Date.parse(again.body.expiresAt) > Date.parse(r.body.expiresAt));
  assert.equal((await me(again.cookie!)).status, 200);
});

test('logout ends the session on the server: the old cookie no longer works anywhere', async () => {
  const r = await login(cred('OPERATIONS_MANAGER'));
  const out = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: asBrowser(r.cookie!) });
  assert.equal(out.status, 200);
  assert.match(out.headers.get('set-cookie') ?? '', /pinn_session=;.*Max-Age=0/);
  const after = await me(r.cookie!);
  assert.equal(after.status, 401);
  assert.equal(after.body.error.code, 'SESSION_EXPIRED');
  const api = await fetch(`${base}/api/workflow/engineers`, { headers: asBrowser(r.cookie!) });
  assert.equal(api.status, 401);
});

test('no cookie means no session (a signed-out browser is not signed in by anything it stores)', async () => {
  const res = await fetch(`${base}/api/auth/me`);
  assert.equal(res.status, 401);
  assert.equal(((await res.json()) as any).error.code, 'UNAUTHENTICATED');
});
