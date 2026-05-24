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
  action: 'join' | 'play';
  userId?: string;
  roomId?: string;
  requestId?: string | null;
}

export type OutgoingPayload = Record<string, unknown>;
