import {
  EndRoundPayload,
  IncomingMessagePayload,
  GameSocket,
  JoinPayload,
  PersistentDataPayload
} from '../types/websocket';

class Idempotency {
  public async key(
    ws: GameSocket,
    payload: IncomingMessagePayload
  ): Promise<string | null> {
    if (payload.action === 'join') {
      return this.joinKey(payload);
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
