export interface CompletedSpin {
  userId: string;
  roomId: string;
  requestId: string;
  spinId: string;
  betAmount: number;
  winAmount: number;
  symbols: string[];
  balance: number;
}
