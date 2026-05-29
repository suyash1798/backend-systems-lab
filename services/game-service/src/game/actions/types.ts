import RequestLogger from '../../observability/RequestLogger';
import GameEventPublisher from '../GameEventPublisher';
import GameResponseSender from '../GameResponseSender';
import IdempotencyRepository from '../../repositories/IdempotencyRepository';
import RoomMembershipRepository from '../../repositories/RoomMembershipRepository';
import GamePlayerDataService from '../services/GamePlayerDataService';
import RoundService from '../services/RoundService';
import SpinService from '../services/SpinService';
import { WalletResponse } from '../../types/wallet';
import { GameSocket } from '../../types/websocket';

export type WalletDeductHandler = (request: {
  userId: string;
  amount: number;
  transactionId: string;
  gameId: string;
  referenceId?: string;
}) => Promise<WalletResponse>;

export type WalletCreditHandler = (request: {
  userId: string;
  amount: number;
  transactionId: string;
  referenceId?: string;
}) => Promise<WalletResponse>;

export type RequestTrace = Record<string, unknown> & {
  action: string;
  requestId?: string | null;
  connectionId: string;
  userId?: string | null;
  roomId?: string | null;
};

export interface ActionContext {
  gamePlayerDataService: GamePlayerDataService;
  publisher: GameEventPublisher;
  idempotencyRepository: IdempotencyRepository;
  roomMembershipRepository: RoomMembershipRepository;
  roundService: RoundService;
  spinService: SpinService;
  logger: RequestLogger;
  responder: GameResponseSender;
}

export async function remember(
  ws: GameSocket,
  key: string | null,
  response: object,
  store: IdempotencyRepository
): Promise<void> {
  if (key) {
    ws.processedRequests.set(key, response);
    await store.complete(key, response);
  }
}
