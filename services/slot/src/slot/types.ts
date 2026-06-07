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
