import { GameSocket, IncomingMessagePayload } from '../types';
import {
  DefaultGamePayload,
  EndRoundPayload,
  JoinPayload,
  PersistentDataPayload
} from './types';

class Idempotency {
  async key(ws: GameSocket, payload: IncomingMessagePayload): Promise<string | null> {
    const defaultPayload = payload as DefaultGamePayload;

    if (defaultPayload.action === 'join') {
      return this.joinKey(defaultPayload);
    }

    if (defaultPayload.action === 'end_round') {
      return this.endRoundKey(ws, defaultPayload);
    }

    if (defaultPayload.action === 'persistent_data') {
      return this.persistentDataKey(ws, defaultPayload);
    }

    return null;
  }

  private joinKey(payload: JoinPayload): string {
    return `join:${payload.userId || 'unknown'}:${payload.roomId}:${payload.requestId}`;
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
