import { IncomingMessagePayload, GameSocket } from '../../types/websocket';
import { ActionContext, remember, RequestTrace, send } from './types';

export async function joinAction(
  ws: GameSocket,
  payload: IncomingMessagePayload,
  context: ActionContext,
  trace: RequestTrace,
  startedAt: number
): Promise<void> {
  const { userId, roomId, requestId } = payload;

  if (!userId || !roomId) {
    context.logger.failed(trace, startedAt, 'userId and roomId required');
    send(ws, { status: 'error', error: 'userId and roomId required', requestId });
    return;
  }

  ws.userId = userId;
  ws.roomId = roomId;

  const response = { status: 'ok', action: 'joined', userId, roomId, requestId };
  remember(ws, requestId, response);
  send(ws, response);
  context.logger.completed({ ...trace, userId, roomId }, startedAt);

  await context.pubSub.publish({
    type: 'player_joined',
    userId,
    roomId,
    requestId,
    sourceConnectionId: ws.id,
    serverId: context.serverId,
    timestamp: new Date().toISOString()
  });
}
