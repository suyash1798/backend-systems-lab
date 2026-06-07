import type {
  GameEventMessage,
  GameMessage,
  PlayerActionEvent
} from '@trying-sd/game-gdk';

export interface SpinPayload {
  action: 'spin';
  requestId: string;
  gameId: string;
  spinId: string;
  betAmount: number;
}

export interface SpinIntent {
  userId: string;
  roomId: string;
  roundId: string;
  gameId: string;
  requestId: string;
  spinId: string;
  betAmount: number;
}

export interface PendingSpin extends SpinIntent {
  id: bigint;
  created: boolean;
}

export interface CompletedSpin {
  userId: string;
  roomId: string;
  roundId: string;
  gameId: string;
  requestId: string;
  spinId: string;
  betAmount: number;
  winAmount: number;
  symbols: string[];
  balance: number;
}

export type IncomingMessagePayload = GameMessage<SpinPayload>;

export interface SlotSpinEvent extends PlayerActionEvent {
  action: 'spin';
  roundId: string;
  spinId: string;
  betAmount: number;
  winAmount: number;
  symbols: string[];
  balance: number;
}

export type SlotEvent = GameEventMessage<SlotSpinEvent>;
