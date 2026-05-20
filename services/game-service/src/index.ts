import config from './config';
import createApp from './http/createApp';
import WalletClient from './services/walletClient';
import EventBus from './events/eventBus';
import GameSocketServer from './websocket/GameSocketServer';
import RedisPubSub from './infra/redisPubSub';

const walletClient = new WalletClient({ baseUrl: config.walletUrl });
const app = createApp();
const server = app.listen(config.port, () => console.log(`game-service listening on ${config.port}`));
const pubSub = new RedisPubSub({ url: config.redisUrl, channel: config.redisChannel });
const eventBus = new EventBus({ pubSub, serverId: config.serverId });

const gameSocketServer = new GameSocketServer({
  server,
  heartbeatIntervalMs: config.heartbeatIntervalMs,
  playHandler: (userId) => walletClient.playForUser(userId),
  eventBus
});

gameSocketServer.start().catch((err) => {
  console.error('failed to start websocket server', err);
  process.exit(1);
});
