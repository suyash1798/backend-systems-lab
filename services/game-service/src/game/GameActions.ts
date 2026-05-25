import RedisPubSub from '../infra/redisPubSub';
import RequestLogger from '../observability/RequestLogger';
import { IncomingMessagePayload, GameSocket } from '../types/websocket';
import { joinAction } from './actions/joinAction';
import { spinAction } from './actions/spinAction';
import {
  ActionContext,
  RequestTrace,
  send,
  WalletAdjustHandler
} from './actions/types';

export { WalletAdjustHandler };

class GameActions {
  private readonly context: ActionContext;

  constructor(
    adjustWallet: WalletAdjustHandler,
    pubSub: RedisPubSub,
    serverId: string,
    logger = new RequestLogger()
  ) {
    this.context = { adjustWallet, pubSub, serverId, logger };
  }

  async handle(ws: GameSocket, payload: IncomingMessagePayload): Promise<void> {
    const startedAt = Date.now();
    const trace = this.trace(ws, payload);
    const { action, requestId } = payload;

    if (requestId && ws.processedRequests.has(requestId)) {
      this.context.logger.duplicateCompleted(trace, startedAt);
      send(ws, { ...ws.processedRequests.get(requestId), duplicate: true });
      return;
    }

    if (requestId && ws.pendingRequests.has(requestId)) {
      this.context.logger.duplicatePending(trace, startedAt);
      send(ws, { status: 'pending', duplicate: true, requestId });
      return;
    }

    this.context.logger.started(trace);

    if (action === 'join') {
      await joinAction(ws, payload, this.context, trace, startedAt);
      return;
    }

    if (action === 'spin') {
      await spinAction(ws, payload, this.context, trace, startedAt);
      return;
    }

    this.context.logger.failed(trace, startedAt, 'invalid message');
    send(ws, { status: 'error', error: 'invalid message', requestId });
  }

  private trace(ws: GameSocket, payload: IncomingMessagePayload): RequestTrace {
    return {
      action: payload.action,
      requestId: payload.requestId,
      connectionId: ws.id,
      userId: payload.userId || ws.userId,
      roomId: payload.roomId || ws.roomId
    };
  }
}

export default GameActions;
