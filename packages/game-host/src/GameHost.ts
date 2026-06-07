import { createServer, RequestListener, Server as HttpServer } from 'http';
import {
  IncomingMessagePayload,
  MessageRouter,
  RoomEvent,
  ValidateMessage
} from '@trying-sd/game-gdk';
import WebSocketHost from './websocket/Host';

interface PubSubSubscriber {
  onMessage(handler: (event: RoomEvent) => void): void;
}

interface HostLogger {
  log(event: string, data?: Record<string, unknown>): void;
}

interface GameHostOptions<TPayload extends IncomingMessagePayload> {
  name: string;
  port: number;
  app: RequestListener;
  heartbeatIntervalMs: number;
  pubSub: PubSubSubscriber;
  validateMessage: ValidateMessage<TPayload>;
  router: MessageRouter<TPayload>;
  logger?: HostLogger;
}

class GameHost<TPayload extends IncomingMessagePayload> {
  private readonly httpServer: HttpServer;
  private readonly webSocketHost: WebSocketHost<TPayload>;

  constructor(private readonly options: GameHostOptions<TPayload>) {
    this.httpServer = createServer(options.app);
    this.webSocketHost = new WebSocketHost({
      server: this.httpServer,
      heartbeatIntervalMs: options.heartbeatIntervalMs,
      pubSub: options.pubSub,
      validateMessage: options.validateMessage,
      router: options.router,
      logger: options.logger
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.options.port, () => {
        this.webSocketHost.start();
        console.log(`${this.options.name} listening on ${this.options.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    this.webSocketHost.stop();

    return new Promise((resolve) => {
      this.httpServer.close(() => resolve());
    });
  }
}

export default GameHost;
