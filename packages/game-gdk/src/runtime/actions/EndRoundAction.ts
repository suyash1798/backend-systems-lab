import { GameActionHandler, GameSocket } from '../../types';
import { EndRoundPayload, GameActionContext } from '../types';
import { requireJoined } from '../connection';

class EndRoundAction implements GameActionHandler<EndRoundPayload> {
  constructor(private readonly context: GameActionContext) {}

  duplicateKey(ws: GameSocket, payload: EndRoundPayload): string | null {
    if (!payload.requestId || !ws.userId || !ws.roomId) {
      return null;
    }

    return `end-round:${ws.userId}:${ws.roomId}:${payload.requestId}`;
  }

  async handle(ws: GameSocket, payload: EndRoundPayload): Promise<object> {
    const { userId, roomId } = requireJoined(ws);

    return this.context.roundService.endRound({
      userId,
      roomId,
      requestId: payload.requestId
    });
  }
}

export default EndRoundAction;
