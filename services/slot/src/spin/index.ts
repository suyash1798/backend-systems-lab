import { GameFeature, GameRuntimeContext } from '@trying-sd/game-gdk';
import { SlotEvent } from './types';
import SpinAction from './Action';
import SpinRepository from './Repository';
import SpinService from './Service';
import { spinSchema } from './schema';

interface SlotFeatureOptions {
  game: GameRuntimeContext<SlotEvent>;
  spinRepository: SpinRepository;
}

export const slotSchemas = [spinSchema] as const;

export function createSlotFeature(options: SlotFeatureOptions): GameFeature {
  const spin = {
    schema: spinSchema,
    handler: new SpinAction(
      new SpinService(options.game, options.spinRepository),
      options.game
    )
  };

  return {
    schemas: [spin.schema],
    handlers: {
      spin: spin.handler
    }
  };
}

export { default as SpinAction } from './Action';
export { default as SpinRepository } from './Repository';
export { default as SpinService } from './Service';
export { spinSchema } from './schema';
