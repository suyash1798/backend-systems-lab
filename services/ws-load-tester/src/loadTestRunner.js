const WebSocket = require('ws');
const createClient = require('./clientFactory');
const Metrics = require('./metrics');
const { buildActionPayload, buildJoinPayload } = require('./payloads');

class LoadTestRunner {
  constructor(config) {
    this.config = config;
    this.clients = [];
    this.pending = new Map();
    this.requestSeq = 0;
    this.shuttingDown = false;
    this.statsInterval = null;
    this.metrics = new Metrics({
      config,
      activeConnections: () => this.activeConnections(),
      pendingSize: () => this.pending.size
    });
  }

  start() {
    this.metrics.printConfig();

    for (let i = 0; i < this.config.connections; i++) {
      setTimeout(() => this.createClient(i), Math.floor((this.config.rampUpMs / this.config.connections) * i));
    }

    this.statsInterval = setInterval(() => this.metrics.printStats(false), this.config.logIntervalMs);

    if (this.config.durationMs > 0) {
      setTimeout(() => this.shutdown('duration-complete'), this.config.durationMs + this.config.rampUpMs);
    }
  }

  createClient(index) {
    const client = createClient({
      index,
      config: this.config,
      onOpen: (openedClient) => this.handleOpen(openedClient),
      onMessage: (raw) => this.handleMessage(raw),
      onClose: (closedClient) => this.handleClose(closedClient),
      onError: (err) => this.handleError(err)
    });

    this.clients.push(client);
  }

  handleOpen(client) {
    this.metrics.stats.opened += 1;
    this.logConnection('connection-opened', client);

    if (this.config.joinOnOpen) {
      this.sendRequest(client, buildJoinPayload(client));
    }

    client.interval = setInterval(() => this.sendMessage(client), this.config.messageIntervalMs);
  }

  handleClose(client) {
    this.metrics.stats.closed += 1;
    clearInterval(client.interval);
    this.logConnection('connection-closed', client);
  }

  handleError(err) {
    this.metrics.stats.connectionErrors += 1;
    this.metrics.stats.lastConnectionError = err.message;
  }

  sendMessage(client) {
    this.sendRequest(client, buildActionPayload(this.config.action, client, this.config));
  }

  sendRequest(client, payload) {
    if (this.shuttingDown || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const requestId = `${client.index}-${Date.now()}-${this.requestSeq++}`;
    const message = { ...payload, requestId };

    this.pending.set(requestId, {
      startedAt: Date.now(),
      timeout: setTimeout(() => {
        this.pending.delete(requestId);
        this.metrics.stats.timeouts += 1;
      }, this.config.requestTimeoutMs)
    });

    this.metrics.stats.sent += 1;
    client.ws.send(JSON.stringify(message));
  }

  handleMessage(raw) {
    this.metrics.stats.received += 1;

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      this.metrics.stats.appErrors += 1;
      return;
    }

    if (payload.type === 'notification') {
      this.metrics.stats.notifications += 1;
      return;
    }

    if (payload.status === 'ok') {
      this.metrics.stats.ok += 1;
    } else {
      this.metrics.stats.appErrors += 1;
    }

    if (!payload.requestId || !this.pending.has(payload.requestId)) {
      return;
    }

    const request = this.pending.get(payload.requestId);
    this.pending.delete(payload.requestId);
    clearTimeout(request.timeout);
    this.metrics.recordLatency(Date.now() - request.startedAt);
  }

  shutdown(reason = 'completed') {
    this.shuttingDown = true;

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.clients.forEach((client) => {
      clearInterval(client.interval);
      client.ws.close();
    });

    this.pending.forEach((request) => clearTimeout(request.timeout));
    this.pending.clear();
    this.metrics.printStats(true, reason);
  }

  activeConnections() {
    return this.clients.filter((client) => client.ws.readyState === WebSocket.OPEN).length;
  }

  logConnection(event, client) {
    if (!this.config.logConnections) {
      return;
    }

    console.log(JSON.stringify({
      event,
      index: client.index,
      userId: client.userId,
      roomId: client.roomId
    }));
  }
}

module.exports = LoadTestRunner;
