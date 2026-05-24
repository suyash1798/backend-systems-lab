import RedisPubSub from '../infra/redisPubSub';
import RequestLogger from '../observability/RequestLogger';
import { WalletAdjustResponse, WalletError } from '../types/wallet';
import { GameSocket, IncomingMessagePayload } from '../types/websocket';

export type PlayHandler = (userId: string) => Promise<WalletAdjustResponse>;

class GameActions {
  constructor(
    private readonly playHandler: PlayHandler,
    private readonly pubSub: RedisPubSub,
    private readonly serverId: string,
    private readonly logger = new RequestLogger()
  ) {}

  async handle(ws: GameSocket, payload: IncomingMessagePayload): Promise<void> {
    const startedAt = Date.now();
    const { userId, roomId, requestId } = payload;
    const action = payload.action;
    const trace = {
      action,
      requestId,
      connectionId: ws.id,
      userId: userId || ws.userId,
      roomId: roomId || ws.roomId
    };

    if (requestId && ws.processedRequests.has(requestId)) {
      const response = ws.processedRequests.get(requestId);
      this.logger.duplicateCompleted(trace, startedAt);
      this.send(ws, { ...response, duplicate: true });
      return;
    }

    if (requestId && ws.pendingRequests.has(requestId)) {
      this.logger.duplicatePending(trace, startedAt);
      this.send(ws, { status: 'pending', duplicate: true, requestId });
      return;
    }

    this.logger.started(trace);

    if (action === 'join') {
      if (!userId || !roomId) {
        this.logger.failed(trace, startedAt, 'userId and roomId required');
        this.send(ws, { status: 'error', error: 'userId and roomId required', requestId });
        return;
      }

      ws.userId = userId;
      ws.roomId = roomId;

      const response = { status: 'ok', action: 'joined', userId, roomId, requestId };
      this.remember(ws, requestId, response);
      this.send(ws, response);
      this.logger.completed({ ...trace, userId, roomId }, startedAt);

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

    if (action !== 'play') {
      this.logger.failed(trace, startedAt, 'invalid message');
      this.send(ws, { status: 'error', error: 'invalid message', requestId });
      return;
    }

    if (!requestId) {
      this.logger.failed(trace, startedAt, 'requestId required');
      this.send(ws, { status: 'error', error: 'requestId required' });
      return;
    }

    if (!ws.userId || !ws.roomId) {
      this.logger.failed(trace, startedAt, 'join required');
      this.send(ws, { status: 'error', error: 'join required', requestId });
      return;
    }

    const playUserId = ws.userId;
    const playRoomId = ws.roomId;
    ws.pendingRequests.add(requestId);

    let data: WalletAdjustResponse;

    try {
      data = await this.playHandler(playUserId);
    } catch (err) {
      const walletErr = err as WalletError;
      this.logger.failed(trace, startedAt, walletErr.message);
      this.send(ws, {
        status: 'error',
        error: walletErr.message,
        detail: walletErr.detail || null,
        requestId
      });
      ws.pendingRequests.delete(requestId);
      return;
    }

    const response = { status: 'ok', balance: data.balance, requestId };
    this.remember(ws, requestId, response);
    this.send(ws, response);
    ws.pendingRequests.delete(requestId);
    this.logger.completed(trace, startedAt);

    try {
      await this.pubSub.publish({
        type: 'player_action',
        action: 'play',
        userId: playUserId,
        roomId: playRoomId,
        balance: data.balance,
        requestId,
        sourceConnectionId: ws.id,
        serverId: this.serverId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      this.logger.redisPublishFailed(trace, err as Error);
    }
  }

  private remember(ws: GameSocket, requestId: string | null | undefined, response: object): void {
    if (requestId) {
      ws.processedRequests.set(requestId, response);
    }
  }

  private send(ws: GameSocket, payload: object): void {
    ws.send(JSON.stringify(payload));
  }
}

export default GameActions;
