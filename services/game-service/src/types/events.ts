export interface PlayerEvent {
  type: 'player_joined' | 'player_action';
  userId: string;
  roomId: string;
  requestId?: string | null;
  sourceConnectionId: string;
  action?: string;
  balance?: number;
  serverId?: string;
  timestamp?: string;
}

export type EventHandler = (event: PlayerEvent) => void;

export interface PubSubTransport {
  connect(onMessage: EventHandler): Promise<void>;
  publish(payload: PlayerEvent): Promise<void>;
  close(): Promise<void>;
}
