import type { NextFunction, Request, Response } from "express";

/**
 * Fixed-window rate limiter kept in process memory (per client IP and bucket name).
 * Adequate for a single demo server; a multi-instance deployment needs a shared store.
 */
export function rateLimit(bucket: string, limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = `${bucket}:${req.ip}`;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return next();
    }
    entry.count += 1;
    if (entry.count > limit) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
      res.status(429).json({ success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } });
      return;
    }
    next();
  };
}
