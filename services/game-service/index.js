const config = require('./src/config');
const createApp = require('./src/http/createApp');
const WalletClient = require('./src/services/walletClient');
const EventBus = require('./src/events/eventBus');
const GameSocketServer = require('./src/websocket/GameSocketServer');
const RedisPubSub = require('./src/infra/redisPubSub');

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
