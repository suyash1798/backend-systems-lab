import { randomUUID } from 'crypto';
import { Server as HttpServer } from 'http';
import { RawData, WebSocketServer } from 'ws';
import {
  GameSocket,
  IncomingMessagePayload,
  MessageRouter,
  RoomEvent,
  ValidateMessage
} from '../types';
import Heartbeat from './Heartbeat';
import RoomRegistry from './RoomRegistry';

interface PubSubSubscriber {
  onMessage(handler: (event: RoomEvent) => void): void;
}

interface HostLogger {
  log(event: string, data?: Record<string, unknown>): void;
}

interface HostOptions<TPayload extends IncomingMessagePayload> {
  server: HttpServer;
  heartbeatIntervalMs: number;
  pubSub: PubSubSubscriber;
  validateMessage: ValidateMessage<TPayload>;
  router: MessageRouter<TPayload>;
  logger?: HostLogger;
}

class Host<TPayload extends IncomingMessagePayload> {
  private readonly wss: WebSocketServer;
  private readonly heartbeat: Heartbeat;
  private readonly rooms = new RoomRegistry();
  private readonly logger: HostLogger;

  constructor(private readonly options: HostOptions<TPayload>) {
    this.wss = new WebSocketServer({ server: options.server });
    this.heartbeat = new Heartbeat(this.wss, options.heartbeatIntervalMs);
    this.logger = options.logger || {
      log: (event, data) => console.log(event, data || {})
    };
  }

  start(): void {
    this.options.pubSub.onMessage((event) => this.rooms.notify(event));

    this.wss.on('connection', (ws) => this.handleConnection(ws as GameSocket));
    this.wss.on('close', () => this.stop());
    this.heartbeat.start();
  }

  stop(): void {
    this.heartbeat.stop();
  }

  private handleConnection(ws: GameSocket): void {
    ws.id = randomUUID();
    ws.isAlive = true;
    ws.roomId = null;
    ws.userId = null;
    ws.processedRequests = new Map();
    ws.pendingRequests = new Set();
    this.logger.log('ws_connected', { connectionId: ws.id });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (msg) => this.handleMessage(ws, msg));
    ws.on('close', () => {
      this.rooms.remove(ws);
      this.logger.log('ws_closed', { connectionId: ws.id, userId: ws.userId, roomId: ws.roomId });
    });
  }

  private async handleMessage(ws: GameSocket, msg: RawData): Promise<void> {
    let payload: TPayload;

    try {
      payload = this.options.validateMessage(JSON.parse(msg.toString()));
    } catch (err) {
      this.logger.log('ws_invalid_message', { connectionId: ws.id });
      ws.send(JSON.stringify({ status: 'error', error: 'invalid message' }));
      return;
    }

    await this.options.router.handle(ws, payload);

    if (ws.userId) {
      this.rooms.closeExistingUserConnection(ws.userId, ws);
    }

    this.rooms.sync(ws);
  }
}

export default Host;
