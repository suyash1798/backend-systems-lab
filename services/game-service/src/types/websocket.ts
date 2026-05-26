import { WebSocket } from 'ws';

export interface GameSocket extends WebSocket {
  id: string;
  isAlive: boolean;
  roomId: string | null;
  userId: string | null;
  processedRequests: Map<string, object>;
  pendingRequests: Set<string>;
}

export interface IncomingMessagePayload {
  action: GameAction;
  userId?: string;
  roomId?: string;
  spinId?: string;
  betAmount?: number;
  requestId?: string;
}

enum GameAction{
  JOIN = 'join',
  SPIN = 'spin'
}

export type OutgoingPayload = Record<string, unknown>;
