import GameError from '../errors/GameError';
import { GameSocket } from '../types';

export interface JoinedPlayer {
  userId: string;
  roomId: string;
}

export function requireJoined(ws: GameSocket): JoinedPlayer {
  if (!ws.userId || !ws.roomId) {
    throw new GameError('join required', 400);
  }

  return {
    userId: ws.userId,
    roomId: ws.roomId
  };
}
