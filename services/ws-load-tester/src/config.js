function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

module.exports = {
  targetUrl: process.env.TARGET_URL || 'ws://game-service:3000',
  action: process.env.ACTION || 'spin',
  connections: numberFromEnv('CONNECTIONS', 100),
  rooms: numberFromEnv('ROOMS', 1),
  rampUpMs: numberFromEnv('RAMP_UP_MS', 10000),
  durationMs: Number(process.env.DURATION_MS) >= 0 ? Number(process.env.DURATION_MS) : 60000,
  messageIntervalMs: numberFromEnv('MESSAGE_INTERVAL_MS', 1000),
  logIntervalMs: numberFromEnv('LOG_INTERVAL_MS', 5000),
  requestTimeoutMs: numberFromEnv('REQUEST_TIMEOUT_MS', 5000),
  betAmount: numberFromEnv('BET_AMOUNT', 10),
  userIdPrefix: process.env.USER_ID_PREFIX || 'load-user',
  roomIdPrefix: process.env.ROOM_ID_PREFIX || 'load-room',
  joinOnOpen: process.env.JOIN_ON_OPEN
    ? process.env.JOIN_ON_OPEN === 'true'
    : true,
  logConnections: process.env.LOG_CONNECTIONS === 'true'
};
