import RedisPubSub from '../../infra/redisPubSub';
import RequestLogger from '../../observability/RequestLogger';
import CurrentRoundRepository from '../../repositories/CurrentRoundRepository';
import RoundRepository from '../../repositories/RoundRepository';
import { GameFeature } from '../../game/GameFeature';
import { WalletCreditHandler, WalletDeductHandler } from '../../game/actions/types';
import { GameSocket } from '../../types/websocket';
import SlotEventPublisher from './SlotEventPublisher';
import SpinAction from './SpinAction';
import SpinRepository from './SpinRepository';
import SlotService from './SlotService';
import { SpinPayload } from './types';

interface SlotFeatureOptions {
  deductWallet: WalletDeductHandler;
  creditWallet: WalletCreditHandler;
  currentRoundRepository: CurrentRoundRepository;
  roundRepository: RoundRepository;
  spinRepository: SpinRepository;
  pubSub: RedisPubSub;
  serverId: string;
  logger?: RequestLogger;
}

export function createSlotFeature(options: SlotFeatureOptions): GameFeature {
  const logger = options.logger || new RequestLogger();
  const slotService = new SlotService(
    options.deductWallet,
    options.creditWallet,
    options.currentRoundRepository,
    options.roundRepository,
    options.spinRepository
  );
  const publisher = new SlotEventPublisher(options.pubSub, options.serverId);

  return {
    handlers: {
      spin: new SpinAction(slotService, publisher, logger)
    },
    idempotencyKey: async (ws, payload) => {
      if (payload.action !== 'spin') {
        return undefined;
      }

      return spinIdempotencyKey(ws, payload, slotService);
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
  slotService: SlotService
): Promise<string | null> {
  if (!ws.userId || !ws.roomId) {
    return null;
  }

  const round = await slotService.activeRound(ws.userId, ws.roomId);
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

export { SpinRepository };
