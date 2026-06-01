import AppError from '../../errors/AppError';
import { GameSocket, SpinPayload } from '../../types/websocket';
import { SpinResponse } from '../services/SpinService';
import { GameActionHandler } from './GameActionHandler';
import { ActionContext, RequestTrace } from './types';

class SpinAction implements GameActionHandler<SpinPayload> {
  constructor(private readonly context: ActionContext) {}

  async handle(ws: GameSocket, payload: SpinPayload): Promise<SpinResponse> {
    const { requestId, gameId, spinId, betAmount } = payload;
    const { userId, roomId } = ws;

    if (!userId || !roomId) {
      throw new AppError('join required', 400);
    }

    const request = {
      userId,
      roomId,
      requestId,
      gameId,
      spinId,
      betAmount
    };

    return this.context.spinService.spin(request);
  }

  async onSuccess(
    ws: GameSocket,
    _payload: SpinPayload,
    response: object,
    trace: RequestTrace
  ): Promise<void> {
    const spin = response as SpinResponse;
    const spinCompleteData = {
      roundId: spin.roundId,
      spinId: spin.spinId,
      betAmount: spin.betAmount,
      winAmount: spin.winAmount,
      symbols: spin.symbols,
      balance: spin.balance,
      requestId: spin.requestId
    };

    try {
      await this.context.publisher.spinCompleted(ws, spinCompleteData);
    } catch (err) {
      this.context.logger.redisPublishFailed(trace, err as Error);
    }
  }
}

export default SpinAction;
