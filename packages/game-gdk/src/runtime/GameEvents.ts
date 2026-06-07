export interface GameEventPublisher {
  publish(eventKey: string, eventType: string, payload: object): Promise<void>;
}

class GameEvents {
  constructor(private readonly publisher: GameEventPublisher) {}

  async publish(eventKey: string, eventType: string, payload: object): Promise<void> {
    await this.publisher.publish(eventKey, eventType, payload);
  }

  async actionCompleted(action: string, payload: object, eventKey: string): Promise<void> {
    await this.publish(eventKey, `${action}_completed`, payload);
  }
}

export default GameEvents;
