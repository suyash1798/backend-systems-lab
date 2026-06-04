import type EventPublisher from './EventPublisher';
import type ResponseSender from './ResponseSender';
import type { GameActionHandler } from './actions/GameActionHandler';
import type GamePlayerDataService from './services/GamePlayerDataService';
import type RoundService from './services/RoundService';
import type IdempotencyRepository from '../repositories/IdempotencyRepository';
import type RoomMembershipRepository from '../repositories/RoomMembershipRepository';
import type RequestLogger from '../observability/RequestLogger';
import type { WalletCreditRequest, WalletDeductRequest, WalletResponse } from '../types/wallet';
import type { GameSocket, IncomingMessagePayload } from '../types/websocket';

export type WalletDeductHandler = (request: WalletDeductRequest) => Promise<WalletResponse>;

export type WalletCreditHandler = (request: WalletCreditRequest) => Promise<WalletResponse>;

export type RequestTrace = Record<string, unknown> & {
  action: string;
  requestId?: string | null;
  connectionId: string;
  userId?: string | null;
  roomId?: string | null;
};

export interface RoomStateProvider {
  key: string;
  state(userId: string, roomId: string): Promise<unknown>;
}

export interface GameFeature {
  handlers: Record<string, GameActionHandler<any>>;
  roomStateProviders?: RoomStateProvider[];
  idempotencyKey?: (
    ws: GameSocket,
    payload: IncomingMessagePayload
  ) => Promise<string | null | undefined> | string | null | undefined;
  hasConflict?: (payload: IncomingMessagePayload, response?: object) => boolean;
}

export interface ActionContext {
  gamePlayerDataService: GamePlayerDataService;
  publisher: EventPublisher;
  idempotencyRepository: IdempotencyRepository;
  roomMembershipRepository: RoomMembershipRepository;
  roundService: RoundService;
  roomStateProviders: RoomStateProvider[];
  logger: RequestLogger;
  responder: ResponseSender;
}
