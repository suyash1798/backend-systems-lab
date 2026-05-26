import { Server as HttpServer } from 'http';
import config from './config';
import { createApp } from './http';
import RedisPubSub from './infra/redisPubSub';
import WalletClient from './services/walletClient';
import GameSocketServer from './websocket/GameSocketServer';

class GameServiceApp {
  private readonly walletClient = new WalletClient(config.walletUrl);
  private readonly pubSub = new RedisPubSub(config.redisUrl, config.redisChannel);
  private httpServer: HttpServer | null = null;
  private gameSocketServer: GameSocketServer | null = null;
  private stopping = false;

  async start(): Promise<void> {
    await this.pubSub.connect();

    this.httpServer = createApp().listen(
      config.port,
      () => console.log(`game-service listening on ${config.port}`)
    );

    this.gameSocketServer = new GameSocketServer({
      server: this.httpServer,
      heartbeatIntervalMs: Number(config.heartbeatIntervalMs),
      adjustWallet: (userId, amount) => this.walletClient.adjustBalance(userId, amount),
      pubSub: this.pubSub,
      serverId: config.serverId
    });

    this.gameSocketServer.start();
    this.registerShutdownHooks();
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    this.gameSocketServer?.stop();
    await this.pubSub.close();
    this.httpServer?.close();
  }

  private registerShutdownHooks(): void {
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }
}

const app = new GameServiceApp();

app.start().catch((err) => {
  console.error('failed to start game-service', err);
  process.exit(1);
});
