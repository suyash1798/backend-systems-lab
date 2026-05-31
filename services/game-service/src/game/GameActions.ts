import RedisPubSub from '../infra/redisPubSub';
import RequestLogger from '../observability/RequestLogger';
import { IncomingMessagePayload, GameSocket } from '../types/websocket';
import { joinAction } from './actions/joinAction';
import { spinAction } from './actions/spinAction';
import { endRoundAction } from './actions/endRoundAction';
import { persistentDataAction } from './actions/persistentDataAction';
import GameEventPublisher from './GameEventPublisher';
import GamePlayerDataRepository from '../repositories/GamePlayerDataRepository';
import GameResponseSender from './GameResponseSender';
import CurrentRoundRepository from '../repositories/CurrentRoundRepository';
import IdempotencyRepository from '../repositories/IdempotencyRepository';
import Idempotency from './idempotency';
import RoundActionRepository from '../repositories/RoundActionRepository';
import RoundRepository from '../repositories/RoundRepository';
import SpinRepository from '../repositories/SpinRepository';
import RoomMembershipRepository from '../repositories/RoomMembershipRepository';
import GamePlayerDataService from './services/GamePlayerDataService';
import RoundService from './services/RoundService';
import SpinService from './services/SpinService';
import JwtTokenVerifier from '../infra/JwtTokenVerifier';
import {
  ActionContext,
  RequestTrace,
  WalletCreditHandler,
  WalletDeductHandler
} from './actions/types';

export { WalletCreditHandler, WalletDeductHandler };

class GameActions {
  private readonly context: ActionContext;
  private readonly idempotency: Idempotency;

  constructor(
    deductWallet: WalletDeductHandler,
    creditWallet: WalletCreditHandler,
    pubSub: RedisPubSub,
    serverId: string,
    gamePlayerDataRepository: GamePlayerDataRepository,
    currentRoundRepository: CurrentRoundRepository,
    idempotencyRepository: IdempotencyRepository,
    roomMembershipRepository: RoomMembershipRepository,
    roundActionRepository: RoundActionRepository,
    roundRepository: RoundRepository,
    spinRepository: SpinRepository,
    private readonly tokenVerifier: JwtTokenVerifier,
    logger = new RequestLogger(),
    responder = new GameResponseSender(),
    idempotency = new Idempotency()
  ) {
    this.idempotency = idempotency;
    this.context = {
      gamePlayerDataService: new GamePlayerDataService(gamePlayerDataRepository),
      publisher: new GameEventPublisher(pubSub, serverId),
      idempotencyRepository,
      roomMembershipRepository,
      roundService: new RoundService(currentRoundRepository, roundRepository, roundActionRepository),
      spinService: new SpinService(
        deductWallet,
        creditWallet,
        currentRoundRepository,
        roundRepository,
        spinRepository
      ),
      logger,
      responder
    };
  }

  async handle(ws: GameSocket, payload: IncomingMessagePayload): Promise<void> {
    const startedAt = Date.now();
    try {
      this.attachPlayerId(payload);
    } catch (err) {
      this.context.responder.error(ws, 'invalid token', payload.requestId);
      return;
    }

    const trace = this.trace(ws, payload);
    const { action, requestId } = payload;
    const key = this.idempotency.key(ws, payload);

    if (action === 'join') {
      if (!payload.userId) {
        this.context.logger.failed(trace, startedAt, 'invalid token');
        this.context.responder.error(ws, 'invalid token', requestId);
        return;
      }

      if (!await this.context.roomMembershipRepository.exists(payload.userId, payload.roomId)) {
        this.context.logger.failed(trace, startedAt, 'room membership required');
        this.context.responder.error(ws, 'room membership required', requestId);
        return;
      }
    }

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
      const stored = await this.context.idempotencyRepository.get(key);

      if (stored?.status === 'completed') {
        if (this.hasConflict(payload, stored.response)) {
          this.context.logger.failed(trace, startedAt, 'idempotency conflict');
          this.context.responder.error(ws, 'idempotency conflict', requestId);
          return;
        }

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

    if (action === 'end_round') {
      await endRoundAction(ws, payload, this.context, trace, startedAt, key);
      return;
    }

    if (action === 'persistent_data') {
      await persistentDataAction(ws, payload, this.context, trace, startedAt, key);
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
      userId: this.payloadUserId(payload) || ws.userId,
      roomId: this.payloadRoomId(payload) || ws.roomId
    };
  }

  private attachPlayerId(payload: IncomingMessagePayload): void {
    if (payload.action !== 'join') {
      return;
    }

    payload.userId = this.tokenVerifier.playerId(payload.token);
  }

  private restoreSocketContext(ws: GameSocket, response: object): void {
    const payload = response as { action?: string; userId?: string; roomId?: string };

    if (payload.action === 'joined') {
      ws.userId = payload.userId || ws.userId;
      ws.roomId = payload.roomId || ws.roomId;
    }
  }

  private hasConflict(payload: IncomingMessagePayload, response?: object): boolean {
    if (payload.action !== 'spin' || !response) {
      return false;
    }

    const spin = response as { betAmount?: number; gameId?: string; spinId?: string };

    return (
      spin.betAmount !== payload.betAmount ||
      spin.gameId !== payload.gameId ||
      spin.spinId !== payload.spinId
    );
  }

  private payloadUserId(payload: IncomingMessagePayload): string | null {
    return payload.action === 'join' ? payload.userId || null : null;
  }

  private payloadRoomId(payload: IncomingMessagePayload): string | null {
    return payload.action === 'join' ? payload.roomId : null;
  }
}

export default GameActions;
