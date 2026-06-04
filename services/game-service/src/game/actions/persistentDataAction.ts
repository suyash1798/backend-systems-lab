import AppError from '../../errors/AppError';
import { GameSocket, PersistentDataPayload } from '../../types/websocket';
import { PersistentDataResponse } from '../services/GamePlayerDataService';
import { GameActionHandler } from './GameActionHandler';
import { ActionContext } from '../types';

class PersistentDataAction implements GameActionHandler<PersistentDataPayload> {
  private readonly action = 'persistent_data';

  constructor(private readonly context: ActionContext) {}

  async handle(
    ws: GameSocket,
    payload: PersistentDataPayload
  ): Promise<PersistentDataResponse> {
    const { requestId, gameId, data } = payload;
    const { userId, roomId } = ws;

    if (!userId || !roomId) {
      throw new AppError('join required', 400);
    }

    const request = { userId, requestId, gameId, data };
    return this.context.gamePlayerDataService.save(request);
  }

  async onSuccess(
    ws: GameSocket,
    payload: PersistentDataPayload
  ) {
    const { userId, roomId } = ws;
    const { requestId } = payload;
    const actionPayload = { gameId: payload.gameId, data: payload.data };
    const result = { status: 'ok' };

    const roundAction = {
      action: this.action,
      requestId,
      payload: actionPayload,
      result,
    };

    await this.context.roundService.recordActionIfActive(userId!, roomId!, roundAction);
  }
}

export default PersistentDataAction;
