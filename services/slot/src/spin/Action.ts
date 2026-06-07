import {
  GameActionHandler,
  GameRuntimeContext,
  GameSocket,
  RequestTrace,
  requireJoined
} from '@trying-sd/game-gdk';
import SpinService, { SpinResponse } from './Service';
import { SlotEvent, SpinPayload } from './types';

class SpinAction implements GameActionHandler<SpinPayload> {
  constructor(
    private readonly service: SpinService,
    private readonly game: GameRuntimeContext<SlotEvent>
  ) {}

  async handle(ws: GameSocket, payload: SpinPayload): Promise<SpinResponse> {
    const { requestId, gameId, spinId, betAmount } = payload;
    const { userId, roomId } = requireJoined(ws);

    const request = {
      userId,
      roomId,
      requestId,
      gameId,
      spinId,
      betAmount
    };

    return this.service.spin(request);
  }

  async onSuccess(
    ws: GameSocket,
    _payload: SpinPayload,
    response: object,
    trace: RequestTrace
  ): Promise<void> {
    try {
      const spin = response as SpinResponse;

      await this.game.roomEvents.playerAction(ws, 'spin', {
        roundId: spin.roundId,
        spinId: spin.spinId,
        betAmount: spin.betAmount,
        winAmount: spin.winAmount,
        symbols: spin.symbols,
        balance: spin.balance,
        requestId: spin.requestId
      });
    } catch (err) {
      this.game.logger.redisPublishFailed?.(trace, err as Error);
    }
  }

  async duplicateKey(ws: GameSocket, payload: SpinPayload): Promise<string | null> {
    if (!ws.userId || !ws.roomId) {
      return null;
    }

    const round = await this.game.rounds.activeOrCreate(ws.userId, ws.roomId);

    return `spin:${round.roundId}:${payload.spinId}`;
  }
}

export default SpinAction;
