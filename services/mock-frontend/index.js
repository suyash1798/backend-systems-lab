const config = require('./src/config');
const GameWebSocketClient = require('./src/GameWebSocketClient');

const client = new GameWebSocketClient({
  wsUrl: config.wsUrl,
  userId: config.userId,
  roomId: config.roomId,
  heartbeatIntervalMs: config.heartbeatIntervalMs,
  heartbeatGraceMs: config.heartbeatGraceMs,
  spinIntervalMs: config.spinIntervalMs,
  reconnectDelayMs: config.reconnectDelayMs
});

client.connect();
