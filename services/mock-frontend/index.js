const GameWebSocketClient = require('./GameWebSocketClient');

const wsUrl = process.env.GAME_URL || 'ws://game-service:3000';
const userId = process.env.USER_ID || 'user-1';
const HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_INTERVAL_MS) || 30000;
const HEARTBEAT_GRACE_MS = Number(process.env.WS_HEARTBEAT_GRACE_MS) || 5000;
const PLAY_INTERVAL_MS = Number(process.env.PLAY_INTERVAL_MS) || 5000;
const RECONNECT_DELAY_MS = Number(process.env.WS_RECONNECT_DELAY_MS) || 2000;

const client = new GameWebSocketClient({
  wsUrl,
  userId,
  heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
  heartbeatGraceMs: HEARTBEAT_GRACE_MS,
  playIntervalMs: PLAY_INTERVAL_MS,
  reconnectDelayMs: RECONNECT_DELAY_MS
});

client.connect();
