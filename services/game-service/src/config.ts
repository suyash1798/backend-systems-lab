function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default {
  port: numberFromEnv('PORT', 3000),
  walletUrl: process.env.WALLET_URL || 'http://wallet-service:4000',
  heartbeatIntervalMs: numberFromEnv('WS_HEARTBEAT_INTERVAL_MS', 30000),
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  redisChannel: process.env.REDIS_CHANNEL || 'game-events',
  serverId: process.env.HOSTNAME || `game-service-${process.pid}`
};
