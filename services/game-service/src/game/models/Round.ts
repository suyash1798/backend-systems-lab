export interface RoundAction {
  action: string;
  requestId: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
}

export interface ActiveRound {
  roundId: string;
  userId: string;
  roomId: string;
  status: 'ACTIVE';
  spinCount: number;
  lastSpinId: number;
  history: RoundAction[];
}
