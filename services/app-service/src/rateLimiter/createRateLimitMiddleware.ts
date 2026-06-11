import { Request, RequestHandler, Response } from 'express';
import RateLimiter, { RateLimitRule } from './RateLimiter';

interface RateLimitOptions {
  rule: RateLimitRule;
  key: (req: Request) => string;
}

function createRateLimitMiddleware(
  limiter: RateLimiter,
  options: RateLimitOptions
): RequestHandler {
  return async (req, res, next) => {
    const result = await limiter.consume(options.rule, options.key(req));

    setRateLimitHeaders(res, result.limit, result.remaining, result.retryAfter);

    if (!result.allowed) {
      res.status(429).json({ error: 'rate limit exceeded' });
      return;
    }

    next();
  };
}

function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  retryAfter: number
): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());

  if (retryAfter > 0) {
    res.setHeader('Retry-After', retryAfter.toString());
  }
}

export default createRateLimitMiddleware;
