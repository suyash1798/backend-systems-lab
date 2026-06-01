import RedisPubSub from '../infra/redisPubSub';
import RequestLogger from '../observability/RequestLogger';
import {
  EndRoundPayload,
  IncomingMessagePayload,
  GameSocket,
  JoinPayload,
  PersistentDataPayload,
  SpinPayload
} from '../types/websocket';
import JoinAction from './actions/joinAction';
import SpinAction from './actions/spinAction';
import EndRoundAction from './actions/endRoundAction';
import PersistentDataAction from './actions/persistentDataAction';
import ActionExecutor from './actions/ActionExecutor';
import { GameActionHandler } from './actions/GameActionHandler';
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
  private readonly executor: ActionExecutor;
  private readonly handlers: {
    join: GameActionHandler<JoinPayload>;
    spin: GameActionHandler<SpinPayload>;
    end_round: GameActionHandler<EndRoundPayload>;
    persistent_data: GameActionHandler<PersistentDataPayload>;
  };

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
    this.executor = new ActionExecutor(this.context);
    this.handlers = {
      join: new JoinAction(this.context),
      spin: new SpinAction(this.context),
      end_round: new EndRoundAction(this.context),
      persistent_data: new PersistentDataAction(this.context)
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

    const handler = this.handlers[payload.action] as GameActionHandler<IncomingMessagePayload>;
    const idempotencyKey = await this.idempotencyKey(ws, payload);
    const trace = this.trace(ws, payload, idempotencyKey);

    await this.executor.execute({
      ws,
      payload,
      trace,
      startedAt,
      idempotencyKey,
      handler,
      hasConflict: (response) => this.hasConflict(payload, response),
      onDuplicateResponse: (response) => this.restoreSocketContext(ws, response)
    });
  }

  private async idempotencyKey(
    ws: GameSocket,
    payload: IncomingMessagePayload
  ): Promise<string | null> {
    return this.idempotency.key(ws, payload, {
      activeRoundId: async (userId, roomId) => {
        const round = await this.context.spinService.activeRound(userId, roomId);
        return round.roundId;
      }
    });
  }

  private trace(
    ws: GameSocket,
    payload: IncomingMessagePayload,
    idempotencyKey: string | null
  ): RequestTrace {
    return {
      action: payload.action,
      requestId: payload.requestId,
      idempotencyKey,
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
