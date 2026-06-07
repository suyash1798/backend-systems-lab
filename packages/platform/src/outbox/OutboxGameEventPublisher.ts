import { OutboxStore } from './types';

class OutboxGameEventPublisher {
  constructor(private readonly outboxStore: OutboxStore) {}

  async publish(eventKey: string, eventType: string, payload: object): Promise<void> {
    await this.outboxStore.create(eventKey, eventType, payload);
  }
}

export default OutboxGameEventPublisher;
