import { GameActionHandler } from '@trying-sd/game-gdk';
import AppError from '../../errors/AppError';
import { EndRoundPayload, GameSocket } from '../../types/websocket';
import { EndRoundResponse } from '../services/RoundService';
import { ActionContext } from '../types';

class EndRoundAction implements GameActionHandler<EndRoundPayload> {
  constructor(private readonly context: ActionContext) {}

  async handle(ws: GameSocket, payload: EndRoundPayload): Promise<EndRoundResponse> {
    const { requestId } = payload;
    const { userId, roomId } = ws;

    if (!userId || !roomId) {
      throw new AppError('join required', 400);
    }

    const request = { userId, roomId, requestId };
    return this.context.roundService.endRound(request);
  }
}

export default EndRoundAction;
