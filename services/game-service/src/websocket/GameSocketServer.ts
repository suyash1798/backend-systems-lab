import { randomUUID } from 'crypto';
import { Server as HttpServer } from 'http';
import { RawData, WebSocketServer } from 'ws';
import GameActions, { WalletAdjustHandler } from '../game/GameActions';
import RedisPubSub from '../infra/redisPubSub';
import { log } from '../observability/logger';
import { PlayerEvent } from '../types/events';
import { GameSocket, IncomingMessagePayload } from '../types/websocket';
import Heartbeat from './Heartbeat';

class GameSocketServer {
  private readonly wss: WebSocketServer;
  private readonly heartbeat: Heartbeat;
  private readonly actions: GameActions;
  private readonly pubSub: RedisPubSub;

  constructor({
    server,
    heartbeatIntervalMs,
    adjustWallet,
    pubSub,
    serverId
  }: {
    server: HttpServer;
    heartbeatIntervalMs: number;
    adjustWallet: WalletAdjustHandler;
    pubSub: RedisPubSub;
    serverId: string;
  }) {
    this.wss = new WebSocketServer({ server });
    this.heartbeat = new Heartbeat(this.wss, heartbeatIntervalMs);
    this.pubSub = pubSub;
    this.actions = new GameActions(adjustWallet, pubSub, serverId);
  }

  start(): void {
    this.pubSub.onMessage((event) => this.notifyRoom(event));

    this.wss.on('connection', (ws) => this.handleConnection(ws as GameSocket));
    this.wss.on('close', () => this.stop());
    this.heartbeat.start();
  }

  private handleConnection(ws: GameSocket): void {
    ws.id = randomUUID();
    ws.isAlive = true;
    ws.roomId = null;
    ws.userId = null;
    ws.processedRequests = new Map();
    ws.pendingRequests = new Set();
    log('ws_connected', { connectionId: ws.id });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (msg) => this.handleMessage(ws, msg));
    ws.on('close', () => log('ws_closed', { connectionId: ws.id, userId: ws.userId, roomId: ws.roomId }));
  }

  private async handleMessage(ws: GameSocket, msg: RawData): Promise<void> {
    let payload: IncomingMessagePayload;

    try {
      payload = JSON.parse(msg.toString());
    } catch (err) {
      log('ws_invalid_json', { connectionId: ws.id });
      ws.send(JSON.stringify({ status: 'error', error: 'invalid json' }));
      return;
    }

    await this.actions.handle(ws, payload);
  }

  private notifyRoom(event: PlayerEvent): void {
    this.wss.clients.forEach((client) => {
      const gameClient = client as GameSocket;

      if (gameClient.roomId !== event.roomId || gameClient.id === event.sourceConnectionId) {
        return;
      }

      gameClient.send(JSON.stringify({ type: 'notification', event }));
    });
  }

  stop(): void {
    this.heartbeat.stop();
  }
}

export default GameSocketServer;
