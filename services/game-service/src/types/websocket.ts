import type { GameSocket } from '@trying-sd/game-gdk';
import { ChessMovePayload } from '../features/chess/types';
import { SpinPayload } from '../features/slot/types';

export type { GameSocket };

export interface JoinPayload {
  action: 'join';
  requestId: string;
  roomId: string;
  token: string;
  userId?: string;
}

export interface EndRoundPayload {
  action: 'end_round';
  requestId: string;
}

export interface PersistentDataPayload {
  action: 'persistent_data';
  requestId: string;
  gameId: string;
  data: Record<string, unknown>;
}

export type IncomingMessagePayload =
  | JoinPayload
  | SpinPayload
  | EndRoundPayload
  | PersistentDataPayload
  | ChessMovePayload;

export type OutgoingPayload = Record<string, unknown>;
