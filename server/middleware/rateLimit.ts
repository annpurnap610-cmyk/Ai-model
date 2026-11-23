import type { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup to prevent unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, options.windowMs);

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      'unknown';

    const now = Date.now();
    const cutoff = now - options.windowMs;
    const entry = store.get(clientIp) ?? { timestamps: [] };
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

    if (entry.timestamps.length >= options.maxRequests) {
      const oldest = entry.timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: options.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    entry.timestamps.push(now);
    store.set(clientIp, entry);
    next();
  };
}
