import { RoomStateProvider } from '../../game/RoomStateProvider';
import ChessService from './ChessService';

class ChessStateProvider implements RoomStateProvider {
  readonly key = 'chess';

  constructor(private readonly chessService: ChessService) {}

  async state(_userId: string, roomId: string): Promise<unknown> {
    return this.chessService.state(roomId);
  }
}

export default ChessStateProvider;
