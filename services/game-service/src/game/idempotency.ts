import { createHash } from 'crypto';
import { IncomingMessagePayload, GameSocket } from '../types/websocket';

class Idempotency {
  public key(ws: GameSocket, payload: IncomingMessagePayload): string | null {
    if (!payload.requestId) {
      return null;
    }

    const userId = ws.userId || payload.userId;

    if (!userId) {
      return payload.requestId;
    }

    return `${userId}-${this.payloadHash(payload)}-${payload.requestId}`;
  }

  private payloadHash(payload: IncomingMessagePayload): string {
    const businessPayload = {
      action: payload.action,
      roomId: payload.roomId,
      spinId: payload.spinId,
      betAmount: payload.betAmount
    };

    return createHash('sha256')
      .update(JSON.stringify(businessPayload))
      .digest('hex')
      .slice(0, 16);
  }
}

export default Idempotency;
