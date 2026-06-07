import { GameActionHandler, GameSocket } from '../../types';
import { GameActionContext, PersistentDataPayload } from '../types';
import { requireJoined } from '../connection';

class PersistentDataAction implements GameActionHandler<PersistentDataPayload> {
  constructor(private readonly context: GameActionContext) {}

  duplicateKey(ws: GameSocket, payload: PersistentDataPayload): string | null {
    if (!payload.requestId || !ws.userId || !payload.gameId) {
      return null;
    }

    return `persistent-data:${ws.userId}:${payload.gameId}:${payload.requestId}`;
  }

  async handle(ws: GameSocket, payload: PersistentDataPayload): Promise<object> {
    const { userId } = requireJoined(ws);

    return this.context.gamePlayerDataService.save({
      userId,
      requestId: payload.requestId,
      gameId: payload.gameId,
      data: payload.data
    });
  }
}

export default PersistentDataAction;
