import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Actor } from "../../src/domain/workflow/model";

/**
 * Server-issued session tokens (HMAC-SHA256 over a small JSON payload).
 *
 * What this is: the server decides the actor for every workflow request from a token it
 * signed itself, so a browser cannot claim another role by editing a request body or
 * sessionStorage.
 *
 * What this is NOT: authentication. In demo mode anyone may ask for a token for any demo
 * account (that is the account picker). Production needs a real identity provider
 * (Supabase Auth is the planned one, docs/DECISION_LOG.md D-021) whose verified JWT
 * replaces `/api/auth/demo-session`; set DEMO_AUTH=false to switch the picker off.
 */
export interface SessionPayload {
  sub: string;
  role: Actor["role"];
  kind: Actor["kind"];
  /** Expiry, seconds since epoch. */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export class SessionSigner {
  private readonly key: Buffer;

  constructor(secret: string | undefined, private readonly ttlSeconds = 8 * 3600) {
    // Without a configured secret, tokens are valid only for this server process.
    this.key = secret && secret.length >= 32 ? Buffer.from(secret, "utf8") : randomBytes(32);
  }

  issue(actor: Actor, nowMs = Date.now()): { token: string; expiresAt: string } {
    const payload: SessionPayload = { sub: actor.id, role: actor.role, kind: actor.kind, exp: Math.floor(nowMs / 1000) + this.ttlSeconds };
    const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
    const sig = b64url(createHmac("sha256", this.key).update(body).digest());
    return { token: `${body}.${sig}`, expiresAt: new Date(payload.exp * 1000).toISOString() };
  }

  /** Returns the actor for a valid, unexpired token; null otherwise (never throws). */
  verify(token: string | undefined | null, nowMs = Date.now()): Actor | null {
    if (!token || typeof token !== "string" || token.length > 2048) return null;
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = createHmac("sha256", this.key).update(body).digest();
    let given: Buffer;
    try {
      given = Buffer.from(sig, "base64url");
    } catch {
      return null;
    }
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    let payload: SessionPayload;
    try {
      payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      return null;
    }
    if (!payload || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= nowMs) return null;
    return { id: payload.sub, role: payload.role, kind: payload.kind };
  }
}

/** Opaque claim token handed once to an anonymous reporter; only its hash is stored. */
export function newClaimToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashClaimToken(token) };
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
