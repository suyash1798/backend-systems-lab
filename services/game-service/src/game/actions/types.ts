import RedisPubSub from '../../infra/redisPubSub';
import RequestLogger from '../../observability/RequestLogger';
import { WalletAdjustResponse, WalletError } from '../../types/wallet';
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
  pubSub: RedisPubSub;
  serverId: string;
  logger: RequestLogger;
}

export function send(ws: GameSocket, payload: object): void {
  ws.send(JSON.stringify(payload));
}

export function remember(ws: GameSocket, requestId: string | null | undefined, response: object): void {
  if (requestId) {
    ws.processedRequests.set(requestId, response);
  }
}

export function walletErrorDetail(error: WalletError): object {
  return {
    status: error.status,
    url: error.url,
    detail: error.detail
  };
}
