import RedisPubSub from '../../infra/redisPubSub';
import RequestLogger from '../../observability/RequestLogger';
import CurrentRoundRepository from '../../repositories/CurrentRoundRepository';
import RoundRepository from '../../repositories/RoundRepository';
import { GameFeature, WalletCreditHandler, WalletDeductHandler } from '../../game/types';
import { GameSocket } from '../../types/websocket';
import EventPublisher from './EventPublisher';
import SpinAction from './SpinAction';
import Repository from './Repository';
import Service from './Service';
import { SpinPayload } from './types';

interface SlotFeatureOptions {
  deductWallet: WalletDeductHandler;
  creditWallet: WalletCreditHandler;
  currentRoundRepository: CurrentRoundRepository;
  roundRepository: RoundRepository;
  spinRepository: Repository;
  pubSub: RedisPubSub;
  serverId: string;
  logger?: RequestLogger;
}

export function createSlotFeature(options: SlotFeatureOptions): GameFeature {
  const logger = options.logger || new RequestLogger();
  const service = new Service(
    options.deductWallet,
    options.creditWallet,
    options.currentRoundRepository,
    options.roundRepository,
    options.spinRepository
  );
  const publisher = new EventPublisher(options.pubSub, options.serverId);

  return {
    handlers: {
      spin: new SpinAction(service, publisher, logger)
    },
    idempotencyKey: async (ws, payload) => {
      if (payload.action !== 'spin') {
        return undefined;
      }

      return spinIdempotencyKey(ws, payload, service);
    },
    hasConflict: (payload, response) => {
      if (payload.action !== 'spin') {
        return false;
      }

      return spinConflict(payload, response);
    }
  };
}

async function spinIdempotencyKey(
  ws: GameSocket,
  payload: SpinPayload,
  service: Service
): Promise<string | null> {
  if (!ws.userId || !ws.roomId) {
    return null;
  }

  const round = await service.activeRound(ws.userId, ws.roomId);
  return `spin:${round.roundId}:${payload.spinId}`;
}

function spinConflict(payload: SpinPayload, response?: object): boolean {
  if (!response) {
    return false;
  }

  const spin = response as { betAmount?: number; gameId?: string; spinId?: string };

  return (
    spin.betAmount !== payload.betAmount ||
    spin.gameId !== payload.gameId ||
    spin.spinId !== payload.spinId
  );
}

export { default as SpinRepository } from './Repository';
