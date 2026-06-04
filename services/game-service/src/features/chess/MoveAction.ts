import AppError from '../../errors/AppError';
import RequestLogger from '../../observability/RequestLogger';
import { GameActionHandler } from '../../game/actions/GameActionHandler';
import { RequestTrace } from '../../game/types';
import { GameSocket } from '../../types/websocket';
import EventPublisher from './EventPublisher';
import Service, { ChessMoveResponse } from './Service';
import { ChessMovePayload } from './types';

class MoveAction implements GameActionHandler<ChessMovePayload> {
  constructor(
    private readonly service: Service,
    private readonly publisher: EventPublisher,
    private readonly logger: RequestLogger
  ) {}

  async handle(ws: GameSocket, payload: ChessMovePayload): Promise<ChessMoveResponse> {
    const { userId, roomId } = ws;

    if (!userId || !roomId) {
      throw new AppError('join required', 400);
    }

    return this.service.move({
      userId,
      roomId,
      requestId: payload.requestId,
      from: payload.from,
      to: payload.to,
      promotion: payload.promotion
    });
  }

  async onSuccess(
    ws: GameSocket,
    _payload: ChessMovePayload,
    response: object,
    trace: RequestTrace
  ): Promise<void> {
    try {
      await this.publisher.moveMade(ws, response as ChessMoveResponse);
    } catch (err) {
      this.logger.redisPublishFailed(trace, err as Error);
    }
  }
}

export default MoveAction;
