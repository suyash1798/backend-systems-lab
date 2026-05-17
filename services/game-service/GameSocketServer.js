const WebSocket = require('ws');

class GameSocketServer {
  constructor({ server, heartbeatIntervalMs, playHandler }) {
    this.wss = new WebSocket.Server({ server });
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.playHandler = playHandler;
    this.heartbeatInterval = null;
  }

  start() {
    this.wss.on('connection', (ws) => this.handleConnection(ws));
    this.wss.on('close', () => this.stopHeartbeat());
    this.startHeartbeat();
  }

  handleConnection(ws) {
    console.log('ws: client connected');
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (msg) => this.handleMessage(ws, msg));
  }

  async handleMessage(ws, msg) {
    try {
      const payload = JSON.parse(msg);

      if (payload.action === 'ping') {
        return this.send(ws, { status: 'ok', action: 'pong', requestId: payload.requestId || null });
      }

      if (payload.action !== 'play' || !payload.userId) {
        return this.send(ws, { status: 'error', error: 'invalid message', requestId: payload.requestId || null });
      }

      try {
        const data = await this.playHandler(payload.userId);
        this.send(ws, { status: 'ok', balance: data.balance, requestId: payload.requestId || null });
      } catch (err) {
        this.send(ws, {
          status: 'error',
          error: err.message,
          detail: err.detail || null,
          requestId: payload.requestId || null
        });
      }
    } catch (err) {
      this.send(ws, { status: 'error', error: 'invalid json' });
    }
  }

  send(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => this.checkClientHeartbeat(ws));
    }, this.heartbeatIntervalMs);
  }

  checkClientHeartbeat(ws) {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (ws.isAlive === false) {
      console.log('ws: terminating stale client');
      ws.terminate();
      return;
    }

    ws.isAlive = false;
    ws.ping();
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatInterval);
  }
}

module.exports = GameSocketServer;
