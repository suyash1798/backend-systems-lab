import { WebSocket } from 'ws';

export interface GameSocket extends WebSocket {
  id: string;
  isAlive: boolean;
  roomId: string | null;
  userId: string | null;
}

export type IncomingMessagePayload = PingPayload | JoinPayload | PlayPayload;

export interface PingPayload {
  action: 'ping';
  requestId?: string | null;
}

export interface JoinPayload {
  action: 'join';
  userId: string;
  roomId: string;
  requestId?: string | null;
}

export interface PlayPayload {
  action: 'play';
  userId: string;
  roomId?: string;
  requestId?: string | null;
}

export type OutgoingPayload = Record<string, unknown>;

export type SendFn = (ws: GameSocket, payload: OutgoingPayload) => void;
