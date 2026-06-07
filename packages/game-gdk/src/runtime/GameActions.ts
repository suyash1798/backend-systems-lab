import ActionExecutor from '../actions/ActionExecutor';
import ResponseSender from '../ResponseSender';
import {
  GameActionHandler,
  GameEvent,
  GameSocket,
  IncomingMessagePayload,
  MessageRouter,
  RequestLogger,
  ResponseSender as ResponseSenderContract
} from '../types';
import EndRoundAction from './actions/EndRoundAction';
import JoinAction from './actions/JoinAction';
import PersistentDataAction from './actions/PersistentDataAction';
import EventPublisher from './EventPublisher';
import Idempotency from './Idempotency';
import GamePlayerDataService from './services/GamePlayerDataService';
import RoundService from './services/RoundService';
import {
  CurrentRoundStore,
  GameActionContext,
  GameFeature,
  GamePlayerDataStore,
  PlayerJoinedPublisher,
  RoomMembershipStore,
  RoundActionStore,
  RoundStore,
  TokenVerifier
} from './types';

interface GameActionsOptions<TEvent extends GameEvent> {
  eventTransport: { publish(payload: TEvent): Promise<void> };
  serverId: string;
  gamePlayerDataStore: GamePlayerDataStore;
  currentRoundStore: CurrentRoundStore;
  idempotencyStore: {
    reserve(key: string): Promise<boolean>;
    get(key: string): Promise<{ status: 'pending' | 'completed'; response?: object } | null>;
    complete(key: string, response: object): Promise<void>;
    release(key: string): Promise<void>;
  };
  roomMembershipStore: RoomMembershipStore;
  roundActionStore: RoundActionStore;
  roundStore: RoundStore;
  tokenVerifier: TokenVerifier;
  features?: GameFeature[];
  logger: RequestLogger & { redisPublishFailed?(trace: object, error: Error): void };
  responder?: ResponseSenderContract;
  idempotency?: Idempotency;
  publisher?: PlayerJoinedPublisher;
}

class GameActions<TPayload extends IncomingMessagePayload, TEvent extends GameEvent = GameEvent>
  implements MessageRouter<TPayload> {
  private readonly executor: ActionExecutor;
  private readonly handlers: Record<string, GameActionHandler<any>>;
  private readonly features: GameFeature[];
  private readonly idempotency: Idempotency;
  private readonly responder: ResponseSenderContract;
  private readonly context: GameActionContext;

  constructor(private readonly options: GameActionsOptions<TEvent>) {
    this.features = [];
    this.idempotency = options.idempotency || new Idempotency();
    this.responder = options.responder || new ResponseSender();

    this.context = {
      gamePlayerDataService: new GamePlayerDataService(options.gamePlayerDataStore),
      publisher: options.publisher || new EventPublisher(options.eventTransport, options.serverId),
      idempotencyRepository: options.idempotencyStore,
      roomMembershipRepository: options.roomMembershipStore,
      roundService: new RoundService(
        options.currentRoundStore,
        options.roundStore,
        options.roundActionStore
      ),
      roomStateProviders: [],
      logger: options.logger,
      responder: this.responder
    };

    this.executor = new ActionExecutor(this.context);
    this.handlers = {};
    this.registerAction('join', new JoinAction(this.context));
    this.registerAction('end_round', new EndRoundAction(this.context));
    this.registerAction('persistent_data', new PersistentDataAction(this.context));
    options.features?.forEach((feature) => this.registerFeature(feature));
  }

  registerAction(action: string, handler: GameActionHandler<any>): void {
    this.handlers[action] = handler;
  }

  registerFeature(feature: GameFeature): void {
    this.features.push(feature);
    Object.entries(feature.handlers).forEach(([action, handler]) => {
      this.registerAction(action, handler);
    });
    this.context.roomStateProviders.push(...feature.roomStateProviders || []);
  }

  async handle(ws: GameSocket, payload: TPayload): Promise<void> {
    const startedAt = Date.now();

    try {
      this.attachPlayerId(payload);
    } catch (err) {
      this.responder.error(ws, 'invalid token', payload.requestId);
      return;
    }

    const handler = this.handlers[payload.action] as GameActionHandler<TPayload>;

    if (!handler) {
      this.responder.error(ws, 'unsupported action', payload.requestId);
      return;
    }

    const idempotencyKey = await this.idempotencyKey(ws, payload);
    const trace = {
      action: payload.action,
      requestId: payload.requestId,
      idempotencyKey,
      connectionId: ws.id,
      userId: this.payloadUserId(payload) || ws.userId,
      roomId: this.payloadRoomId(payload) || ws.roomId
    };

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

  private attachPlayerId(payload: TPayload): void {
    const joinPayload = payload as TPayload & { action: string; token?: string; userId?: string };

    if (joinPayload.action !== 'join') {
      return;
    }

    joinPayload.userId = this.options.tokenVerifier.playerId(joinPayload.token || '');
  }

  private async idempotencyKey(ws: GameSocket, payload: TPayload): Promise<string | null> {
    const featureKey = await this.featureFor(payload.action)?.idempotencyKey?.(ws, payload);

    if (featureKey !== undefined) {
      return featureKey;
    }

    return this.idempotency.key(ws, payload);
  }

  private restoreSocketContext(ws: GameSocket, response: object): void {
    const payload = response as { action?: string; userId?: string; roomId?: string };

    if (payload.action === 'joined') {
      ws.userId = payload.userId || ws.userId;
      ws.roomId = payload.roomId || ws.roomId;
    }
  }

  private hasConflict(payload: TPayload, response?: object): boolean {
    return this.featureFor(payload.action)?.hasConflict?.(payload, response) || false;
  }

  private payloadUserId(payload: TPayload): string | null {
    const maybeJoin = payload as TPayload & { action: string; userId?: string };
    return maybeJoin.action === 'join' ? maybeJoin.userId || null : null;
  }

  private payloadRoomId(payload: TPayload): string | null {
    const maybeJoin = payload as TPayload & { action: string; roomId?: string };
    return maybeJoin.action === 'join' ? maybeJoin.roomId || null : null;
  }

  private featureFor(action: string): GameFeature | undefined {
    return this.features.find((feature) => Boolean(feature.handlers[action]));
  }
}

export default GameActions;
