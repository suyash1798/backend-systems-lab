import { GameActionHandler, GameSocket } from '../../types';
import GameError from '../../errors/GameError';
import { EndRoundPayload, GameActionContext } from '../types';

class EndRoundAction implements GameActionHandler<EndRoundPayload> {
  constructor(private readonly context: GameActionContext) {}

  async handle(ws: GameSocket, payload: EndRoundPayload): Promise<object> {
    const { userId, roomId } = ws;

    if (!userId || !roomId) {
      throw new GameError('join required', 400);
    }

    return this.context.roundService.endRound({
      userId,
      roomId,
      requestId: payload.requestId
    });
  }
}

export default EndRoundAction;
