import RedisPubSub from '../../infra/redisPubSub';
import { GameSocket } from '../../types/websocket';
import { SpinResponse } from './Service';

class EventPublisher {
  constructor(
    private readonly pubSub: RedisPubSub,
    private readonly serverId: string
  ) {}

  async spinCompleted(ws: GameSocket, spin: SpinResponse): Promise<void> {
    await this.pubSub.publish({
      type: 'player_action',
      action: 'spin',
      userId: ws.userId!,
      roomId: ws.roomId!,
      roundId: spin.roundId,
      spinId: spin.spinId,
      betAmount: spin.betAmount,
      winAmount: spin.winAmount,
      symbols: spin.symbols,
      balance: spin.balance,
      requestId: spin.requestId,
      sourceConnectionId: ws.id,
      serverId: this.serverId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default EventPublisher;
