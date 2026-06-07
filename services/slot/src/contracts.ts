import type {
  GameEventMessage,
  GameMessage,
  PlayerActionEvent
} from '@trying-sd/game-gdk';
import { SpinPayload } from './slot/types';

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
