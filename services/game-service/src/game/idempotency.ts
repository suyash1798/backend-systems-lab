import {
  EndRoundPayload,
  IncomingMessagePayload,
  GameSocket,
  JoinPayload,
  PersistentDataPayload,
  SpinPayload
} from '../types/websocket';

interface IdempotencyContext {
  activeRoundId?: (userId: string, roomId: string) => Promise<string | null> | string | null;
}

class Idempotency {
  public async key(
    ws: GameSocket,
    payload: IncomingMessagePayload,
    context: IdempotencyContext = {}
  ): Promise<string | null> {
    if (payload.action === 'join') {
      return this.joinKey(payload);
    }

    if (payload.action === 'spin') {
      return this.spinKey(ws, payload, context);
    }

    if (payload.action === 'end_round') {
      return this.endRoundKey(ws, payload);
    }

    if (payload.action === 'persistent_data') {
      return this.persistentDataKey(ws, payload);
    }

    return null;
  }

  private joinKey(payload: JoinPayload): string {
    if (!payload.userId) {
      return `join:unknown:${payload.roomId}:${payload.requestId}`;
    }

    return `join:${payload.userId}:${payload.roomId}:${payload.requestId}`;
  }

  private async spinKey(
    ws: GameSocket,
    payload: SpinPayload,
    context: IdempotencyContext
  ): Promise<string | null> {
    const { userId, roomId } = ws;

    if (!userId || !roomId) {
      return null;
    }

    const roundId = await context.activeRoundId?.(userId, roomId);

    if (!roundId) {
      return null;
    }

    return `spin:${roundId}:${payload.spinId}`;
  }

  private endRoundKey(ws: GameSocket, payload: EndRoundPayload): string | null {
    if (!payload.requestId || !ws.userId || !ws.roomId) {
      return null;
    }

    return `end-round:${ws.userId}:${ws.roomId}:${payload.requestId}`;
  }

  private persistentDataKey(ws: GameSocket, payload: PersistentDataPayload): string | null {
    if (!payload.requestId || !ws.userId || !payload.gameId) {
      return null;
    }

    return `persistent-data:${ws.userId}:${payload.gameId}:${payload.requestId}`;
  }
}

export default Idempotency;
