import { IncomingMessagePayload, GameSocket } from '../../types/websocket';
import { ActionContext, remember, RequestTrace } from './types';

export async function joinAction(
  ws: GameSocket,
  payload: IncomingMessagePayload,
  context: ActionContext,
  trace: RequestTrace,
  startedAt: number,
  idempotencyKey: string | null
): Promise<void> {
  const { userId, roomId, requestId } = payload;

  if (!userId || !roomId) {
    context.logger.failed(trace, startedAt, 'userId and roomId required');
    context.responder.error(ws, 'userId and roomId required', requestId);
    return;
  }

  ws.userId = userId;
  ws.roomId = roomId;

  if (idempotencyKey && !await context.idempotencyStore.reserve(idempotencyKey)) {
    context.logger.duplicatePending(trace, startedAt);
    context.responder.pending(ws, requestId);
    return;
  }

  const response = { status: 'ok', action: 'joined', userId, roomId, requestId };
  await remember(ws, idempotencyKey, response, context.idempotencyStore);
  context.responder.ok(ws, { action: 'joined', userId, roomId, requestId });
  context.logger.completed({ ...trace, userId, roomId }, startedAt);

  context.publisher.playerJoined(ws, { requestId }).catch((publishErr) => {
    console.error('join notification publish failed', (publishErr as Error).message);
  });
}
