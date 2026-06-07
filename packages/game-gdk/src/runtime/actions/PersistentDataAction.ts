import { GameActionHandler, GameSocket } from '../../types';
import { GameActionContext, PersistentDataPayload } from '../types';
import { requireJoined } from '../connection';

class PersistentDataAction implements GameActionHandler<PersistentDataPayload> {
  private readonly action = 'persistent_data';

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

  async onSuccess(ws: GameSocket, payload: PersistentDataPayload): Promise<void> {
    const { userId, roomId } = requireJoined(ws);

    await this.context.roundService.recordActionIfActive(userId, roomId, {
      action: this.action,
      requestId: payload.requestId,
      payload: { gameId: payload.gameId, data: payload.data },
      result: { status: 'ok' }
    });
  }
}

export default PersistentDataAction;
