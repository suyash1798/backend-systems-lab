import { GameSocket, JoinPayload } from '../../types/websocket';
import { ActionContext, remember, RequestTrace } from './types';

export async function joinAction(
  ws: GameSocket,
  payload: JoinPayload,
  context: ActionContext,
  trace: RequestTrace,
  startedAt: number,
  idempotencyKey: string | null
): Promise<void> {
  const { userId, roomId, requestId } = payload;

  if (!userId) {
    context.logger.failed(trace, startedAt, 'invalid token');
    context.responder.error(ws, 'invalid token', requestId);
    return;
  }

  ws.userId = userId;
  ws.roomId = roomId;

  if (idempotencyKey && !await context.idempotencyRepository.reserve(idempotencyKey)) {
    context.logger.duplicatePending(trace, startedAt);
    context.responder.pending(ws, requestId);
    return;
  }

  const roundHistory = await context.roundService.history(userId, roomId);
  const response = { status: 'ok', action: 'joined', userId, roomId, requestId, roundHistory };
  await remember(ws, idempotencyKey, response, context.idempotencyRepository);
  context.responder.ok(ws, { action: 'joined', userId, roomId, requestId, roundHistory });
  context.logger.completed({ ...trace, userId, roomId }, startedAt);

  context.publisher.playerJoined(ws, { requestId }).catch((publishErr) => {
    console.error('join notification publish failed', (publishErr as Error).message);
  });
}
