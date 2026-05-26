import RedisKeyValueClient from '../infra/RedisKeyValueClient';

interface StoredRequest {
  status: 'pending' | 'completed';
  response?: object;
}

class IdempotencyStore {
  constructor(
    private readonly redis: RedisKeyValueClient,
    private readonly ttlSeconds: number
  ) {}

  async get(key: string): Promise<StoredRequest | null> {
    const value = await this.redis.get(this.redisKey(key));
    return value ? JSON.parse(value) as StoredRequest : null;
  }

  async reserve(key: string): Promise<boolean> {
    return this.redis.set(
      this.redisKey(key),
      JSON.stringify({ status: 'pending' }),
      { nx: true, ttlSeconds: this.ttlSeconds }
    );
  }

  async complete(key: string, response: object): Promise<void> {
    await this.redis.set(
      this.redisKey(key),
      JSON.stringify({ status: 'completed', response }),
      { ttlSeconds: this.ttlSeconds }
    );
  }

  async release(key: string): Promise<void> {
    await this.redis.del(this.redisKey(key));
  }

  private redisKey(key: string): string {
    return `idempotency:${key}`;
  }
}

export default IdempotencyStore;
