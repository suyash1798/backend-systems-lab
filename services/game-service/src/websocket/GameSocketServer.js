const WebSocket = require('ws');
const crypto = require('crypto');
const MessageRouter = require('./messageRouter');
const RoomNotifier = require('./roomNotifier');

class GameSocketServer {
  constructor({ server, heartbeatIntervalMs, playHandler, eventBus }) {
    this.wss = new WebSocket.Server({ server });
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.eventBus = eventBus;
    this.heartbeatInterval = null;
    this.roomNotifier = new RoomNotifier({
      clients: this.wss.clients,
      send: (ws, payload) => this.send(ws, payload)
    });
    this.messageRouter = new MessageRouter({
      playHandler,
      eventBus,
      roomNotifier: this.roomNotifier
    });
  }

  async start() {
    this.eventBus.subscribe((event) => this.roomNotifier.notifyRoom(event));
    await this.eventBus.start();

    this.wss.on('connection', (ws) => this.handleConnection(ws));
    this.wss.on('close', () => this.stop());
    this.startHeartbeat();
  }

  handleConnection(ws) {
    console.log('ws: client connected');
    ws.id = crypto.randomUUID();
    ws.isAlive = true;
    ws.roomId = null;
    ws.userId = null;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (msg) => this.handleMessage(ws, msg));
  }

  async handleMessage(ws, msg) {
    return await this.messageRouter.handleMessage(ws, msg, (client, payload) => this.send(client, payload));
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

  async stop() {
    clearInterval(this.heartbeatInterval);
    await this.eventBus.stop();
  }
}

module.exports = GameSocketServer;
