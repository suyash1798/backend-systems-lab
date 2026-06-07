import { PrismaClient } from '@trying-sd/game-db';
import {
  CurrentRoundRepository,
  GameEvent,
  IdempotencyRepository,
  IncomingMessagePayload
} from '@trying-sd/game-gdk';
import {
  createOutboxRoutes,
  createServiceApp,
  GamePlatform,
  LobbyRoomMembershipRepository,
  OutboxRepository,
  RoundActionRepository,
  RoundRepository
} from '@trying-sd/platform';
import DefaultGameRuntime from './DefaultGameRuntime';

interface HostedGameRuntimeOptions {
  name: string;
  port?: number;
  heartbeatIntervalMs?: number;
  prisma?: PrismaClient;
  env?: NodeJS.ProcessEnv;
}

interface HostedGameDependencies<TEvent extends object> {
  prisma: PrismaClient;
  outboxRepository: OutboxRepository;
  platform: GamePlatform<TEvent>;
  currentRoundRepository: CurrentRoundRepository;
  roundRepository: RoundRepository;
  roundActionRepository: RoundActionRepository;
  roomMembershipRepository: LobbyRoomMembershipRepository;
  idempotencyRepository: IdempotencyRepository;
}

class HostedGameRuntime<
  TPayload extends IncomingMessagePayload,
  TEvent extends GameEvent
> extends DefaultGameRuntime<TPayload, TEvent> {
  protected readonly prisma: PrismaClient;
  protected readonly platform: GamePlatform<TEvent>;

  constructor(options: HostedGameRuntimeOptions) {
    const dependencies = createDependencies<TEvent>(options);
    const app = createServiceApp(options.name);

    app.use('/outbox', createOutboxRoutes(options.name, dependencies.outboxRepository));

    super({
      name: options.name,
      port: options.port || Number(options.env?.PORT || process.env.PORT || 3000),
      app,
      heartbeatIntervalMs: options.heartbeatIntervalMs
        || Number(options.env?.WS_HEARTBEAT_INTERVAL_MS || process.env.WS_HEARTBEAT_INTERVAL_MS || 30000),
      eventTransport: dependencies.platform.pubSub,
      serverId: dependencies.platform.serverId,
      gamePlayerDataStore: dependencies.platform.playerDataStore,
      currentRoundStore: dependencies.currentRoundRepository,
      idempotencyStore: dependencies.idempotencyRepository,
      roomMembershipStore: dependencies.roomMembershipRepository,
      roundActionStore: dependencies.roundActionRepository,
      roundStore: dependencies.roundRepository,
      tokenVerifier: dependencies.platform.tokenVerifier,
      requestLogger: dependencies.platform.requestLogger,
      logger: { log: dependencies.platform.log },
      lifecycle: dependencies.platform,
      gameEventPublisher: dependencies.platform.gameEventPublisher,
      wallet: dependencies.platform.wallet
    });

    this.prisma = dependencies.prisma;
    this.platform = dependencies.platform;
  }
}

function createDependencies<TEvent extends object>(
  options: HostedGameRuntimeOptions
): HostedGameDependencies<TEvent> {
  const env = options.env || process.env;
  const prisma = options.prisma || new PrismaClient();
  const outboxRepository = new OutboxRepository(prisma);
  const platform = GamePlatform.fromEnv<TEvent>({
    serviceName: options.name,
    database: prisma,
    outboxStore: outboxRepository,
    env
  });

  return {
    prisma,
    outboxRepository,
    platform,
    currentRoundRepository: new CurrentRoundRepository(platform.redisKeyValue),
    roundRepository: new RoundRepository(prisma),
    roundActionRepository: new RoundActionRepository(prisma),
    roomMembershipRepository: new LobbyRoomMembershipRepository(prisma),
    idempotencyRepository: new IdempotencyRepository(
      platform.redisKeyValue,
      Number(env.IDEMPOTENCY_TTL_SECONDS || 300)
    )
  };
}

export default HostedGameRuntime;
export type { HostedGameRuntimeOptions };
