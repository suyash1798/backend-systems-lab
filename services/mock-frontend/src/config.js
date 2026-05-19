function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

module.exports = {
  wsUrl: process.env.GAME_URL || 'ws://game-service:3000',
  userId: process.env.USER_ID || 'user-1',
  roomId: process.env.ROOM_ID || 'room-1',
  heartbeatIntervalMs: numberFromEnv('WS_HEARTBEAT_INTERVAL_MS', 30000),
  heartbeatGraceMs: numberFromEnv('WS_HEARTBEAT_GRACE_MS', 5000),
  playIntervalMs: numberFromEnv('PLAY_INTERVAL_MS', 5000),
  reconnectDelayMs: numberFromEnv('WS_RECONNECT_DELAY_MS', 2000)
};
