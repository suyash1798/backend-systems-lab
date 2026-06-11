import { createClient, RedisClientType } from 'redis';
import tokenBucketLua from './tokenBucketLua';

export interface RateLimitRule {
  name: string;
  capacity: number;
  refillPerSecond: number;
  ttlSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
}

class RateLimiter {
  private readonly client: RedisClientType;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    this.client.on('error', (err) => console.error('rate limiter redis error', err.message));
    await this.client.connect();
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  async consume(rule: RateLimitRule, accountKey: string): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const key = `rate-limit:${rule.name}:${accountKey}`;

    const result = await this.client.eval(tokenBucketLua, {
      keys: [key],
      arguments: [
        rule.capacity.toString(),
        rule.refillPerSecond.toString(),
        now.toString(),
        '1',
        rule.ttlSeconds.toString()
      ]
    }) as [number, number, number];

    return {
      allowed: result[0] === 1,
      limit: rule.capacity,
      remaining: result[1],
      retryAfter: result[2]
    };
  }
}

export default RateLimiter;
