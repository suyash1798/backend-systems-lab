import RedisPubSub from '../infra/redisPubSub';
import { GameSocket } from '../types/websocket';

interface PlayerJoinedInput {
  requestId?: string | null;
}

class GameEventPublisher {
  constructor(
    private readonly pubSub: RedisPubSub,
    private readonly serverId: string
  ) {}

  async playerJoined(
    ws: GameSocket,
    data: PlayerJoinedInput
  ): Promise<void> {
    const { requestId } = data;
    const userId = ws.userId!;
    const roomId = ws.roomId!;

    await this.pubSub.publish({
      type: 'player_joined',
      userId,
      roomId,
      requestId,
      sourceConnectionId: ws.id,
      serverId: this.serverId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default GameEventPublisher;
