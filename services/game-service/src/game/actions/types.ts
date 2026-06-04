import RequestLogger from '../../observability/RequestLogger';
import GameEventPublisher from '../GameEventPublisher';
import GameResponseSender from '../GameResponseSender';
import IdempotencyRepository from '../../repositories/IdempotencyRepository';
import RoomMembershipRepository from '../../repositories/RoomMembershipRepository';
import GamePlayerDataService from '../services/GamePlayerDataService';
import RoundService from '../services/RoundService';
import { RoomStateProvider } from '../RoomStateProvider';
import { WalletCreditRequest, WalletDeductRequest, WalletResponse } from '../../types/wallet';

export type WalletDeductHandler = (request: WalletDeductRequest) => Promise<WalletResponse>;

export type WalletCreditHandler = (request: WalletCreditRequest) => Promise<WalletResponse>;

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
  roomStateProviders: RoomStateProvider[];
  logger: RequestLogger;
  responder: GameResponseSender;
}
