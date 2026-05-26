import RequestLogger from '../../observability/RequestLogger';
import GameEventPublisher from '../GameEventPublisher';
import GameResponseSender from '../GameResponseSender';
import IdempotencyStore from '../IdempotencyStore';
import { WalletAdjustResponse } from '../../types/wallet';
import { GameSocket } from '../../types/websocket';

export type WalletAdjustHandler = (userId: string, amount: number) => Promise<WalletAdjustResponse>;

export type RequestTrace = Record<string, unknown> & {
  action: string;
  requestId?: string | null;
  connectionId: string;
  userId?: string | null;
  roomId?: string | null;
};

export interface ActionContext {
  adjustWallet: WalletAdjustHandler;
  publisher: GameEventPublisher;
  idempotencyStore: IdempotencyStore;
  logger: RequestLogger;
  responder: GameResponseSender;
}

export async function remember(
  ws: GameSocket,
  key: string | null,
  response: object,
  store: IdempotencyStore
): Promise<void> {
  if (key) {
    ws.processedRequests.set(key, response);
    await store.complete(key, response);
  }
}
