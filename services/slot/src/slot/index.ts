import {
  GameFeature,
  GameRuntimeContext,
  GameSocket
} from '@trying-sd/game-gdk';
import SpinAction from './SpinAction';
import SpinRepository from './SpinRepository';
import SpinService from './SpinService';
import { SpinPayload } from './types';
import { SlotEvent } from '../contracts';

interface SlotFeatureOptions {
  game: GameRuntimeContext<SlotEvent>;
  spinRepository: SpinRepository;
}

export function createSlotFeature(options: SlotFeatureOptions): GameFeature {
  const service = new SpinService(
    options.game,
    options.spinRepository
  );

  return {
    handlers: {
      spin: new SpinAction(service, options.game)
    },
    idempotencyKey: async (ws, payload) => {
      if (payload.action !== 'spin') {
        return undefined;
      }

      return spinIdempotencyKey(ws, payload, options.game);
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
  game: GameRuntimeContext<SlotEvent>
): Promise<string | null> {
  if (!ws.userId || !ws.roomId) {
    return null;
  }

  const round = await game.rounds.activeOrCreate(ws.userId, ws.roomId);
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

export { default as SpinRepository } from './SpinRepository';
