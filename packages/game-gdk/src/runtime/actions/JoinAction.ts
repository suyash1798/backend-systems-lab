import { GameActionHandler, GameSocket, RequestTrace } from '../../types';
import GameError from '../../errors/GameError';
import { GameActionContext, JoinPayload } from '../types';

class JoinAction implements GameActionHandler<JoinPayload> {
  constructor(private readonly context: GameActionContext) {}

  duplicateKey(_ws: GameSocket, payload: JoinPayload): string {
    return `join:${payload.userId || 'unknown'}:${payload.roomId}:${payload.requestId}`;
  }

  async handle(ws: GameSocket, payload: JoinPayload): Promise<object> {
    const { userId, roomId, requestId } = payload;

    if (!userId) {
      throw new GameError('invalid token', 401);
    }

    if (!await this.context.roomMembershipRepository.exists(userId, roomId)) {
      throw new GameError('room membership required', 403);
    }

    ws.userId = userId;
    ws.roomId = roomId;

    return {
      status: 'ok',
      action: 'joined',
      userId,
      roomId,
      requestId,
      roundHistory: await this.context.roundService.history(userId, roomId),
      roomState: await this.roomState(userId, roomId)
    };
  }

  async onSuccess(ws: GameSocket, payload: JoinPayload, _response: object, trace: RequestTrace): Promise<void> {
    try {
      await this.context.publisher.playerJoined(ws, { requestId: payload.requestId });
    } catch (err) {
      this.context.logger.redisPublishFailed?.(trace, err as Error);
    }
  }

  private async roomState(userId: string, roomId: string): Promise<Record<string, unknown>> {
    const state: Record<string, unknown> = {};

    for (const provider of this.context.roomStateProviders) {
      state[provider.key] = await provider.state(userId, roomId);
    }

    return state;
  }
}

export default JoinAction;
