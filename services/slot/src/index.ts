import { createMessageValidator } from '@trying-sd/game-gdk';
import { HostedGameRuntime, startHostedGame } from '@trying-sd/game-host';
import {
  SpinRepository,
  createSlotFeature,
  slotSchemas
} from './spin';
import { IncomingMessagePayload, SlotEvent } from './spin/types';

const SERVICE_NAME = 'slot-service';

class SlotRuntime extends HostedGameRuntime<IncomingMessagePayload, SlotEvent> {
  constructor() {
    super({ name: SERVICE_NAME });

    this.registerFeature(
      createSlotFeature({
        game: this.context,
        spinRepository: new SpinRepository(this.prisma)
      })
    );
  }
}

const validateMessage = createMessageValidator<IncomingMessagePayload>(slotSchemas);

startHostedGame(new SlotRuntime(), validateMessage);
