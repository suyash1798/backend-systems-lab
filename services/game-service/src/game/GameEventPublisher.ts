import RedisPubSub from "../infra/redisPubSub";
import { GameSocket } from "../types/websocket";

interface PlayerJoinedInput {
  requestId?: string | null;
}

interface SpinCompletedInput {
  spinId: string;
  betAmount: number;
  winAmount: number;
  symbols: string[];
  balance: number;
  requestId: string;
}

class GameEventPublisher {
  constructor(
    private readonly pubSub: RedisPubSub,
    private readonly serverId: string,
  ) {}

  async playerJoined(
    ws: GameSocket,
    data: PlayerJoinedInput,
  ): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      return;
    }

    const { requestId } = data;

    await this.pubSub.publish({
      type: "player_joined",
      userId: ws.userId,
      roomId: ws.roomId,
      requestId,
      sourceConnectionId: ws.id,
      serverId: this.serverId,
      timestamp: new Date().toISOString(),
    });
  }

  async spinCompleted(ws: GameSocket, data: SpinCompletedInput): Promise<void> {
    if (!ws.userId || !ws.roomId) {
      return;
    }

    const { spinId, betAmount, winAmount, symbols, balance, requestId } = data;

    await this.pubSub.publish({
      type: "player_action",
      action: "spin",
      userId: ws.userId,
      roomId: ws.roomId,
      spinId,
      betAmount,
      winAmount,
      symbols,
      balance,
      requestId,
      sourceConnectionId: ws.id,
      serverId: this.serverId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default GameEventPublisher;
