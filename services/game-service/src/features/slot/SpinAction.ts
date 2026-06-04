import AppError from '../../errors/AppError';
import RequestLogger from '../../observability/RequestLogger';
import { GameActionHandler } from '../../game/actions/GameActionHandler';
import { RequestTrace } from '../../game/types';
import { GameSocket } from '../../types/websocket';
import EventPublisher from './EventPublisher';
import Service, { SpinResponse } from './Service';
import { SpinPayload } from './types';

class SpinAction implements GameActionHandler<SpinPayload> {
  constructor(
    private readonly service: Service,
    private readonly publisher: EventPublisher,
    private readonly logger: RequestLogger
  ) {}

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

    return this.service.spin(request);
  }

  async onSuccess(
    ws: GameSocket,
    _payload: SpinPayload,
    response: object,
    trace: RequestTrace
  ): Promise<void> {
    try {
      await this.publisher.spinCompleted(ws, response as SpinResponse);
    } catch (err) {
      this.logger.redisPublishFailed(trace, err as Error);
    }
  }
}

export default SpinAction;
