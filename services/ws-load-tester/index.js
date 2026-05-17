const WebSocket = require('ws');

const targetUrl = process.env.TARGET_URL || 'ws://game-service:3000';
const action = process.env.ACTION || 'ping';
const connections = Number(process.env.CONNECTIONS) || 100;
const rampUpMs = Number(process.env.RAMP_UP_MS) || 10000;
const durationMs = Number(process.env.DURATION_MS) || 60000;
const messageIntervalMs = Number(process.env.MESSAGE_INTERVAL_MS) || 1000;
const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 5000;
const userIdPrefix = process.env.USER_ID_PREFIX || 'load-user';

const stats = {
  opened: 0,
  closed: 0,
  connectionErrors: 0,
  sent: 0,
  received: 0,
  ok: 0,
  appErrors: 0,
  timeouts: 0,
  totalLatencyMs: 0,
  minLatencyMs: Infinity,
  maxLatencyMs: 0
};

const clients = [];
const pending = new Map();
let requestSeq = 0;
let shuttingDown = false;
let startedAt = Date.now();

function createClient(index) {
  const ws = new WebSocket(targetUrl);
  const client = { ws, index, interval: null };
  clients.push(client);

  ws.on('open', () => {
    stats.opened += 1;
    client.interval = setInterval(() => sendMessage(client), messageIntervalMs);
  });

  ws.on('message', (raw) => handleMessage(raw));

  ws.on('close', () => {
    stats.closed += 1;
    clearInterval(client.interval);
  });

  ws.on('error', () => {
    stats.connectionErrors += 1;
  });
}

function sendMessage(client) {
  if (shuttingDown || client.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const requestId = `${client.index}-${Date.now()}-${requestSeq++}`;
  const payload = action === 'play'
    ? { action, userId: `${userIdPrefix}-${client.index}`, requestId }
    : { action: 'ping', requestId };

  pending.set(requestId, {
    startedAt: Date.now(),
    timeout: setTimeout(() => {
      pending.delete(requestId);
      stats.timeouts += 1;
    }, requestTimeoutMs)
  });

  stats.sent += 1;
  client.ws.send(JSON.stringify(payload));
}

function handleMessage(raw) {
  stats.received += 1;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    stats.appErrors += 1;
    return;
  }

  if (payload.status === 'ok') {
    stats.ok += 1;
  } else {
    stats.appErrors += 1;
  }

  if (!payload.requestId || !pending.has(payload.requestId)) {
    return;
  }

  const request = pending.get(payload.requestId);
  pending.delete(payload.requestId);
  clearTimeout(request.timeout);

  const latencyMs = Date.now() - request.startedAt;
  stats.totalLatencyMs += latencyMs;
  stats.minLatencyMs = Math.min(stats.minLatencyMs, latencyMs);
  stats.maxLatencyMs = Math.max(stats.maxLatencyMs, latencyMs);
}

function printConfig() {
  console.log(JSON.stringify({
    event: 'load-test-started',
    targetUrl,
    action,
    connections,
    rampUpMs,
    durationMs,
    messageIntervalMs,
    requestTimeoutMs,
    mode: durationMs === 0 ? 'infinite' : 'timed'
  }));
}

function printStats(final = false, reason = null) {
  const measured = stats.ok + stats.appErrors;
  const avgLatencyMs = measured > 0 ? Math.round(stats.totalLatencyMs / measured) : 0;
  const minLatencyMs = stats.minLatencyMs === Infinity ? 0 : stats.minLatencyMs;

  console.log(JSON.stringify({
    final,
    reason,
    targetUrl,
    action,
    configuredConnections: connections,
    activeConnections: clients.filter((client) => client.ws.readyState === WebSocket.OPEN).length,
    elapsedMs: Date.now() - startedAt,
    pending: pending.size,
    ...stats,
    minLatencyMs,
    avgLatencyMs,
    maxLatencyMs: stats.maxLatencyMs
  }));
}

function shutdown(reason = 'completed') {
  shuttingDown = true;
  clients.forEach((client) => {
    clearInterval(client.interval);
    client.ws.close();
  });
  pending.forEach((request) => clearTimeout(request.timeout));
  pending.clear();
  printStats(true, reason);
}

printConfig();

for (let i = 0; i < connections; i++) {
  setTimeout(() => createClient(i), Math.floor((rampUpMs / connections) * i));
}

const statsInterval = setInterval(() => printStats(false), 5000);

if (durationMs > 0) {
  setTimeout(() => {
    clearInterval(statsInterval);
    shutdown('duration-complete');
  }, durationMs + rampUpMs);
}

process.on('SIGINT', () => {
  clearInterval(statsInterval);
  shutdown('interrupted');
});

process.on('SIGTERM', () => {
  clearInterval(statsInterval);
  shutdown('terminated');
});
