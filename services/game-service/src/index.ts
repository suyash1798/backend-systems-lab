import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import config from './config';
import { createApp } from './http';
import CurrentRoundRepository from './repositories/CurrentRoundRepository';
import GamePlayerDataRepository from './repositories/GamePlayerDataRepository';
import IdempotencyRepository from './repositories/IdempotencyRepository';
import RoundRepository from './repositories/RoundRepository';
import RoundActionRepository from './repositories/RoundActionRepository';
import RoomMembershipRepository from './repositories/RoomMembershipRepository';
import OutboxRepository from './repositories/OutboxRepository';
import SpinRepository from './repositories/SpinRepository';
import DynamoDbClient from './infra/DynamoDbClient';
import RedisKeyValueClient from './infra/RedisKeyValueClient';
import RedisPubSub from './infra/redisPubSub';
import KafkaEventProducer from './infra/KafkaEventProducer';
import JwtTokenVerifier from './infra/JwtTokenVerifier';
import WalletClient from './services/walletClient';
import OutboxPublisher from './services/OutboxPublisher';
import GameSocketServer from './websocket/GameSocketServer';

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
  private readonly outboxPublisher = new OutboxPublisher(this.outboxRepository, this.kafkaProducer);
  private readonly idempotencyRepository = new IdempotencyRepository(
    this.redisKeyValue,
    Number(config.idempotencyTtlSeconds)
  );
  private httpServer: HttpServer | null = null;
  private gameSocketServer: GameSocketServer | null = null;
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

    this.gameSocketServer = new GameSocketServer({
      server: this.httpServer,
      heartbeatIntervalMs: Number(config.heartbeatIntervalMs),
      deductWallet: (request) => this.walletClient.deduct(request),
      creditWallet: (request) => this.walletClient.credit(request),
      pubSub: this.pubSub,
      gamePlayerDataRepository: this.gamePlayerDataRepository,
      currentRoundRepository: this.currentRoundRepository,
      idempotencyRepository: this.idempotencyRepository,
      roomMembershipRepository: this.roomMembershipRepository,
      roundActionRepository: this.roundActionRepository,
      roundRepository: this.roundRepository,
      spinRepository: this.spinRepository,
      tokenVerifier: this.tokenVerifier,
      serverId: config.serverId
    });

    this.gameSocketServer.start();
    this.outboxPublisher.start();
    this.registerShutdownHooks();
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    this.gameSocketServer?.stop();
    this.outboxPublisher.stop();
    await this.pubSub.close();
    await this.kafkaProducer.close();
    await this.redisKeyValue.close();
    await this.prisma.$disconnect();
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
