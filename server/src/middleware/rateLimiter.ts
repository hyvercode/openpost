import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

/**
 * Middleware to track and limit the number of outgoing API requests per minute.
 * 
 * @param requestsPerMinute The maximum number of requests allowed in a one-minute window.
 */
export const rateLimiter = (requestsPerMinute: number = 60) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Identify user by userId if authenticated, otherwise fallback to IP
    const identifier = (req as any).user?.uid || req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    let record = rateLimits.get(identifier);

    if (!record || now > record.resetTime) {
      // Create new window
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimits.set(identifier, record);
      return next();
    }

    // Increment count
    record.count++;

    if (record.count > requestsPerMinute) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      console.warn(`[RateLimit] User ${identifier} exceeded limit: ${record.count}/${requestsPerMinute} req/min. Retry in ${retryAfter}s`);
      return res.status(429).json({
        error: 'Too many requests',
        message: `API request limit exceeded (${requestsPerMinute} req/min). Please try again in ${retryAfter} seconds.`,
        retryAfterMs: record.resetTime - now
      });
    }

    next();
  };
};
