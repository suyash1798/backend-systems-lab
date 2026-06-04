import { RoomStateProvider } from '../../game/types';
import Service from './Service';

class StateProvider implements RoomStateProvider {
  readonly key = 'chess';

  constructor(private readonly service: Service) {}

  async state(_userId: string, roomId: string): Promise<unknown> {
    return this.service.state(roomId);
  }
}

export default StateProvider;
