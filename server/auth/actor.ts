import type { Request, Response } from "express";
import type { Actor } from "../../src/domain/workflow/model";
import type { WorkflowRuntime } from "../services/workflowRuntime";
import type { VerifyResult } from "./sessionTokens";

/** HttpOnly cookie that carries a signed-in account's session (script cannot read it). */
export const SESSION_COOKIE = "pinn_session";

function cookieToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(eq + 1).trim()) || null;
  }
  return null;
}

/** The credential on this request: an explicit bearer token first (anonymous visitors), else the session cookie. */
export function credentialFrom(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim() || null;
  return cookieToken(req);
}

export function sessionFrom(req: Request, runtime: WorkflowRuntime): VerifyResult {
  return runtime.signer.check(credentialFrom(req));
}

/** The actor for this request, from a server-signed token; null when absent, invalid, expired or revoked. */
export function actorFrom(req: Request, runtime: WorkflowRuntime): Actor | null {
  const session = sessionFrom(req, runtime);
  return session.ok ? session.actor : null;
}

const secureCookie = (req: Request) => req.secure || process.env.NODE_ENV === "production";

/** Sets the session cookie to live exactly until the token's absolute expiry. */
export function setSessionCookie(req: Request, res: Response, token: string, expiresAt: string): void {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie(req) ? "; Secure" : ""}`
  );
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie(req) ? "; Secure" : ""}`);
}
