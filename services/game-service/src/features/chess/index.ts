import RedisPubSub from '../../infra/redisPubSub';
import RequestLogger from '../../observability/RequestLogger';
import { GameFeature } from '../../game/types';
import EventPublisher from './EventPublisher';
import MoveAction from './MoveAction';
import Repository from './Repository';
import Service from './Service';
import StateProvider from './StateProvider';

interface ChessFeatureOptions {
  repository: Repository;
  pubSub: RedisPubSub;
  serverId: string;
  logger?: RequestLogger;
}

export function createChessFeature(options: ChessFeatureOptions): GameFeature {
  const service = new Service(options.repository);
  const publisher = new EventPublisher(options.pubSub, options.serverId);
  const logger = options.logger || new RequestLogger();

  return {
    handlers: {
      chess_move: new MoveAction(service, publisher, logger)
    },
    idempotencyKey: (ws, payload) => {
      if (payload.action !== 'chess_move') {
        return undefined;
      }

      if (!ws.userId || !ws.roomId) {
        return null;
      }

      return `chess_move:${ws.roomId}:${ws.userId}:${payload.requestId}`;
    },
    roomStateProviders: [
      new StateProvider(service)
    ]
  };
}

export { default as ChessRepository } from './Repository';
