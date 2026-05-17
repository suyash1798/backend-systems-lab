const WebSocket = require('ws');

class GameWebSocketClient {
  constructor({ wsUrl, userId, heartbeatIntervalMs, heartbeatGraceMs, playIntervalMs, reconnectDelayMs }) {
    this.wsUrl = wsUrl;
    this.userId = userId;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.heartbeatGraceMs = heartbeatGraceMs;
    this.playIntervalMs = playIntervalMs;
    this.reconnectDelayMs = reconnectDelayMs;
    this.ws = null;
    this.playInterval = null;
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
    this.startPlaying();
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

  startPlaying() {
    this.playInterval = setInterval(() => this.sendPlayMessage(), this.playIntervalMs);
  }

  sendPlayMessage() {
    const message = JSON.stringify({ action: 'play', userId: this.userId });
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
    clearInterval(this.playInterval);
    clearTimeout(this.heartbeatTimeout);
    clearTimeout(this.reconnectTimeout);
  }
}

module.exports = GameWebSocketClient;
