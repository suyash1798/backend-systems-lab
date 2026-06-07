import {
  GameEvent,
  GameSocket,
  PlayerActionEvent,
  PlayerJoinedEvent
} from '../types';

interface EventTransport<TEvent extends GameEvent> {
  publish(payload: TEvent): Promise<void>;
}

class EventPublisher<TEvent extends GameEvent = GameEvent> {
  constructor(
    private readonly transport: EventTransport<TEvent>,
    private readonly serverId: string
  ) {}

  async playerJoined(ws: GameSocket, data: { requestId?: string | null }): Promise<void> {
    await this.publish({
      type: 'player_joined',
      userId: ws.userId!,
      roomId: ws.roomId!,
      requestId: data.requestId,
      sourceConnectionId: ws.id,
      serverId: this.serverId,
      timestamp: new Date().toISOString()
    });
  }

  async playerAction(
    ws: GameSocket,
    action: string,
    data: Record<string, unknown> & {
      requestId?: string | null;
      serverId?: string;
      timestamp?: string;
    }
  ): Promise<void> {
    await this.publish({
      ...data,
      type: 'player_action',
      action,
      userId: ws.userId!,
      roomId: ws.roomId!,
      sourceConnectionId: ws.id,
      serverId: data.serverId || this.serverId,
      timestamp: data.timestamp || new Date().toISOString()
    });
  }

  private async publish(event: PlayerJoinedEvent | PlayerActionEvent): Promise<void> {
    await this.transport.publish(event as TEvent);
  }
}

export default EventPublisher;
