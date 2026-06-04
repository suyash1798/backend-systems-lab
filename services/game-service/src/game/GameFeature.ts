import { GameActionHandler } from './actions/GameActionHandler';
import { RoomStateProvider } from './RoomStateProvider';
import { GameSocket, IncomingMessagePayload } from '../types/websocket';

export interface GameFeature {
  handlers: Record<string, GameActionHandler<any>>;
  roomStateProviders?: RoomStateProvider[];
  idempotencyKey?: (
    ws: GameSocket,
    payload: IncomingMessagePayload
  ) => Promise<string | null | undefined> | string | null | undefined;
  hasConflict?: (payload: IncomingMessagePayload, response?: object) => boolean;
}
