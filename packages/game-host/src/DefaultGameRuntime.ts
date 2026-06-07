import { RequestListener } from 'http';
import {
  GameActions,
  GdkEventPublisher as EventPublisher,
  GameEvents,
  GameEventPublisher,
  RoundService,
  CurrentRoundStore,
  GameFeature,
  GamePlayerDataStore,
  GameRuntimeContext,
  IdempotencyStore,
  GameEvent,
  IncomingMessagePayload,
  MessageRouter,
  RequestLogger,
  RoomEvent,
  RoomMembershipStore,
  RoundActionStore,
  RoundStore,
  TokenVerifier
} from '@trying-sd/game-gdk';

interface EventTransport<TEvent extends object> {
  publish(payload: TEvent): Promise<void>;
  onMessage(handler: (event: RoomEvent) => void): void;
}

interface HostLogger {
  log(event: string, data?: Record<string, unknown>): void;
}

interface Lifecycle {
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface DefaultGameRuntimeOptions<TPayload extends IncomingMessagePayload, TEvent extends GameEvent> {
  name: string;
  port: number;
  app: RequestListener;
  heartbeatIntervalMs: number;
  eventTransport: EventTransport<TEvent>;
  serverId: string;
  gamePlayerDataStore?: GamePlayerDataStore | null;
  currentRoundStore: CurrentRoundStore;
  idempotencyStore: IdempotencyStore;
  roomMembershipStore: RoomMembershipStore;
  roundActionStore: RoundActionStore;
  roundStore: RoundStore;
  tokenVerifier: TokenVerifier;
  requestLogger: RequestLogger;
  logger?: HostLogger;
  lifecycle?: Lifecycle;
  gameEventPublisher: GameEventPublisher;
  wallet: GameRuntimeContext<TEvent>['wallet'];
}

class DefaultGameRuntime<TPayload extends IncomingMessagePayload, TEvent extends GameEvent> {
  readonly name: string;
  readonly port: number;
  readonly app: RequestListener;
  readonly heartbeatIntervalMs: number;
  readonly pubSub: EventTransport<TEvent>;
  readonly logger?: HostLogger;
  readonly roundService: RoundService;
  readonly gameEvents: GameEvents;
  readonly roomEvents: EventPublisher<TEvent>;
  readonly context: GameRuntimeContext<TEvent>;

  private readonly actionsRegistry: GameActions<TPayload, TEvent>;

  constructor(private readonly options: DefaultGameRuntimeOptions<TPayload, TEvent>) {
    this.name = options.name;
    this.port = options.port;
    this.app = options.app;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs;
    this.pubSub = options.eventTransport;
    this.logger = options.logger;
    this.roundService = new RoundService(
      options.currentRoundStore,
      options.roundStore,
      options.roundActionStore
    );
    this.gameEvents = new GameEvents(options.gameEventPublisher);
    this.roomEvents = new EventPublisher(options.eventTransport, options.serverId);
    this.context = {
      rounds: this.roundService,
      gameEvents: this.gameEvents,
      roomEvents: this.roomEvents,
      wallet: options.wallet,
      logger: options.requestLogger
    };
    this.actionsRegistry = new GameActions<TPayload, TEvent>({
      eventTransport: options.eventTransport,
      serverId: options.serverId,
      gamePlayerDataStore: this.requiredPlayerDataStore(),
      currentRoundStore: options.currentRoundStore,
      idempotencyStore: options.idempotencyStore,
      roomMembershipStore: options.roomMembershipStore,
      roundActionStore: options.roundActionStore,
      roundStore: options.roundStore,
      tokenVerifier: options.tokenVerifier,
      logger: options.requestLogger,
      publisher: this.roomEvents
    });
  }

  async start(): Promise<void> {
    await this.options.lifecycle?.start();
  }

  async stop(): Promise<void> {
    await this.options.lifecycle?.stop();
  }

  actions(): MessageRouter<TPayload> {
    return this.actionsRegistry;
  }

  registerFeature(feature: GameFeature): void {
    this.actionsRegistry.registerFeature(feature);
  }

  private requiredPlayerDataStore(): GamePlayerDataStore {
    if (!this.options.gamePlayerDataStore) {
      throw new Error('GAME_PLAYER_DATA_TABLE required for persistent_data action');
    }

    return this.options.gamePlayerDataStore;
  }
}

export default DefaultGameRuntime;
export type { DefaultGameRuntimeOptions };
