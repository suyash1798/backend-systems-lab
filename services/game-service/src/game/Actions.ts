import {
  ActionExecutor,
  GameActionHandler,
  GameSocket,
  ResponseSender
} from '@trying-sd/game-gdk';
import RedisPubSub from '../infra/redisPubSub';
import RequestLogger from '../observability/RequestLogger';
import { IncomingMessagePayload } from '../types/websocket';
import JoinAction from './actions/joinAction';
import EndRoundAction from './actions/endRoundAction';
import PersistentDataAction from './actions/persistentDataAction';
import EventPublisher from './EventPublisher';
import GamePlayerDataRepository from '../repositories/GamePlayerDataRepository';
import CurrentRoundRepository from '../repositories/CurrentRoundRepository';
import IdempotencyRepository from '../repositories/IdempotencyRepository';
import Idempotency from './idempotency';
import RoundActionRepository from '../repositories/RoundActionRepository';
import RoundRepository from '../repositories/RoundRepository';
import RoomMembershipRepository from '../repositories/RoomMembershipRepository';
import GamePlayerDataService from './services/GamePlayerDataService';
import RoundService from './services/RoundService';
import JwtTokenVerifier from '../infra/JwtTokenVerifier';
import { ActionContext, GameFeature, RequestTrace } from './types';

type ActionHandlers = {
  [Action in IncomingMessagePayload['action']]: GameActionHandler<
    Extract<IncomingMessagePayload, { action: Action }>
  >;
};

class Actions {
  private readonly context: ActionContext;
  private readonly idempotency: Idempotency;
  private readonly executor: ActionExecutor;
  private readonly handlers: ActionHandlers;
  private readonly features: GameFeature[];

  constructor(
    pubSub: RedisPubSub,
    serverId: string,
    gamePlayerDataRepository: GamePlayerDataRepository,
    currentRoundRepository: CurrentRoundRepository,
    idempotencyRepository: IdempotencyRepository,
    roomMembershipRepository: RoomMembershipRepository,
    roundActionRepository: RoundActionRepository,
    roundRepository: RoundRepository,
    private readonly tokenVerifier: JwtTokenVerifier,
    features: GameFeature[] = [],
    logger = new RequestLogger(),
    responder = new ResponseSender(),
    idempotency = new Idempotency()
  ) {
    this.idempotency = idempotency;
    this.features = features;

    this.context = {
      gamePlayerDataService: new GamePlayerDataService(gamePlayerDataRepository),
      publisher: new EventPublisher(pubSub, serverId),
      idempotencyRepository,
      roomMembershipRepository,
      roundService: new RoundService(currentRoundRepository, roundRepository, roundActionRepository),
      roomStateProviders: features.flatMap((feature) => feature.roomStateProviders || []),
      logger,
      responder
    };
    this.executor = new ActionExecutor(this.context);
    this.handlers = ({
      join: new JoinAction(this.context),
      end_round: new EndRoundAction(this.context),
      persistent_data: new PersistentDataAction(this.context),
      ...this.featureHandlers(features)
    } as unknown) as ActionHandlers;
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

    if (!handler) {
      this.context.responder.error(ws, 'unsupported action', payload.requestId);
      return;
    }

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
    const featureKey = await this.featureFor(payload.action)?.idempotencyKey?.(ws, payload);

    if (featureKey !== undefined) {
      return featureKey;
    }

    return this.idempotency.key(ws, payload);
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
    return this.featureFor(payload.action)?.hasConflict?.(payload, response) || false;
  }

  private payloadUserId(payload: IncomingMessagePayload): string | null {
    return payload.action === 'join' ? payload.userId || null : null;
  }

  private payloadRoomId(payload: IncomingMessagePayload): string | null {
    return payload.action === 'join' ? payload.roomId : null;
  }

  private featureHandlers(features: GameFeature[]): Record<string, GameActionHandler<any>> {
    return features.reduce(
      (handlers, feature) => ({ ...handlers, ...feature.handlers }),
      {}
    );
  }

  private featureFor(action: string): GameFeature | undefined {
    return this.features.find((feature) => Boolean(feature.handlers[action]));
  }
}

export default Actions;
