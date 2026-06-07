import { RequestListener } from 'http';
import GameHost from './GameHost';
import {
  IncomingMessagePayload,
  MessageRouter,
  RoomEvent,
  ValidateMessage
} from '@trying-sd/game-gdk';

interface PubSubSubscriber {
  onMessage(handler: (event: RoomEvent) => void): void;
}

interface HostLogger {
  log(event: string, data?: Record<string, unknown>): void;
}

interface ServiceLifecycle {
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface GameServiceHostOptions<TPayload extends IncomingMessagePayload> {
  name: string;
  port: number;
  app: RequestListener;
  heartbeatIntervalMs: number;
  pubSub: PubSubSubscriber;
  validateMessage: ValidateMessage<TPayload>;
  router: MessageRouter<TPayload>;
  logger?: HostLogger;
  lifecycle?: ServiceLifecycle;
}

class GameServiceHost<TPayload extends IncomingMessagePayload> {
  private readonly host: GameHost<TPayload>;
  private stopping = false;

  constructor(private readonly options: GameServiceHostOptions<TPayload>) {
    this.host = new GameHost({
      name: options.name,
      port: options.port,
      app: options.app,
      heartbeatIntervalMs: options.heartbeatIntervalMs,
      pubSub: options.pubSub,
      validateMessage: options.validateMessage,
      router: options.router,
      logger: options.logger
    });
  }

  async start(): Promise<void> {
    await this.options.lifecycle?.start();
    await this.host.start();
    this.registerShutdownHooks();
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    await this.host.stop();
    await this.options.lifecycle?.stop();
  }

  private registerShutdownHooks(): void {
    process.once('SIGTERM', () => void this.shutdown('SIGTERM'));
    process.once('SIGINT', () => void this.shutdown('SIGINT'));
  }

  private async shutdown(signal: string): Promise<void> {
    try {
      await this.stop();
      console.log(`${this.options.name} stopped after ${signal}`);
    } catch (err) {
      console.error(`${this.options.name} shutdown failed`, (err as Error).message);
    }
  }
}

export default GameServiceHost;
