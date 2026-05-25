import { WalletError } from '../../types/wallet';
import { IncomingMessagePayload, GameSocket } from '../../types/websocket';
import { ActionContext, remember, RequestTrace, send, walletErrorDetail } from './types';

const symbols = ['CHERRY', 'LEMON', 'BELL', 'SEVEN'];

export async function spinAction(
  ws: GameSocket,
  payload: IncomingMessagePayload,
  context: ActionContext,
  trace: RequestTrace,
  startedAt: number
): Promise<void> {
  const { requestId, roundId, betAmount } = payload;

  if (!requestId) {
    context.logger.failed(trace, startedAt, 'requestId required');
    send(ws, { status: 'error', error: 'requestId required' });
    return;
  }

  if (!ws.userId || !ws.roomId) {
    context.logger.failed(trace, startedAt, 'join required');
    send(ws, { status: 'error', error: 'join required', requestId });
    return;
  }

  if (!roundId || typeof betAmount !== 'number' || betAmount <= 0) {
    context.logger.failed(trace, startedAt, 'roundId and positive betAmount required');
    send(ws, { status: 'error', error: 'roundId and positive betAmount required', requestId });
    return;
  }

  ws.pendingRequests.add(requestId);

  try {
    const debit = await context.adjustWallet(ws.userId, -betAmount);
    const result = spin(betAmount);
    let balance = debit.balance;

    if (result.winAmount > 0) {
      const credit = await context.adjustWallet(ws.userId, result.winAmount);
      balance = credit.balance;
    }

    const response = {
      status: 'ok',
      action: 'spin',
      requestId,
      roundId,
      betAmount,
      symbols: result.symbols,
      winAmount: result.winAmount,
      balance
    };

    remember(ws, requestId, response);
    send(ws, response);
    context.logger.completed({ ...trace, roundId, betAmount }, startedAt);

    await context.pubSub.publish({
      type: 'player_action',
      action: 'spin',
      userId: ws.userId,
      roomId: ws.roomId,
      roundId,
      betAmount,
      winAmount: result.winAmount,
      symbols: result.symbols,
      balance,
      requestId,
      sourceConnectionId: ws.id,
      serverId: context.serverId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const walletErr = err as WalletError;
    context.logger.failed(trace, startedAt, walletErr.message, walletErrorDetail(walletErr));
    send(ws, {
      status: 'error',
      error: walletErr.message,
      detail: walletErr.detail || null,
      requestId
    });
  } finally {
    ws.pendingRequests.delete(requestId);
  }
}

function spin(betAmount: number): { symbols: string[]; winAmount: number } {
  const result = [randomSymbol(), randomSymbol(), randomSymbol()];

  return {
    symbols: result,
    winAmount: calculateWin(result, betAmount)
  };
}

function randomSymbol(): string {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function calculateWin(result: string[], betAmount: number): number {
  const uniqueSymbols = new Set(result).size;

  if (uniqueSymbols === 1) {
    return betAmount * 5;
  }

  if (uniqueSymbols === 2) {
    return betAmount * 2;
  }

  return 0;
}
