import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * LOAD_TEST bypass
 * ─────────────────────────────────────────────────────────────────────────────
 * When the environment variable LOAD_TEST=true is set, all rate limiters in
 * this file are replaced with a no-op pass-through middleware.
 *
 * Usage (benchmark run):
 *   1. Add  LOAD_TEST=true  to server/.env
 *   2. Restart the server:  npm run dev
 *   3. Run:  k6 run load_test.js
 *   4. After the test:  remove or set LOAD_TEST=false  and restart the server.
 *
 * ⚠️  NEVER leave LOAD_TEST=true in a production environment.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const isLoadTest = process.env.LOAD_TEST === 'true';

/** No-op middleware used when LOAD_TEST=true to bypass all rate limiters. */
const noopLimiter = (_req: Request, _res: Response, next: NextFunction): void => next();

/**
 * Creates a rate limiter or a no-op, depending on the LOAD_TEST flag.
 */
function createLimiter(options: Parameters<typeof rateLimit>[0]): RateLimitRequestHandler | typeof noopLimiter {
  if (isLoadTest) {
    console.warn(`⚠️  [LOAD_TEST] Rate limiter DISABLED for benchmark run.`);
    return noopLimiter;
  }
  return rateLimit(options);
}

export const otpRateLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // Limit each IP to 1 request per `window` (here, per minute)
  message: { message: 'Too many OTP requests from this IP, please try again after a minute' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const allocationRateLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per `window` (here, per minute)
  message: { message: 'Too many allocation requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
