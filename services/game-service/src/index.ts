import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { WebSocketHost } from '@trying-sd/game-gdk';
import config from './config';
import { createApp } from './http';
import Actions from './game/Actions';
import { validateMessage } from './game/messageSchema';
import CurrentRoundRepository from './repositories/CurrentRoundRepository';
import GamePlayerDataRepository from './repositories/GamePlayerDataRepository';
import IdempotencyRepository from './repositories/IdempotencyRepository';
import RoundRepository from './repositories/RoundRepository';
import RoundActionRepository from './repositories/RoundActionRepository';
import RoomMembershipRepository from './repositories/RoomMembershipRepository';
import OutboxRepository from './repositories/OutboxRepository';
import { ChessRepository, createChessFeature } from './features/chess';
import { SpinRepository, createSlotFeature } from './features/slot';
import DynamoDbClient from './infra/DynamoDbClient';
import RedisKeyValueClient from './infra/RedisKeyValueClient';
import RedisPubSub from './infra/redisPubSub';
import KafkaEventProducer from './infra/KafkaEventProducer';
import JwtTokenVerifier from './infra/JwtTokenVerifier';
import WalletClient from './services/walletClient';
import OutboxPublisher from './services/OutboxPublisher';
import { log } from './observability/logger';
import { IncomingMessagePayload } from './types/websocket';

class GameServiceApp {
  private readonly walletClient = new WalletClient(config.walletUrl);
  private readonly tokenVerifier = new JwtTokenVerifier(config.jwtSecret);
  private readonly pubSub = new RedisPubSub(config.redisUrl, config.redisChannel);
  private readonly kafkaProducer = new KafkaEventProducer(
    config.kafkaBrokers,
    config.kafkaTopic,
    `${config.serverId}-producer`
  );
  private readonly redisKeyValue = new RedisKeyValueClient(config.redisUrl);
  private readonly prisma = new PrismaClient();
  private readonly dynamoDb = new DynamoDbClient({
    region: config.awsRegion,
    endpoint: config.dynamoDbEndpoint
  });
  private readonly gamePlayerDataRepository = new GamePlayerDataRepository(
    this.dynamoDb,
    config.gamePlayerDataTable
  );
  private readonly currentRoundRepository = new CurrentRoundRepository(this.redisKeyValue);
  private readonly roundRepository = new RoundRepository(this.prisma);
  private readonly roundActionRepository = new RoundActionRepository(this.prisma);
  private readonly roomMembershipRepository = new RoomMembershipRepository(this.prisma);
  private readonly outboxRepository = new OutboxRepository(this.prisma);
  private readonly spinRepository = new SpinRepository(this.prisma);
  private readonly chessRepository = new ChessRepository(this.prisma);
  private readonly outboxPublisher = new OutboxPublisher(this.outboxRepository, this.kafkaProducer);
  private readonly idempotencyRepository = new IdempotencyRepository(
    this.redisKeyValue,
    Number(config.idempotencyTtlSeconds)
  );
  private httpServer: HttpServer | null = null;
  private webSocketHost: WebSocketHost<IncomingMessagePayload> | null = null;
  private stopping = false;

  async start(): Promise<void> {
    await this.pubSub.connect();
    await this.kafkaProducer.connect();
    await this.redisKeyValue.connect();
    await this.prisma.$connect();
    await this.gamePlayerDataRepository.ensureTable();

    this.httpServer = createApp(this.outboxRepository).listen(
      config.port,
      () => console.log(`game-service listening on ${config.port}`)
    );

    const actions = new Actions(
      this.pubSub,
      config.serverId,
      this.gamePlayerDataRepository,
      this.currentRoundRepository,
      this.idempotencyRepository,
      this.roomMembershipRepository,
      this.roundActionRepository,
      this.roundRepository,
      this.tokenVerifier,
      [
        createSlotFeature({
          deductWallet: (request) => this.walletClient.deduct(request),
          creditWallet: (request) => this.walletClient.credit(request),
          currentRoundRepository: this.currentRoundRepository,
          roundRepository: this.roundRepository,
          spinRepository: this.spinRepository,
          pubSub: this.pubSub,
          serverId: config.serverId
        }),
        createChessFeature({
          repository: this.chessRepository,
          pubSub: this.pubSub,
          serverId: config.serverId
        })
      ]
    );

    this.webSocketHost = new WebSocketHost({
      server: this.httpServer,
      heartbeatIntervalMs: Number(config.heartbeatIntervalMs),
      pubSub: this.pubSub,
      validateMessage,
      router: actions,
      logger: { log }
    });

    this.webSocketHost.start();
    this.outboxPublisher.start();
    this.registerShutdownHooks();
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    this.webSocketHost?.stop();
    this.outboxPublisher.stop();
    await this.pubSub.close();
    await this.kafkaProducer.close();
    await this.redisKeyValue.close();
    await this.prisma.$disconnect();
    this.dynamoDb.close();
    this.httpServer?.close();
  }

  private registerShutdownHooks(): void {
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }
}

const app = new GameServiceApp();

app.start().catch((err) => {
  console.error('failed to start game-service', err);
  process.exit(1);
});
