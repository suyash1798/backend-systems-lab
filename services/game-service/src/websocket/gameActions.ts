import RedisPubSub from '../infra/redisPubSub';
import { WalletAdjustResponse, WalletError } from '../types/wallet';
import { GameSocket, IncomingMessagePayload } from '../types/websocket';

export type PlayHandler = (userId: string) => Promise<WalletAdjustResponse>;

class GameActions {
  constructor(
    private readonly playHandler: PlayHandler,
    private readonly pubSub: RedisPubSub,
    private readonly serverId: string
  ) {}

  async handle(ws: GameSocket, payload: IncomingMessagePayload): Promise<void> {
    const { userId, roomId, requestId } = payload;

    if (payload.action === 'join') {
      if (!userId || !roomId) {
        this.send(ws, { status: 'error', error: 'userId and roomId required', requestId });
        return;
      }

      ws.userId = userId;
      ws.roomId = roomId;

      this.send(ws, { status: 'ok', action: 'joined', userId, roomId, requestId });
      await this.pubSub.publish({
        type: 'player_joined',
        userId,
        roomId,
        requestId,
        sourceConnectionId: ws.id,
        serverId: this.serverId,
        timestamp: new Date().toISOString()
      });

      return;
    }

    if (payload.action !== 'play') {
      this.send(ws, { status: 'error', error: 'invalid message', requestId });
      return;
    }

    if (!userId) {
      this.send(ws, { status: 'error', error: 'userId required', requestId });
      return;
    }

    const playRoomId = roomId || ws.roomId || 'global';
    ws.userId = userId;
    ws.roomId = playRoomId;

    try {
      const data = await this.playHandler(userId);
      this.send(ws, { status: 'ok', balance: data.balance, requestId });

      await this.pubSub.publish({
        type: 'player_action',
        action: 'play',
        userId,
        roomId: playRoomId,
        balance: data.balance,
        requestId,
        sourceConnectionId: ws.id,
        serverId: this.serverId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      const walletErr = err as WalletError;
      this.send(ws, {
        status: 'error',
        error: walletErr.message,
        detail: walletErr.detail || null,
        requestId
      });
    }
  }

  private send(ws: GameSocket, payload: object): void {
    ws.send(JSON.stringify(payload));
  }
}

export default GameActions;
