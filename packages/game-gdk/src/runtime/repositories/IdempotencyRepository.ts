import { IdempotencyStore, StoredIdempotencyRequest } from '../../types';
import { KeyValueStore } from './CurrentRoundRepository';

class IdempotencyRepository implements IdempotencyStore {
  constructor(
    private readonly store: KeyValueStore,
    private readonly ttlSeconds: number
  ) {}

  async get(key: string): Promise<StoredIdempotencyRequest | null> {
    const value = await this.store.get(this.redisKey(key));
    return value ? JSON.parse(value) as StoredIdempotencyRequest : null;
  }

  async reserve(key: string): Promise<boolean> {
    return this.store.set(
      this.redisKey(key),
      JSON.stringify({ status: 'pending' }),
      { nx: true, ttlSeconds: this.ttlSeconds }
    );
  }

  async complete(key: string, response: object): Promise<void> {
    await this.store.set(
      this.redisKey(key),
      JSON.stringify({ status: 'completed', response }),
      { ttlSeconds: this.ttlSeconds }
    );
  }

  async release(key: string): Promise<void> {
    await this.store.del(this.redisKey(key));
  }

  private redisKey(key: string): string {
    return `idempotency:${key}`;
  }
}

export default IdempotencyRepository;
