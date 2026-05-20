import { createClient, RedisClientType } from 'redis';
import { EventHandler, PlayerEvent, PubSubTransport } from '../types/events';

class RedisPubSub implements PubSubTransport {
  private readonly channel: string;
  private readonly publisher: RedisClientType;
  private readonly subscriber: RedisClientType;

  constructor({ url, channel }: { url: string; channel: string }) {
    this.channel = channel;
    this.publisher = createClient({ url });
    this.subscriber = this.publisher.duplicate();
  }

  async connect(onMessage: EventHandler): Promise<void> {
    this.publisher.on('error', (err) => console.error('redis publisher error', err.message));
    this.subscriber.on('error', (err) => console.error('redis subscriber error', err.message));

    await this.publisher.connect();
    await this.subscriber.connect();
    await this.subscriber.subscribe(this.channel, (message) => this.handleMessage(message, onMessage));

    console.log(`redis pubsub connected on ${this.channel}`);
  }

  async publish(payload: PlayerEvent): Promise<void> {
    await this.publisher.publish(this.channel, JSON.stringify(payload));
  }

  async close(): Promise<void> {
    await Promise.allSettled([
      this.subscriber.quit(),
      this.publisher.quit()
    ]);
  }

  private handleMessage(message: string, onMessage: EventHandler): void {
    try {
      onMessage(JSON.parse(message) as PlayerEvent);
    } catch (err) {
      console.error('redis message parse error', (err as Error).message);
    }
  }
}

export default RedisPubSub;
