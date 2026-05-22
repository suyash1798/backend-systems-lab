import config from './config';
import createApp from './http/createApp';
import WalletClient from './services/walletClient';
import GameSocketServer from './websocket/GameSocketServer';
import RedisPubSub from './infra/redisPubSub';

const walletClient = new WalletClient(config.walletUrl);

const app = createApp();
const server = app.listen(config.port, () => console.log(`game-service listening on ${config.port}`));

const pubSub = new RedisPubSub(config.redisUrl, config.redisChannel);

const gameSocketServer = new GameSocketServer({
  server,
  heartbeatIntervalMs: Number(config.heartbeatIntervalMs),
  playHandler: (userId) => walletClient.playForUser(userId),
  pubSub,
  serverId: config.serverId
});

let stopping = false;

async function start() {
  await pubSub.connect();
  gameSocketServer.start();
}

async function stop() {
  if (stopping) {
    return;
  }

  stopping = true;
  gameSocketServer.stop();
  await pubSub.close();
  server.close();
}

process.on('SIGTERM', () => stop());
process.on('SIGINT', () => stop());

start().catch((err) => {
  console.error('failed to start game-service', err);
  process.exit(1);
});
