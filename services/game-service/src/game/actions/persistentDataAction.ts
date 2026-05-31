import AppError from '../../errors/AppError';
import { GameSocket, PersistentDataPayload } from '../../types/websocket';
import { ActionContext, remember, RequestTrace } from './types';

export async function persistentDataAction(
  ws: GameSocket,
  payload: PersistentDataPayload,
  context: ActionContext,
  trace: RequestTrace,
  startedAt: number,
  idempotencyKey: string | null
): Promise<void> {
  const { requestId, gameId, data } = payload;

  if (!ws.userId) {
    context.logger.failed(trace, startedAt, 'join required');
    context.responder.error(ws, 'join required', requestId);
    return;
  }

  if (idempotencyKey && !await context.idempotencyRepository.reserve(idempotencyKey)) {
    context.logger.duplicatePending(trace, startedAt);
    context.responder.pending(ws, requestId);
    return;
  }

  try {
    const response = await context.gamePlayerDataService.save({
      userId: ws.userId,
      requestId,
      gameId,
      data
    });

    await remember(ws, idempotencyKey, response, context.idempotencyRepository);
    context.responder.ok(ws, response);
    context.logger.completed({ ...trace, gameId }, startedAt);

    if (ws.roomId) {
      await context.roundService.recordActionIfActive(ws.userId, ws.roomId, {
        action: 'persistent_data',
        requestId,
        payload: { gameId, data },
        result: { status: 'ok' }
      });
    }
  } catch (err) {
    if (idempotencyKey) {
      await context.idempotencyRepository.release(idempotencyKey);
    }

    const appErr = err instanceof AppError ? err : new AppError((err as Error).message);
    context.logger.failed(trace, startedAt, appErr.message, {
      status: appErr.status,
      source: appErr.source,
      detail: appErr.detail
    });
    context.responder.error(ws, appErr.message, requestId, appErr.detail);
  }
}
