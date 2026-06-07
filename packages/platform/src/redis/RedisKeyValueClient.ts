import { createClient, RedisClientType } from 'redis';

interface SetOptions {
  NX?: true;
  EX?: number;
}

class RedisKeyValueClient {
  private readonly client: RedisClientType;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    this.client.on('error', (err) => console.error('redis key/value error', err.message));
    await this.client.connect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    options?: { nx?: boolean; ttlSeconds?: number }
  ): Promise<boolean> {
    const setOptions: SetOptions = {};

    if (options?.nx) {
      setOptions.NX = true;
    }

    if (options?.ttlSeconds) {
      setOptions.EX = options.ttlSeconds;
    }

    const result = await this.client.set(key, value, setOptions);

    return result === 'OK';
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export default RedisKeyValueClient;
