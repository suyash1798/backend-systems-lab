import RedisPubSub from '../infra/redisPubSub';
import RequestLogger from '../observability/RequestLogger';
import { IncomingMessagePayload, GameSocket } from '../types/websocket';
import { joinAction } from './actions/joinAction';
import { spinAction } from './actions/spinAction';
import GameEventPublisher from './GameEventPublisher';
import GameResponseSender from './GameResponseSender';
import IdempotencyStore from './IdempotencyStore';
import Idempotency from './idempotency';
import {
  ActionContext,
  RequestTrace,
  WalletAdjustHandler
} from './actions/types';

export { WalletAdjustHandler };

class GameActions {
  private readonly context: ActionContext;
  private readonly idempotency: Idempotency;

  constructor(
    adjustWallet: WalletAdjustHandler,
    pubSub: RedisPubSub,
    serverId: string,
    idempotencyStore: IdempotencyStore,
    logger = new RequestLogger(),
    responder = new GameResponseSender(),
    idempotency = new Idempotency()
  ) {
    this.idempotency = idempotency;
    this.context = {
      adjustWallet,
      publisher: new GameEventPublisher(pubSub, serverId),
      idempotencyStore,
      logger,
      responder
    };
  }

  async handle(ws: GameSocket, payload: IncomingMessagePayload): Promise<void> {
    const startedAt = Date.now();
    const trace = this.trace(ws, payload);
    const { action, requestId } = payload;
    const key = this.idempotency.key(ws, payload);

    if (key && ws.processedRequests.has(key)) {
      this.context.logger.duplicateCompleted(trace, startedAt);
      const response = ws.processedRequests.get(key) || {};
      this.restoreSocketContext(ws, response);
      this.context.responder.duplicate(ws, response);
      return;
    }

    if (key && ws.pendingRequests.has(key)) {
      this.context.logger.duplicatePending(trace, startedAt);
      this.context.responder.pending(ws, requestId);
      return;
    }

    if (key) {
      const stored = await this.context.idempotencyStore.get(key);

      if (stored?.status === 'completed') {
        this.context.logger.duplicateCompleted(trace, startedAt);
        const response = stored.response || {};
        this.restoreSocketContext(ws, response);
        this.context.responder.duplicate(ws, response);
        return;
      }

      if (stored?.status === 'pending') {
        this.context.logger.duplicatePending(trace, startedAt);
        this.context.responder.pending(ws, requestId);
        return;
      }
    }

    this.context.logger.started(trace);

    if (action === 'join') {
      await joinAction(ws, payload, this.context, trace, startedAt, key);
      return;
    }

    if (action === 'spin') {
      await spinAction(ws, payload, this.context, trace, startedAt, key);
      return;
    }

    this.context.logger.failed(trace, startedAt, 'invalid message');
    this.context.responder.error(ws, 'invalid message', requestId);
  }

  private trace(ws: GameSocket, payload: IncomingMessagePayload): RequestTrace {
    return {
      action: payload.action,
      requestId: payload.requestId,
      idempotencyKey: this.idempotency.key(ws, payload),
      connectionId: ws.id,
      userId: payload.userId || ws.userId,
      roomId: payload.roomId || ws.roomId
    };
  }

  private restoreSocketContext(ws: GameSocket, response: object): void {
    const payload = response as { action?: string; userId?: string; roomId?: string };

    if (payload.action === 'joined') {
      ws.userId = payload.userId || ws.userId;
      ws.roomId = payload.roomId || ws.roomId;
    }
  }
}

export default GameActions;
