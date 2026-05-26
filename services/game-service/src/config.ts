export default {
  port: process.env.PORT || 3000,
  walletUrl: process.env.WALLET_URL || 'http://wallet-service:4000',
  heartbeatIntervalMs: process.env.WS_HEARTBEAT_INTERVAL_MS || 30000,
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  redisChannel: process.env.REDIS_CHANNEL || 'game-events',
  idempotencyTtlSeconds: process.env.IDEMPOTENCY_TTL_SECONDS || 300,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/game_service',
  serverId: process.env.HOSTNAME || `game-service-${process.pid}`
};
