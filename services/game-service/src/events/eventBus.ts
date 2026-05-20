import { EventHandler, PlayerEvent, PubSubTransport } from '../types/events';

class EventBus {
  private readonly pubSub: PubSubTransport | null;
  private readonly serverId: string;
  private readonly handlers: EventHandler[] = [];

  constructor({ pubSub = null, serverId }: { pubSub?: PubSubTransport | null; serverId: string }) {
    this.pubSub = pubSub;
    this.serverId = serverId;
  }

  async start(): Promise<void> {
    if (!this.pubSub) {
      return;
    }

    await this.pubSub.connect((event) => this.emit(event));
  }

  subscribe(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  async publish(event: PlayerEvent): Promise<void> {
    const enrichedEvent: PlayerEvent = {
      ...event,
      serverId: this.serverId,
      timestamp: new Date().toISOString()
    };

    if (!this.pubSub) {
      this.emit(enrichedEvent);
      return;
    }

    try {
      await this.pubSub.publish(enrichedEvent);
    } catch (err) {
      console.error('event publish error', (err as Error).message);
    }
  }

  emit(event: PlayerEvent): void {
    this.handlers.forEach((handler) => handler(event));
  }

  async stop(): Promise<void> {
    if (this.pubSub) {
      await this.pubSub.close();
    }
  }
}

export default EventBus;
