import { randomUUID } from 'crypto';
import { Server as HttpServer } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import EventBus from '../events/eventBus';
import { WalletAdjustResponse } from '../types/wallet';
import { GameSocket, OutgoingPayload } from '../types/websocket';
import MessageRouter from './messageRouter';
import RoomNotifier from './roomNotifier';

type PlayHandler = (userId: string) => Promise<WalletAdjustResponse>;

class GameSocketServer {
  private readonly wss: WebSocketServer;
  private readonly heartbeatIntervalMs: number;
  private readonly eventBus: EventBus;
  private readonly roomNotifier: RoomNotifier;
  private readonly messageRouter: MessageRouter;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor({
    server,
    heartbeatIntervalMs,
    playHandler,
    eventBus
  }: {
    server: HttpServer;
    heartbeatIntervalMs: number;
    playHandler: PlayHandler;
    eventBus: EventBus;
  }) {
    this.wss = new WebSocketServer({ server });
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.eventBus = eventBus;
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

  async start(): Promise<void> {
    this.eventBus.subscribe((event) => this.roomNotifier.notifyRoom(event));
    await this.eventBus.start();

    this.wss.on('connection', (ws) => this.handleConnection(ws as GameSocket));
    this.wss.on('close', () => this.stop());
    this.startHeartbeat();
  }

  private handleConnection(ws: GameSocket): void {
    console.log('ws: client connected');
    ws.id = randomUUID();
    ws.isAlive = true;
    ws.roomId = null;
    ws.userId = null;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (msg) => this.handleMessage(ws, msg));
  }

  private async handleMessage(ws: GameSocket, msg: RawData): Promise<void> {
    await this.messageRouter.handleMessage(ws, Buffer.from(msg as Buffer), (client, payload) => this.send(client, payload));
  }

  private send(ws: GameSocket, payload: OutgoingPayload): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => this.checkClientHeartbeat(ws as GameSocket));
    }, this.heartbeatIntervalMs);
  }

  private checkClientHeartbeat(ws: GameSocket): void {
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

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    await this.eventBus.stop();
  }
}

export default GameSocketServer;
