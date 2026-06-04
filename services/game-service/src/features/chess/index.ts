import RedisPubSub from '../../infra/redisPubSub';
import RequestLogger from '../../observability/RequestLogger';
import { GameFeature } from '../../game/GameFeature';
import ChessEventPublisher from './ChessEventPublisher';
import ChessMoveAction from './ChessMoveAction';
import ChessRepository from './ChessRepository';
import ChessService from './ChessService';
import ChessStateProvider from './ChessStateProvider';

interface ChessFeatureOptions {
  repository: ChessRepository;
  pubSub: RedisPubSub;
  serverId: string;
  logger?: RequestLogger;
}

export function createChessFeature(options: ChessFeatureOptions): GameFeature {
  const service = new ChessService(options.repository);
  const publisher = new ChessEventPublisher(options.pubSub, options.serverId);
  const logger = options.logger || new RequestLogger();

  return {
    handlers: {
      chess_move: new ChessMoveAction(service, publisher, logger)
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
      new ChessStateProvider(service)
    ]
  };
}

export { ChessRepository };
