import { GameActionHandler, GameSocket } from '../../types';
import GameError from '../../errors/GameError';
import { GameActionContext, PersistentDataPayload } from '../types';

class PersistentDataAction implements GameActionHandler<PersistentDataPayload> {
  private readonly action = 'persistent_data';

  constructor(private readonly context: GameActionContext) {}

  async handle(ws: GameSocket, payload: PersistentDataPayload): Promise<object> {
    const { userId, roomId } = ws;

    if (!userId || !roomId) {
      throw new GameError('join required', 400);
    }

    return this.context.gamePlayerDataService.save({
      userId,
      requestId: payload.requestId,
      gameId: payload.gameId,
      data: payload.data
    });
  }

  async onSuccess(ws: GameSocket, payload: PersistentDataPayload): Promise<void> {
    await this.context.roundService.recordActionIfActive(ws.userId!, ws.roomId!, {
      action: this.action,
      requestId: payload.requestId,
      payload: { gameId: payload.gameId, data: payload.data },
      result: { status: 'ok' }
    });
  }
}

export default PersistentDataAction;
