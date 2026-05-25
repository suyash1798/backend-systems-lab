const WebSocket = require('ws');

class GameWebSocketClient {
  constructor({ wsUrl, userId, roomId, heartbeatIntervalMs, heartbeatGraceMs, spinIntervalMs, reconnectDelayMs }) {
    this.wsUrl = wsUrl;
    this.userId = userId;
    this.roomId = roomId;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.heartbeatGraceMs = heartbeatGraceMs;
    this.spinIntervalMs = spinIntervalMs;
    this.reconnectDelayMs = reconnectDelayMs;
    this.ws = null;
    this.spinInterval = null;
    this.heartbeatTimeout = null;
    this.reconnectTimeout = null;
  }

  connect() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('ping', () => this.resetHeartbeatTimeout());
    this.ws.on('message', (message) => this.handleMessage(message));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (err) => this.handleError(err));
  }

  handleOpen() {
    console.log('connected to game-service via websocket');
    this.resetHeartbeatTimeout();
    this.joinRoom();
    this.startSpinning();
  }

  handleMessage(message) {
    console.log('recv', message.toString());
  }

  handleClose() {
    this.clearTimers();
    console.log(`ws closed, reconnecting in ${this.reconnectDelayMs}ms`);
    this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectDelayMs);
  }

  handleError(err) {
    console.error('ws error', err.message);
  }

  startSpinning() {
    this.spinInterval = setInterval(() => this.sendSpinMessage(), this.spinIntervalMs);
  }

  joinRoom() {
    this.send({
      action: 'join',
      userId: this.userId,
      roomId: this.roomId
    });
  }

  sendSpinMessage() {
    const now = Date.now();
    this.send({
      action: 'spin',
      requestId: `spin-${now}`,
      roundId: `round-${now}`,
      betAmount: 10
    });
  }

  send(payload) {
    const message = JSON.stringify(payload);
    console.log('sending', message);

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  resetHeartbeatTimeout() {
    clearTimeout(this.heartbeatTimeout);
    this.heartbeatTimeout = setTimeout(() => {
      console.log('heartbeat missed, terminating websocket');
      this.ws.terminate();
    }, this.heartbeatIntervalMs + this.heartbeatGraceMs);
  }

  clearTimers() {
    clearInterval(this.spinInterval);
    clearTimeout(this.heartbeatTimeout);
    clearTimeout(this.reconnectTimeout);
  }
}

module.exports = GameWebSocketClient;
