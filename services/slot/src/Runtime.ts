import { HostedGameRuntime } from '@trying-sd/game-host';
import { SpinRepository, createSlotFeature } from './slot';
import { IncomingMessagePayload, SlotEvent } from './contracts';

const SERVICE_NAME = 'slot-service';

class SlotRuntime extends HostedGameRuntime<IncomingMessagePayload, SlotEvent> {
  constructor() {
    super({ name: SERVICE_NAME });

    this.registerFeature(
      createSlotFeature({
        game: this.context,
        spinRepository: new SpinRepository(this.prisma),
      })
    );
  }
}

export default SlotRuntime;
