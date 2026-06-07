import { RequestListener } from 'http';
import GameServiceHost from './GameServiceHost';
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

export interface GameServiceRuntime<TPayload extends IncomingMessagePayload> {
  name: string;
  port: number;
  app: RequestListener;
  heartbeatIntervalMs: number;
  pubSub: PubSubSubscriber;
  logger?: HostLogger;
  start(): Promise<void>;
  stop(): Promise<void>;
  actions(): MessageRouter<TPayload>;
}

interface StartGameServiceOptions<TPayload extends IncomingMessagePayload> {
  runtime: GameServiceRuntime<TPayload>;
  validateMessage: ValidateMessage<TPayload>;
}

function startGameService<TPayload extends IncomingMessagePayload>(
  options: StartGameServiceOptions<TPayload>
): GameServiceHost<TPayload> {
  const host = new GameServiceHost<TPayload>({
    name: options.runtime.name,
    port: options.runtime.port,
    app: options.runtime.app,
    heartbeatIntervalMs: options.runtime.heartbeatIntervalMs,
    pubSub: options.runtime.pubSub,
    validateMessage: options.validateMessage,
    router: options.runtime.actions(),
    logger: options.runtime.logger,
    lifecycle: options.runtime
  });

  host.start().catch((err) => {
    console.error(`failed to start ${options.runtime.name}`, err);
    process.exit(1);
  });

  return host;
}

export default startGameService;
