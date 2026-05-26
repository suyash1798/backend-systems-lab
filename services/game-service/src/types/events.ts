export interface PlayerEvent {
  type: 'player_joined' | 'player_action';
  userId: string;
  roomId: string;
  requestId?: string | null;
  sourceConnectionId: string;
  action?: string;
  balance?: number;
  spinId?: string;
  betAmount?: number;
  winAmount?: number;
  symbols?: string[];
  serverId?: string;
  timestamp?: string;
}

export type EventHandler = (event: PlayerEvent) => void;
