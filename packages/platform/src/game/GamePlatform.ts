import JwtTokenVerifier from '../auth/JwtTokenVerifier';
import KafkaEventProducer from '../kafka/KafkaEventProducer';
import { createLogger, LogFn } from '../observability/logger';
import RequestLogger from '../observability/RequestLogger';
import OutboxPublisher from '../outbox/OutboxPublisher';
import { OutboxStore } from '../outbox/types';
import OutboxGameEventPublisher from '../outbox/OutboxGameEventPublisher';
import RedisKeyValueClient from '../redis/RedisKeyValueClient';
import RedisPubSub from '../redis/RedisPubSub';
import WalletClient from '../wallet/WalletClient';
import DynamoDbClient from '../aws/DynamoDbClient';
import DynamoPlayerDataStore from './DynamoPlayerDataStore';

interface DatabaseConnection {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

interface GamePlatformOptions {
  serviceName: string;
  serverId: string;
  redisUrl: string;
  redisChannel: string;
  kafkaBrokers: string[];
  kafkaTopic: string;
  jwtSecret: string;
  walletUrl: string;
  database: DatabaseConnection;
  outboxStore: OutboxStore;
  gamePlayerData?: {
    region: string;
    tableName: string;
    endpoint?: string;
  };
}

interface GamePlatformEnvOptions {
  serviceName: string;
  database: DatabaseConnection;
  outboxStore: OutboxStore;
  env?: NodeJS.ProcessEnv;
}

class GamePlatform<TEvent extends object = Record<string, unknown>> {
  readonly log: LogFn;
  readonly requestLogger: RequestLogger;
  readonly pubSub: RedisPubSub<TEvent>;
  readonly redisKeyValue: RedisKeyValueClient;
  readonly kafkaProducer: KafkaEventProducer;
  readonly tokenVerifier: JwtTokenVerifier;
  readonly wallet: WalletClient;
  readonly outboxPublisher: OutboxPublisher;
  readonly gameEventPublisher: OutboxGameEventPublisher;
  readonly serverId: string;
  readonly serviceName: string;
  readonly playerDataStore: DynamoPlayerDataStore | null;
  private readonly dynamoDb: DynamoDbClient | null;

  static fromEnv<TEvent extends object = Record<string, unknown>>(
    options: GamePlatformEnvOptions
  ): GamePlatform<TEvent> {
    const env = options.env || process.env;

    return new GamePlatform<TEvent>({
      serviceName: options.serviceName,
      serverId: env.HOSTNAME || `${options.serviceName}-${process.pid}`,
      redisUrl: env.REDIS_URL || 'redis://redis:6379',
      redisChannel: env.REDIS_CHANNEL || 'game-events',
      kafkaBrokers: (env.KAFKA_BROKERS || '').split(',').map((broker) => broker.trim()).filter(Boolean),
      kafkaTopic: env.KAFKA_TOPIC || 'game-events',
      jwtSecret: env.JWT_SECRET || 'dev-secret-change-me',
      walletUrl: env.WALLET_URL || 'http://wallet-service:4000',
      database: options.database,
      outboxStore: options.outboxStore,
      gamePlayerData: env.GAME_PLAYER_DATA_TABLE
        ? {
            region: env.AWS_REGION || 'ap-south-1',
            endpoint: env.DYNAMODB_ENDPOINT || undefined,
            tableName: env.GAME_PLAYER_DATA_TABLE
          }
        : undefined
    });
  }

  constructor(private readonly options: GamePlatformOptions) {
    this.serverId = options.serverId;
    this.serviceName = options.serviceName;
    this.log = createLogger(options.serviceName);
    this.requestLogger = new RequestLogger(this.log);
    this.pubSub = new RedisPubSub<TEvent>(options.redisUrl, options.redisChannel);
    this.redisKeyValue = new RedisKeyValueClient(options.redisUrl);
    this.kafkaProducer = new KafkaEventProducer(
      options.kafkaBrokers,
      options.kafkaTopic,
      `${options.serverId}-producer`
    );
    this.tokenVerifier = new JwtTokenVerifier(options.jwtSecret);
    this.wallet = new WalletClient(options.walletUrl);
    this.outboxPublisher = new OutboxPublisher(options.outboxStore, this.kafkaProducer);
    this.gameEventPublisher = new OutboxGameEventPublisher(options.outboxStore);
    this.dynamoDb = options.gamePlayerData
      ? new DynamoDbClient({
          region: options.gamePlayerData.region,
          endpoint: options.gamePlayerData.endpoint
        })
      : null;
    this.playerDataStore = options.gamePlayerData && this.dynamoDb
      ? new DynamoPlayerDataStore(this.dynamoDb, options.gamePlayerData.tableName)
      : null;
  }

  async start(): Promise<void> {
    await this.pubSub.connect();
    await this.kafkaProducer.connect();
    await this.redisKeyValue.connect();
    await this.options.database.$connect();
    await this.playerDataStore?.ensureTable();
    this.outboxPublisher.start();
  }

  async stop(): Promise<void> {
    this.outboxPublisher.stop();
    await this.pubSub.close();
    await this.kafkaProducer.close();
    await this.redisKeyValue.close();
    await this.options.database.$disconnect();
    this.dynamoDb?.close();
  }
}

export default GamePlatform;
