import { createHash, timingSafeEqual } from "node:crypto";
import { accountIdFor, findDemoCredential, DEMO_CREDENTIALS } from "../../src/data/reference/demoCredentials";

/**
 * Demo credential check for POST /api/auth/login.
 *
 * Passwords are compared as SHA-256 digests in constant time, so the comparison does not
 * leak how much of a password matched. This is a demo boundary, not production
 * authentication: the credentials are public dummy values (src/data/reference/
 * demoCredentials.ts) and the check runs only while DEMO_AUTH is not "false".
 */
const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

const PASSWORD_DIGESTS = new Map(DEMO_CREDENTIALS.map((c) => [c.username, digest(c.password)]));
/** Compared against when the username is unknown, so both failures cost the same. */
const UNKNOWN_USER_DIGEST = digest("unknown-user-placeholder");

export type DemoLoginResult = { ok: true; accountId: string } | { ok: false; reason: "INVALID_CREDENTIALS" | "MISSING_FIELDS" };

export function verifyDemoLogin(identifier: unknown, password: unknown, layout?: unknown): DemoLoginResult {
  if (typeof identifier !== "string" || typeof password !== "string" || identifier.trim() === "" || password === "") {
    return { ok: false, reason: "MISSING_FIELDS" };
  }
  if (identifier.length > 254 || password.length > 256) return { ok: false, reason: "INVALID_CREDENTIALS" };
  const credential = findDemoCredential(identifier);
  const expected = credential ? PASSWORD_DIGESTS.get(credential.username) ?? UNKNOWN_USER_DIGEST : UNKNOWN_USER_DIGEST;
  const matches = timingSafeEqual(digest(password), expected);
  if (!credential || !matches) return { ok: false, reason: "INVALID_CREDENTIALS" };
  return { ok: true, accountId: accountIdFor(credential, layout) };
}
